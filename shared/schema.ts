import { z } from "zod";

// Market status enum
export const MarketStatus = {
  Open: "Open",
  Closed: "Closed",
  Resolved: "Resolved",
  Cancelled: "Cancelled",
} as const;

export type MarketStatusType = typeof MarketStatus[keyof typeof MarketStatus];

// Market result enum
export const MarketResult = {
  Unset: "Unset",
  Up: "Up",
  Down: "Down",
  Push: "Push",
} as const;

export type MarketResultType = typeof MarketResult[keyof typeof MarketResult];

// Bet side enum
export const BetSide = {
  Up: "Up",
  Down: "Down",
} as const;

export type BetSideType = typeof BetSide[keyof typeof BetSide];

// Config schema
export const configSchema = z.object({
  authority: z.string(),
  treasuryVault: z.string(),
  feeBps: z.number().default(100), // 1% = 100 bps
  minBetLamports: z.number().default(10_000_000), // 0.01 SOL
  maxStalenessSeconds: z.number().default(60),
  allowedFeedId: z.string(), // hex string
});

export type Config = z.infer<typeof configSchema>;

// Market schema
export const marketSchema = z.object({
  publicKey: z.string(),
  feedId: z.string(),
  startTs: z.number(),
  endTs: z.number(),
  startPrice: z.number(),
  startExpo: z.number(),
  endPrice: z.number().nullable(),
  endExpo: z.number().nullable(),
  totalUp: z.number(), // NET lamports
  totalDown: z.number(), // NET lamports
  status: z.enum(["Open", "Closed", "Resolved", "Cancelled"]),
  result: z.enum(["Unset", "Up", "Down", "Push"]),
  vaultBump: z.number(),
  bump: z.number(),
});

export type Market = z.infer<typeof marketSchema>;

// Position schema
export const positionSchema = z.object({
  publicKey: z.string(),
  user: z.string(),
  market: z.string(),
  upNet: z.number(), // NET lamports bet on UP
  downNet: z.number(), // NET lamports bet on DOWN
  claimed: z.boolean(),
  bump: z.number(),
});

export type Position = z.infer<typeof positionSchema>;

// Insert schemas for creating new entities
export const insertMarketSchema = marketSchema.omit({ 
  publicKey: true, 
  bump: true, 
  vaultBump: true,
  endPrice: true,
  endExpo: true,
  result: true,
}).extend({
  endPrice: z.number().nullable().default(null),
  endExpo: z.number().nullable().default(null),
  result: z.enum(["Unset", "Up", "Down", "Push"]).default("Unset"),
});

export type InsertMarket = z.infer<typeof insertMarketSchema>;

export const insertPositionSchema = positionSchema.omit({ 
  publicKey: true, 
  bump: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;

// Bet request schema
export const placeBetSchema = z.object({
  marketPubkey: z.string(),
  side: z.enum(["Up", "Down"]),
  grossLamports: z.number().min(10_000_000, "Minimum bet is 0.01 SOL"),
});

export type PlaceBetRequest = z.infer<typeof placeBetSchema>;

// Claim request schema
export const claimSchema = z.object({
  marketPubkey: z.string(),
});

export type ClaimRequest = z.infer<typeof claimSchema>;

// API response types
export interface MarketWithPosition extends Market {
  position?: Position;
  timeRemaining: number;
  poolTotal: number;
  upPercentage: number;
  downPercentage: number;
}

export interface DashboardStats {
  activeMarkets: number;
  totalVolume: number; // in lamports
  userActiveBets: number;
  claimableWinnings: number; // in lamports
}

// Price display helper
export function formatPrice(price: number, expo: number): string {
  const adjustedPrice = price * Math.pow(10, expo);
  return adjustedPrice.toFixed(Math.abs(expo));
}

// Lamports to SOL conversion
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

// Calculate fee
export function calculateFee(grossLamports: number, feeBps: number = 100): {
  fee: number;
  net: number;
} {
  const fee = Math.floor((grossLamports * feeBps) / 10_000);
  const net = grossLamports - fee;
  return { fee, net };
}

// Calculate potential payout
export function calculatePotentialPayout(
  betNet: number,
  totalSide: number,
  poolNet: number
): number {
  if (totalSide === 0) return 0;
  return Math.floor((poolNet * betNet) / totalSide);
}

// Legacy user types for compatibility
export const users = {
  id: "string",
  username: "string",
  password: "string",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
