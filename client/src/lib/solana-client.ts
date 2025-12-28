import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  type Market,
  type Position,
  type BetSideType,
  calculateFee,
  lamportsToSol,
} from "@shared/schema";
import {
  PROGRAM_ID,
  PYTH_RECEIVER_PROGRAM_ID,
  SOL_USD_FEED_ID,
  getConfigPda,
  getTreasuryVaultPda,
  getMarketPda,
  getMarketVaultPda,
  getPositionPda,
  feedIdToBuffer,
  type MarketAccount,
  type PositionAccount,
} from "@shared/anchor-idl";

export interface SolanaClientConfig {
  rpcUrl: string;
  programId: string;
  pythReceiverProgramId: string;
  solUsdFeedId: string;
}

const DEFAULT_CONFIG: SolanaClientConfig = {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "gNFRULGxFu27mYmbeZ6oeeZhYMhZkWivqD2eCvEDLqE",
  pythReceiverProgramId: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  solUsdFeedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

const IDL: any = {
  version: "0.1.0",
  name: "pm15",
  address: "gNFRULGxFu27mYmbeZ6oeeZhYMhZkWivqD2eCvEDLqE",
  metadata: { name: "pm15", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "placeBet",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "marketVault", isMut: true, isSigner: false },
        { name: "treasuryVault", isMut: true, isSigner: false },
        { name: "position", isMut: true, isSigner: false },
        { name: "user", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "side", type: { defined: "BetSide" } },
        { name: "grossLamports", type: "u64" },
      ],
    },
    {
      name: "claim",
      accounts: [
        { name: "market", isMut: false, isSigner: false },
        { name: "marketVault", isMut: true, isSigner: false },
        { name: "position", isMut: true, isSigner: false },
        { name: "user", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Market",
      type: {
        kind: "struct",
        fields: [
          { name: "feedId", type: { array: ["u8", 32] } },
          { name: "startTs", type: "i64" },
          { name: "endTs", type: "i64" },
          { name: "startPrice", type: "i64" },
          { name: "startExpo", type: "i32" },
          { name: "endPrice", type: "i64" },
          { name: "endExpo", type: "i32" },
          { name: "totalUp", type: "u64" },
          { name: "totalDown", type: "u64" },
          { name: "status", type: { defined: "MarketStatus" } },
          { name: "result", type: { defined: "MarketResult" } },
          { name: "vaultBump", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Position",
      type: {
        kind: "struct",
        fields: [
          { name: "user", type: "publicKey" },
          { name: "upNet", type: "u64" },
          { name: "downNet", type: "u64" },
          { name: "claimed", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "BetSide",
      type: {
        kind: "enum",
        variants: [{ name: "Up" }, { name: "Down" }],
      },
    },
    {
      name: "MarketStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Open" },
          { name: "Closed" },
          { name: "Resolved" },
          { name: "Cancelled" },
        ],
      },
    },
    {
      name: "MarketResult",
      type: {
        kind: "enum",
        variants: [
          { name: "Unset" },
          { name: "Up" },
          { name: "Down" },
          { name: "Push" },
        ],
      },
    },
  ],
};

export class SolanaClient {
  private config: SolanaClientConfig;
  private connection: Connection;
  private program: anchor.Program | null = null;

  constructor(config: Partial<SolanaClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connection = new Connection(this.config.rpcUrl, "confirmed");
  }

  getConnection(): Connection {
    return this.connection;
  }

  getConfigPdaAddress(): PublicKey {
    const [pda] = getConfigPda();
    return pda;
  }

  getTreasuryVaultPdaAddress(): PublicKey {
    const [pda] = getTreasuryVaultPda();
    return pda;
  }

  getMarketPdaAddress(startTs: number): PublicKey {
    const feedIdBuffer = feedIdToBuffer(this.config.solUsdFeedId);
    const [pda] = getMarketPda(feedIdBuffer, BigInt(startTs));
    return pda;
  }

  getMarketVaultPdaAddress(marketPubkey: PublicKey): PublicKey {
    const [pda] = getMarketVaultPda(marketPubkey);
    return pda;
  }

  getPositionPdaAddress(marketPubkey: PublicKey, userPubkey: PublicKey): PublicKey {
    const [pda] = getPositionPda(marketPubkey, userPubkey);
    return pda;
  }

  private getProgram(walletAdapter: any): anchor.Program {
    const provider = new anchor.AnchorProvider(
      this.connection,
      walletAdapter,
      { commitment: "confirmed" }
    );
    return new anchor.Program(
      IDL,
      provider
    );
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async placeBet(
    walletAdapter: any,
    marketPubkey: string,
    side: BetSideType,
    grossLamports: number
  ): Promise<{ signature: string; fee: number; net: number }> {
    const program = this.getProgram(walletAdapter);
    const userPubkey = walletAdapter.publicKey;
    
    if (!userPubkey) {
      throw new Error("Wallet not connected");
    }

    const { fee, net } = calculateFee(grossLamports, 100);
    
    const market = new PublicKey(marketPubkey);
    const position = this.getPositionPdaAddress(market, userPubkey);
    const marketVault = this.getMarketVaultPdaAddress(market);
    const treasuryVault = this.getTreasuryVaultPdaAddress();
    const config = this.getConfigPdaAddress();

    console.log("Placing bet:", {
      market: market.toString(),
      user: userPubkey.toString(),
      position: position.toString(),
      side,
      grossLamports,
      fee,
      net,
    });

    try {
      const betSide = side === "Up" ? { up: {} } : { down: {} };
      
      const signature = await program.methods
        .placeBet(betSide, new anchor.BN(grossLamports))
        .accounts({
          config,
          market,
          marketVault,
          treasuryVault,
          position,
          user: userPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Bet placed! TX:", signature);
      
      return {
        signature,
        fee,
        net,
      };
    } catch (error: any) {
      console.error("Failed to place bet:", error);
      throw new Error(`Failed to place bet: ${error.message}`);
    }
  }

  async claim(
    walletAdapter: any,
    marketPubkey: string
  ): Promise<{ signature: string; payout: number }> {
    const program = this.getProgram(walletAdapter);
    const userPubkey = walletAdapter.publicKey;
    
    if (!userPubkey) {
      throw new Error("Wallet not connected");
    }

    const market = new PublicKey(marketPubkey);
    const position = this.getPositionPdaAddress(market, userPubkey);
    const marketVault = this.getMarketVaultPdaAddress(market);

    console.log("Claiming:", {
      market: market.toString(),
      user: userPubkey.toString(),
      position: position.toString(),
    });

    try {
      const balanceBefore = await this.connection.getBalance(userPubkey);
      
      const signature = await program.methods
        .claim()
        .accounts({
          market,
          marketVault,
          position,
          user: userPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const balanceAfter = await this.connection.getBalance(userPubkey);
      const payout = balanceAfter - balanceBefore;

      console.log("Claim successful! TX:", signature, "Payout:", payout);
      
      return {
        signature,
        payout: payout > 0 ? payout : 0,
      };
    } catch (error: any) {
      console.error("Failed to claim:", error);
      throw new Error(`Failed to claim: ${error.message}`);
    }
  }

  async fetchMarketFromChain(marketPubkey: string): Promise<MarketAccount | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(marketPubkey));
      if (!accountInfo) {
        return null;
      }
      
      const dummyWallet = {
        publicKey: null,
        signTransaction: async () => { throw new Error("No wallet"); },
        signAllTransactions: async () => { throw new Error("No wallet"); },
      };
      const program = this.getProgram(dummyWallet);
      
      const marketAccount = await (program.account as any).market.fetch(new PublicKey(marketPubkey));
      return marketAccount as unknown as MarketAccount;
    } catch (error) {
      console.error("Failed to fetch market from chain:", error);
      return null;
    }
  }

  async fetchPositionFromChain(
    marketPubkey: string, 
    userPubkey: string
  ): Promise<PositionAccount | null> {
    try {
      const market = new PublicKey(marketPubkey);
      const user = new PublicKey(userPubkey);
      const positionPda = this.getPositionPdaAddress(market, user);
      
      const accountInfo = await this.connection.getAccountInfo(positionPda);
      if (!accountInfo) {
        return null;
      }
      
      const dummyWallet = {
        publicKey: null,
        signTransaction: async () => { throw new Error("No wallet"); },
        signAllTransactions: async () => { throw new Error("No wallet"); },
      };
      const program = this.getProgram(dummyWallet);
      
      const positionAccount = await (program.account as any).position.fetch(positionPda);
      return positionAccount as unknown as PositionAccount;
    } catch (error) {
      console.error("Failed to fetch position from chain:", error);
      return null;
    }
  }

  async getAllMarkets(): Promise<any[]> {
    try {
      const dummyWallet = {
        publicKey: null,
        signTransaction: async () => { throw new Error("No wallet"); },
        signAllTransactions: async () => { throw new Error("No wallet"); },
      };
      const program = this.getProgram(dummyWallet);
      
      const markets = await (program.account as any).market.all();
      return markets.map((m: any) => ({
        publicKey: m.publicKey.toBase58(),
        ...m.account,
        startTs: m.account.startTs.toNumber(),
        endTs: m.account.endTs.toNumber(),
        startPrice: m.account.startPrice.toNumber(),
        endPrice: m.account.endPrice?.toNumber() || null,
        totalUp: m.account.totalUp.toNumber(),
        totalDown: m.account.totalDown.toNumber(),
      }));
    } catch (error) {
      console.error("Failed to fetch markets from chain:", error);
      return [];
    }
  }
}

export const solanaClient = new SolanaClient();

export function formatSolPrice(price: number, expo: number): string {
  const adjustedPrice = price * Math.pow(10, expo);
  return `$${adjustedPrice.toFixed(Math.abs(expo) > 4 ? 2 : Math.abs(expo))}`;
}

export function formatSol(lamports: number): string {
  return `${lamportsToSol(lamports).toFixed(4)} SOL`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
