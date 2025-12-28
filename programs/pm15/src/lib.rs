use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

declare_id!("EEeQgeh56xge6y82xU9K8sb2PfPs9nXHh3fHrNEwdcrU");

pub const FEE_BPS: u16 = 100; // 1%
pub const MIN_BET_LAMPORTS: u64 = 10_000_000; // 0.01 SOL
pub const MARKET_DURATION_SECONDS: i64 = 900; // 15 minutes
pub const MAX_STALENESS_SECONDS: u32 = 60;

// SOL/USD Pyth feed ID on devnet
pub const SOL_USD_FEED_ID: [u8; 32] = [
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4, 0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc, 0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
];

#[program]
pub mod pm15 {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        min_bet_lamports: u64,
        max_staleness_seconds: u32,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury_vault = ctx.accounts.treasury_vault.key();
        config.fee_bps = fee_bps;
        config.min_bet_lamports = min_bet_lamports;
        config.max_staleness_seconds = max_staleness_seconds;
        config.allowed_feed_id = SOL_USD_FEED_ID;
        config.bump = ctx.bumps.config;
        
        msg!("Config initialized with fee_bps: {}, min_bet: {}", fee_bps, min_bet_lamports);
        Ok(())
    }

    pub fn create_market(ctx: Context<CreateMarket>, start_ts: i64) -> Result<()> {
        let config = &ctx.accounts.config;
        let price_update = &ctx.accounts.price_update;
        
        // Validate start_ts is in the future
        let clock = Clock::get()?;
        require!(start_ts > clock.unix_timestamp, PredictionError::InvalidStartTime);
        
        // Read price from Pyth oracle
        let price_data = price_update.get_price_no_older_than(
            &clock,
            config.max_staleness_seconds as u64,
            &config.allowed_feed_id,
        ).map_err(|_| PredictionError::StalePrice)?;
        
        let market = &mut ctx.accounts.market;
        market.feed_id = config.allowed_feed_id;
        market.start_ts = start_ts;
        market.end_ts = start_ts + MARKET_DURATION_SECONDS;
        market.start_price = price_data.price;
        market.start_expo = price_data.exponent;
        market.end_price = 0;
        market.end_expo = 0;
        market.total_up = 0;
        market.total_down = 0;
        market.status = MarketStatus::Open;
        market.result = MarketResult::Unset;
        market.vault_bump = ctx.bumps.market_vault;
        market.bump = ctx.bumps.market;
        
        msg!("Market created: start_ts={}, end_ts={}, start_price={}", 
             market.start_ts, market.end_ts, market.start_price);
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, side: BetSide, gross_lamports: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        
        // Validate market is open
        require!(market.status == MarketStatus::Open, PredictionError::MarketNotOpen);
        
        // Validate bet timing
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < market.end_ts, PredictionError::MarketEnded);
        
        // Validate minimum bet
        require!(gross_lamports >= config.min_bet_lamports, PredictionError::BetTooSmall);
        
        // Calculate fee and net
        let fee = (gross_lamports as u128 * config.fee_bps as u128 / 10_000) as u64;
        let net = gross_lamports - fee;
        
        // Transfer fee to treasury
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury_vault.to_account_info(),
                },
            ),
            fee,
        )?;
        
        // Transfer net to market vault
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.market_vault.to_account_info(),
                },
            ),
            net,
        )?;
        
        // Update position
        position.user = ctx.accounts.user.key();
        match side {
            BetSide::Up => {
                position.up_net = position.up_net.checked_add(net).ok_or(PredictionError::Overflow)?;
                market.total_up = market.total_up.checked_add(net).ok_or(PredictionError::Overflow)?;
            }
            BetSide::Down => {
                position.down_net = position.down_net.checked_add(net).ok_or(PredictionError::Overflow)?;
                market.total_down = market.total_down.checked_add(net).ok_or(PredictionError::Overflow)?;
            }
        }
        position.claimed = false;
        position.bump = ctx.bumps.position;
        
        msg!("Bet placed: side={:?}, gross={}, fee={}, net={}", side, gross_lamports, fee, net);
        Ok(())
    }

    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        // Validate market is open
        require!(market.status == MarketStatus::Open, PredictionError::MarketNotOpen);
        
        // Validate market has ended
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= market.end_ts, PredictionError::MarketNotEnded);
        
        market.status = MarketStatus::Closed;
        
        msg!("Market closed at timestamp: {}", clock.unix_timestamp);
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>) -> Result<()> {
        let config = &ctx.accounts.config;
        let market = &mut ctx.accounts.market;
        let price_update = &ctx.accounts.price_update;
        
        // Validate market is closed
        require!(market.status == MarketStatus::Closed, PredictionError::MarketNotClosed);
        
        // Read end price from Pyth oracle
        let clock = Clock::get()?;
        let price_data = price_update.get_price_no_older_than(
            &clock,
            config.max_staleness_seconds as u64,
            &config.allowed_feed_id,
        ).map_err(|_| PredictionError::StalePrice)?;
        
        market.end_price = price_data.price;
        market.end_expo = price_data.exponent;
        
        // Handle edge case: one side has zero bets
        if market.total_up == 0 || market.total_down == 0 {
            // If only one side bet, cancel market and allow refunds
            market.status = MarketStatus::Cancelled;
            market.result = MarketResult::Unset;
            msg!("Market cancelled: one side has zero bets");
            return Ok(());
        }
        
        // Normalize prices for comparison (both should have same expo from same feed)
        let start_value = market.start_price;
        let end_value = market.end_price;
        
        // Determine result
        if end_value > start_value {
            market.result = MarketResult::Up;
        } else if end_value < start_value {
            market.result = MarketResult::Down;
        } else {
            market.result = MarketResult::Push;
        }
        
        market.status = MarketStatus::Resolved;
        
        msg!("Market resolved: start_price={}, end_price={}, result={:?}", 
             market.start_price, market.end_price, market.result);
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        
        // Validate market is resolved or cancelled
        require!(
            market.status == MarketStatus::Resolved || market.status == MarketStatus::Cancelled,
            PredictionError::MarketNotResolved
        );
        
        // Validate not already claimed
        require!(!position.claimed, PredictionError::AlreadyClaimed);
        
        // Calculate payout
        let pool_net = market.total_up.checked_add(market.total_down).ok_or(PredictionError::Overflow)?;
        let payout: u64;
        
        if market.status == MarketStatus::Cancelled || market.result == MarketResult::Push {
            // Refund net bets
            payout = position.up_net.checked_add(position.down_net).ok_or(PredictionError::Overflow)?;
        } else if market.result == MarketResult::Up {
            if position.up_net == 0 {
                return Err(PredictionError::NoWinnings.into());
            }
            // Pari-mutuel: payout = floor(pool_net * user_bet / winning_side_total)
            let payout_u128 = (pool_net as u128)
                .checked_mul(position.up_net as u128)
                .ok_or(PredictionError::Overflow)?
                .checked_div(market.total_up as u128)
                .ok_or(PredictionError::Overflow)?;
            payout = payout_u128 as u64;
        } else if market.result == MarketResult::Down {
            if position.down_net == 0 {
                return Err(PredictionError::NoWinnings.into());
            }
            let payout_u128 = (pool_net as u128)
                .checked_mul(position.down_net as u128)
                .ok_or(PredictionError::Overflow)?
                .checked_div(market.total_down as u128)
                .ok_or(PredictionError::Overflow)?;
            payout = payout_u128 as u64;
        } else {
            return Err(PredictionError::NoWinnings.into());
        }
        
        require!(payout > 0, PredictionError::NoWinnings);
        
        // Transfer payout from market vault to user using invoke_signed
        let market_key = ctx.accounts.market.key();
        let vault_bump = market.vault_bump;
        let seeds: &[&[u8]] = &[
            b"market_vault",
            market_key.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[seeds];
        
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.market_vault.key(),
                &ctx.accounts.user.key(),
                payout,
            ),
            &[
                ctx.accounts.market_vault.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
        
        position.claimed = true;
        
        msg!("Claimed payout: {} lamports", payout);
        Ok(())
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        
        // Validate authority
        require!(ctx.accounts.authority.key() == config.authority, PredictionError::Unauthorized);
        
        // Transfer from treasury vault to destination using invoke_signed
        let treasury_bump = ctx.bumps.treasury_vault;
        let seeds: &[&[u8]] = &[
            b"treasury_vault",
            &[treasury_bump],
        ];
        let signer_seeds = &[seeds];
        
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.treasury_vault.key(),
                &ctx.accounts.destination.key(),
                amount,
            ),
            &[
                ctx.accounts.treasury_vault.to_account_info(),
                ctx.accounts.destination.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
        
        msg!("Withdrawn {} lamports from treasury", amount);
        Ok(())
    }
}

// ============ Accounts ============

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    /// CHECK: PDA for treasury, holds lamports only
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [b"treasury_vault"],
        bump
    )]
    pub treasury_vault: SystemAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(start_ts: i64)]
pub struct CreateMarket<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", config.allowed_feed_id.as_ref(), &start_ts.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    /// CHECK: PDA for market vault, holds lamports only
    #[account(
        init,
        payer = payer,
        space = 0,
        seeds = [b"market_vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: SystemAccount<'info>,
    
    pub price_update: Account<'info, PriceUpdateV2>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    /// CHECK: PDA for market vault
    #[account(
        mut,
        seeds = [b"market_vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    pub market_vault: SystemAccount<'info>,
    
    /// CHECK: PDA for treasury
    #[account(
        mut,
        seeds = [b"treasury_vault"],
        bump
    )]
    pub treasury_vault: SystemAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    pub price_update: Account<'info, PriceUpdateV2>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    /// CHECK: PDA for market vault
    #[account(
        mut,
        seeds = [b"market_vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    pub market_vault: SystemAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    /// CHECK: PDA for treasury
    #[account(
        mut,
        seeds = [b"treasury_vault"],
        bump
    )]
    pub treasury_vault: SystemAccount<'info>,
    
    /// CHECK: Destination for fees
    #[account(mut)]
    pub destination: SystemAccount<'info>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// ============ State ============

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub treasury_vault: Pubkey,
    pub fee_bps: u16,
    pub min_bet_lamports: u64,
    pub max_staleness_seconds: u32,
    pub allowed_feed_id: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub feed_id: [u8; 32],
    pub start_ts: i64,
    pub end_ts: i64,
    pub start_price: i64,
    pub start_expo: i32,
    pub end_price: i64,
    pub end_expo: i32,
    pub total_up: u64,
    pub total_down: u64,
    pub status: MarketStatus,
    pub result: MarketResult,
    pub vault_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub user: Pubkey,
    pub up_net: u64,
    pub down_net: u64,
    pub claimed: bool,
    pub bump: u8,
}

// ============ Enums ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MarketStatus {
    Open,
    Closed,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MarketResult {
    Unset,
    Up,
    Down,
    Push,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BetSide {
    Up,
    Down,
}

// ============ Errors ============

#[error_code]
pub enum PredictionError {
    #[msg("Market is not open for betting")]
    MarketNotOpen,
    #[msg("Market has not ended yet")]
    MarketNotEnded,
    #[msg("Market is not closed")]
    MarketNotClosed,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Market has already ended")]
    MarketEnded,
    #[msg("Invalid start time")]
    InvalidStartTime,
    #[msg("Bet amount is too small")]
    BetTooSmall,
    #[msg("Price data is stale")]
    StalePrice,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No winnings to claim")]
    NoWinnings,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}
