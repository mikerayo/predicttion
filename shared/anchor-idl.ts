import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("GEqMQayWYNssnTKPVus8u3yuCFt2xqqfzSyqijqRuiko");
export const PYTH_RECEIVER_PROGRAM_ID = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
export const SOL_USD_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

export const FEE_BPS = 100;
export const MIN_BET_LAMPORTS = 10_000_000;
export const MARKET_DURATION_SECONDS = 900;

export type MarketStatus = "Open" | "Closed" | "Resolved" | "Cancelled";
export type MarketResult = "Unset" | "Up" | "Down" | "Push";
export type BetSide = "Up" | "Down";

export interface ConfigAccount {
  authority: PublicKey;
  treasuryVault: PublicKey;
  feeBps: number;
  minBetLamports: bigint;
  maxStalenessSeconds: number;
  allowedFeedId: number[];
  bump: number;
}

export interface MarketAccount {
  feedId: number[];
  startTs: bigint;
  endTs: bigint;
  startPrice: bigint;
  startExpo: number;
  endPrice: bigint | null;
  endExpo: number | null;
  totalUp: bigint;
  totalDown: bigint;
  status: MarketStatus;
  result: MarketResult;
  vaultBump: number;
  bump: number;
}

export interface PositionAccount {
  market: PublicKey;
  user: PublicKey;
  upAmount: bigint;
  downAmount: bigint;
  claimed: boolean;
  bump: number;
}

export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

export function getTreasuryVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_vault")],
    PROGRAM_ID
  );
}

export function getMarketPda(feedId: Buffer, startTs: bigint): [PublicKey, number] {
  const startTsBuffer = Buffer.alloc(8);
  startTsBuffer.writeBigInt64LE(startTs);
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), feedId, startTsBuffer],
    PROGRAM_ID
  );
}

export function getMarketVaultPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market_vault"), market.toBuffer()],
    PROGRAM_ID
  );
}

export function getPositionPda(market: PublicKey, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), user.toBuffer()],
    PROGRAM_ID
  );
}

export function feedIdToBuffer(feedId: string): Buffer {
  const hex = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  return Buffer.from(hex, "hex");
}

export function bufferToFeedId(buffer: Buffer | number[]): string {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return "0x" + buf.toString("hex");
}
