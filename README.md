# SOL15 Prediction Markets

15-minute prediction markets for SOL/USD price movements on Solana Devnet.

## Overview

SOL15 is a decentralized prediction market platform where users can bet on whether SOL/USD price will go UP or DOWN within 15-minute windows. The platform uses Pyth Oracle for real-time price feeds.

### Key Features

- **15-minute markets**: Each market runs for exactly 15 minutes
- **Binary outcomes**: Bet UP (price increases) or DOWN (price decreases)
- **Pari-mutuel payouts**: Winners share the entire pool proportionally
- **1% fee**: Charged upfront when placing bets
- **Permissionless**: Anyone can close/resolve markets
- **Pyth Oracle**: Uses Pyth Pull Oracle for SOL/USD prices

## Project Structure

```
sol15-prediction-markets/
├── anchor/                 # Anchor configuration
│   └── Anchor.toml
├── programs/pm15/          # Solana/Anchor program (Rust)
│   ├── Cargo.toml
│   └── src/lib.rs
├── keeper/                 # Keeper service (TypeScript)
│   ├── index.ts
│   └── package.json
├── client/                 # Frontend (React + Vite)
│   └── src/
├── server/                 # Backend API (Express)
│   └── routes.ts
└── shared/                 # Shared types
    └── schema.ts
```

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (for Anchor program)
- Solana CLI
- Anchor CLI

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Anchor dependencies (if building the program)
cd programs/pm15
cargo build-bpf
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at http://localhost:5000

### 4. Run Keeper (Optional)

```bash
cd keeper
npm install
npm run loop
```

## Anchor Program

### Build

```bash
anchor build
```

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_config` | Initialize global config with fee and oracle settings |
| `create_market` | Create a new 15-minute market |
| `place_bet` | Place a bet (UP or DOWN) |
| `close_market` | Close market after end time |
| `resolve_market` | Resolve market with end price from Pyth |
| `claim` | Claim winnings |
| `withdraw_fees` | Admin: withdraw treasury fees |

### Account PDAs

| Account | Seeds |
|---------|-------|
| Config | `["config"]` |
| Treasury Vault | `["treasury_vault"]` |
| Market | `["market", feed_id, start_ts]` |
| Market Vault | `["market_vault", market_pubkey]` |
| Position | `["position", market_pubkey, user_pubkey]` |

## Market Rules

1. **Duration**: 15 minutes (900 seconds)
2. **Minimum Bet**: 0.01 SOL (10,000,000 lamports)
3. **Fee**: 1% charged upfront (goes to treasury)
4. **Outcomes**:
   - **UP wins**: end_price > start_price
   - **DOWN wins**: end_price < start_price
   - **Push**: end_price == start_price (net bets refunded)
5. **Cancellation**: If one side has zero bets, market is cancelled

## Pyth Oracle

The platform uses Pyth Pull Oracle on Solana Devnet:

- **Receiver Program**: `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`
- **SOL/USD Feed ID**: `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`
- **Max Staleness**: 60 seconds

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/markets` | List all markets |
| GET | `/api/markets/:id` | Get market details |
| GET | `/api/stats` | Get dashboard statistics |
| POST | `/api/bets` | Place a bet |
| POST | `/api/claim` | Claim winnings |
| POST | `/api/markets` | Create new market |

## Development Mode

The application runs with mock data in development mode. The frontend simulates wallet connection and betting without requiring actual Solana transactions.

To test with real devnet:

1. Deploy the Anchor program
2. Update `PROGRAM_ID` in `.env`
3. Run the keeper service
4. Connect a Solana wallet (Phantom, etc.)

## Testing

```bash
# Run Anchor tests
anchor test

# Run frontend in dev mode
npm run dev
```

## Security Considerations

- **Staleness check**: Prices must be no older than 60 seconds
- **Feed validation**: Only SOL/USD feed is allowed
- **Double-claim prevention**: Positions marked as claimed
- **Overflow protection**: Uses u128 for calculations
- **Permissionless resolution**: Anyone can close/resolve markets

## License

MIT
