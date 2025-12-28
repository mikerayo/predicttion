import {
  type Market,
  type Position,
  type BetSideType,
  calculateFee,
  lamportsToSol,
} from "@shared/schema";

export interface SolanaClientConfig {
  rpcUrl: string;
  programId: string;
  pythReceiverProgramId: string;
  solUsdFeedId: string;
}

const DEFAULT_CONFIG: SolanaClientConfig = {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "PM15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  pythReceiverProgramId: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  solUsdFeedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
};

export class SolanaClient {
  private config: SolanaClientConfig;
  private walletPublicKey: string | null = null;

  constructor(config: Partial<SolanaClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<string> {
    if (typeof window !== "undefined" && (window as any).solana) {
      try {
        const solana = (window as any).solana;
        const response = await solana.connect();
        this.walletPublicKey = response.publicKey.toString();
        return this.walletPublicKey;
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        throw new Error("Failed to connect wallet");
      }
    }
    throw new Error("Solana wallet not found");
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

  getConfigPda(): string {
    return "ConfigPDA";
  }

  getTreasuryVaultPda(): string {
    return "TreasuryVaultPDA";
  }

  getMarketPda(feedId: string, startTs: number): string {
    return `MarketPDA_${feedId.slice(0, 8)}_${startTs}`;
  }

  getMarketVaultPda(marketPubkey: string): string {
    return `MarketVaultPDA_${marketPubkey}`;
  }

  getPositionPda(marketPubkey: string, userPubkey: string): string {
    return `PositionPDA_${marketPubkey}_${userPubkey.slice(0, 8)}`;
  }

  async initializeConfig(
    feeBps: number = 100,
    minBetLamports: number = 10_000_000,
    maxStalenessSeconds: number = 60
  ): Promise<string> {
    console.log("Initialize config:", { feeBps, minBetLamports, maxStalenessSeconds });
    return "tx_signature_initialize_config";
  }

  async createMarket(startTs: number): Promise<{ signature: string; marketPubkey: string }> {
    console.log("Create market:", { startTs });
    const marketPubkey = this.getMarketPda(this.config.solUsdFeedId, startTs);
    return {
      signature: "tx_signature_create_market",
      marketPubkey,
    };
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
    console.log("Place bet:", { marketPubkey, side, grossLamports, fee, net });

    return {
      signature: "tx_signature_place_bet",
      fee,
      net,
    };
  }

  async closeMarket(marketPubkey: string): Promise<string> {
    console.log("Close market:", { marketPubkey });
    return "tx_signature_close_market";
  }

  async resolveMarket(marketPubkey: string): Promise<string> {
    console.log("Resolve market:", { marketPubkey });
    return "tx_signature_resolve_market";
  }

  async claim(marketPubkey: string): Promise<{ signature: string; payout: number }> {
    if (!this.walletPublicKey) {
      throw new Error("Wallet not connected");
    }

    console.log("Claim:", { marketPubkey });
    return {
      signature: "tx_signature_claim",
      payout: 0,
    };
  }

  async withdrawFees(amount: number, destination: string): Promise<string> {
    console.log("Withdraw fees:", { amount, destination });
    return "tx_signature_withdraw_fees";
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
}

export const solanaClient = new SolanaClient();

export function formatSolPrice(price: number, expo: number): string {
  const adjustedPrice = price * Math.pow(10, expo);
  return `$${adjustedPrice.toFixed(Math.abs(expo))}`;
}

export function formatSol(lamports: number): string {
  return `${lamportsToSol(lamports).toFixed(4)} SOL`;
}
