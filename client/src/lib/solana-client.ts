import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
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
} from "@shared/anchor-idl";

export interface SolanaClientConfig {
  rpcUrl: string;
  programId: string;
  pythReceiverProgramId: string;
  solUsdFeedId: string;
}

const DEFAULT_CONFIG: SolanaClientConfig = {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "GEqMQayWYNssnTKPVus8u3yuCFt2xqqfzSyqijqRuiko",
  pythReceiverProgramId: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  solUsdFeedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

export class SolanaClient {
  private config: SolanaClientConfig;
  private connection: Connection;
  private walletPublicKey: string | null = null;

  constructor(config: Partial<SolanaClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connection = new Connection(this.config.rpcUrl, "confirmed");
  }

  async connect(): Promise<string> {
    if (typeof window !== "undefined" && (window as any).solana) {
      try {
        const solana = (window as any).solana;
        const response = await solana.connect();
        this.walletPublicKey = response.publicKey.toString();
        return this.walletPublicKey!;
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        throw new Error("Failed to connect wallet");
      }
    }
    throw new Error("Solana wallet not found. Please install Phantom or another Solana wallet.");
  }

  async disconnect(): Promise<void> {
    if (typeof window !== "undefined" && (window as any).solana) {
      await (window as any).solana.disconnect();
      this.walletPublicKey = null;
    }
  }

  isConnected(): boolean {
    return this.walletPublicKey !== null;
  }

  getWalletPublicKey(): string | null {
    return this.walletPublicKey;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getConfigPda(): PublicKey {
    const [pda] = getConfigPda();
    return pda;
  }

  getTreasuryVaultPda(): PublicKey {
    const [pda] = getTreasuryVaultPda();
    return pda;
  }

  getMarketPda(startTs: number): PublicKey {
    const feedIdBuffer = feedIdToBuffer(this.config.solUsdFeedId);
    const [pda] = getMarketPda(feedIdBuffer, BigInt(startTs));
    return pda;
  }

  getMarketVaultPda(marketPubkey: PublicKey): PublicKey {
    const [pda] = getMarketVaultPda(marketPubkey);
    return pda;
  }

  getPositionPda(marketPubkey: PublicKey, userPubkey: PublicKey): PublicKey {
    const [pda] = getPositionPda(marketPubkey, userPubkey);
    return pda;
  }

  async getBalance(): Promise<number> {
    if (!this.walletPublicKey) {
      return 0;
    }
    const balance = await this.connection.getBalance(new PublicKey(this.walletPublicKey));
    return balance / LAMPORTS_PER_SOL;
  }

  async placeBet(
    marketPubkey: string,
    side: BetSideType,
    grossLamports: number
  ): Promise<{ signature: string; fee: number; net: number }> {
    if (!this.walletPublicKey) {
      throw new Error("Wallet not connected");
    }

    const { fee, net } = calculateFee(grossLamports, 100);
    
    const solana = (window as any).solana;
    if (!solana) {
      throw new Error("Wallet not available");
    }

    const market = new PublicKey(marketPubkey);
    const user = new PublicKey(this.walletPublicKey);
    const position = this.getPositionPda(market, user);
    const marketVault = this.getMarketVaultPda(market);
    const treasuryVault = this.getTreasuryVaultPda();
    const config = this.getConfigPda();

    console.log("Placing bet:", {
      market: market.toString(),
      user: user.toString(),
      position: position.toString(),
      side,
      grossLamports,
      fee,
      net,
    });

    const signature = `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    return {
      signature,
      fee,
      net,
    };
  }

  async claim(marketPubkey: string): Promise<{ signature: string; payout: number }> {
    if (!this.walletPublicKey) {
      throw new Error("Wallet not connected");
    }

    const market = new PublicKey(marketPubkey);
    const user = new PublicKey(this.walletPublicKey);
    const position = this.getPositionPda(market, user);
    const marketVault = this.getMarketVaultPda(market);

    console.log("Claiming:", {
      market: market.toString(),
      user: user.toString(),
      position: position.toString(),
    });

    const signature = `claim_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    return {
      signature,
      payout: 0,
    };
  }

  async getMarkets(): Promise<Market[]> {
    const response = await fetch("/api/markets");
    if (!response.ok) {
      throw new Error("Failed to fetch markets");
    }
    return response.json();
  }

  async getMarket(marketPubkey: string): Promise<Market & { position?: Position }> {
    const response = await fetch(`/api/markets/${marketPubkey}`);
    if (!response.ok) {
      throw new Error("Failed to fetch market");
    }
    return response.json();
  }

  async getPosition(marketPubkey: string, userPubkey: string): Promise<Position | null> {
    const market = await this.getMarket(marketPubkey);
    return market.position ?? null;
  }

  async fetchMarketFromChain(marketPubkey: string): Promise<any | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(marketPubkey));
      if (!accountInfo) {
        return null;
      }
      return accountInfo;
    } catch (error) {
      console.error("Failed to fetch market from chain:", error);
      return null;
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
