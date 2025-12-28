import {
  type Market,
  type InsertMarket,
  type Position,
  type InsertPosition,
  type DashboardStats,
  type MarketStatusType,
  type MarketResultType,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getMarkets(): Promise<Market[]>;
  getMarket(publicKey: string): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  updateMarket(publicKey: string, updates: Partial<Market>): Promise<Market | undefined>;
  
  getPosition(marketPubkey: string, userPubkey: string): Promise<Position | undefined>;
  getPositions(userPubkey: string): Promise<Position[]>;
  createOrUpdatePosition(position: InsertPosition): Promise<Position>;
  
  getStats(userPubkey?: string): Promise<DashboardStats>;
  
  placeBet(
    marketPubkey: string,
    userPubkey: string,
    side: "Up" | "Down",
    netLamports: number
  ): Promise<{ market: Market; position: Position }>;
  
  claim(marketPubkey: string, userPubkey: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private markets: Map<string, Market>;
  private positions: Map<string, Position>;

  constructor() {
    this.markets = new Map();
    this.positions = new Map();
    this.initializeMockMarkets();
  }

  private initializeMockMarkets() {
    const now = Math.floor(Date.now() / 1000);
    const alignedStart = Math.floor(now / 900) * 900;

    const mockMarkets: Market[] = [
      {
        publicKey: "market_" + randomUUID().slice(0, 8),
        feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        startTs: alignedStart,
        endTs: alignedStart + 900,
        startPrice: 12433864799,
        startExpo: -8,
        endPrice: null,
        endExpo: null,
        totalUp: 250_000_000,
        totalDown: 180_000_000,
        status: "Open" as MarketStatusType,
        result: "Unset" as MarketResultType,
        vaultBump: 255,
        bump: 254,
      },
      {
        publicKey: "market_" + randomUUID().slice(0, 8),
        feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        startTs: alignedStart - 900,
        endTs: alignedStart,
        startPrice: 12398500000,
        startExpo: -8,
        endPrice: 12433864799,
        endExpo: -8,
        totalUp: 520_000_000,
        totalDown: 340_000_000,
        status: "Resolved" as MarketStatusType,
        result: "Up" as MarketResultType,
        vaultBump: 255,
        bump: 253,
      },
      {
        publicKey: "market_" + randomUUID().slice(0, 8),
        feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        startTs: alignedStart - 1800,
        endTs: alignedStart - 900,
        startPrice: 12450000000,
        startExpo: -8,
        endPrice: 12398500000,
        endExpo: -8,
        totalUp: 180_000_000,
        totalDown: 420_000_000,
        status: "Resolved" as MarketStatusType,
        result: "Down" as MarketResultType,
        vaultBump: 255,
        bump: 252,
      },
    ];

    mockMarkets.forEach((market) => {
      this.markets.set(market.publicKey, market);
    });
  }

  async getMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values()).sort((a, b) => b.startTs - a.startTs);
  }

  async getMarket(publicKey: string): Promise<Market | undefined> {
    return this.markets.get(publicKey);
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const publicKey = "market_" + randomUUID().slice(0, 8);
    const market: Market = {
      ...insertMarket,
      publicKey,
      endPrice: insertMarket.endPrice ?? null,
      endExpo: insertMarket.endExpo ?? null,
      result: insertMarket.result ?? "Unset",
      vaultBump: 255,
      bump: 254,
    };
    this.markets.set(publicKey, market);
    return market;
  }

  async updateMarket(publicKey: string, updates: Partial<Market>): Promise<Market | undefined> {
    const market = this.markets.get(publicKey);
    if (!market) return undefined;
    
    const updated = { ...market, ...updates };
    this.markets.set(publicKey, updated);
    return updated;
  }

  private positionKey(marketPubkey: string, userPubkey: string): string {
    return `${marketPubkey}:${userPubkey}`;
  }

  async getPosition(marketPubkey: string, userPubkey: string): Promise<Position | undefined> {
    return this.positions.get(this.positionKey(marketPubkey, userPubkey));
  }

  async getPositions(userPubkey: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter((p) => p.user === userPubkey);
  }

  async createOrUpdatePosition(insertPosition: InsertPosition): Promise<Position> {
    const key = this.positionKey(insertPosition.market, insertPosition.user);
    const existing = this.positions.get(key);
    
    const position: Position = {
      publicKey: existing?.publicKey || "position_" + randomUUID().slice(0, 8),
      user: insertPosition.user,
      market: insertPosition.market,
      upNet: (existing?.upNet || 0) + insertPosition.upNet,
      downNet: (existing?.downNet || 0) + insertPosition.downNet,
      claimed: insertPosition.claimed,
      bump: existing?.bump || 254,
    };
    
    this.positions.set(key, position);
    return position;
  }

  async getStats(userPubkey?: string): Promise<DashboardStats> {
    const markets = Array.from(this.markets.values());
    const activeMarkets = markets.filter((m) => m.status === "Open").length;
    const totalVolume = markets.reduce((sum, m) => sum + m.totalUp + m.totalDown, 0);
    
    let userActiveBets = 0;
    let claimableWinnings = 0;
    
    if (userPubkey) {
      const positions = await this.getPositions(userPubkey);
      
      for (const pos of positions) {
        const market = await this.getMarket(pos.market);
        if (!market) continue;
        
        if (market.status === "Open") {
          userActiveBets++;
        }
        
        if (market.status === "Resolved" && !pos.claimed) {
          const poolTotal = market.totalUp + market.totalDown;
          
          if (market.result === "Up" && pos.upNet > 0) {
            claimableWinnings += Math.floor((poolTotal * pos.upNet) / market.totalUp);
          } else if (market.result === "Down" && pos.downNet > 0) {
            claimableWinnings += Math.floor((poolTotal * pos.downNet) / market.totalDown);
          } else if (market.result === "Push") {
            claimableWinnings += pos.upNet + pos.downNet;
          }
        }
      }
    }
    
    return {
      activeMarkets,
      totalVolume,
      userActiveBets,
      claimableWinnings,
    };
  }

  async placeBet(
    marketPubkey: string,
    userPubkey: string,
    side: "Up" | "Down",
    netLamports: number
  ): Promise<{ market: Market; position: Position }> {
    const market = await this.getMarket(marketPubkey);
    if (!market) {
      throw new Error("Market not found");
    }
    
    if (market.status !== "Open") {
      throw new Error("Market is not open for betting");
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (now >= market.endTs) {
      throw new Error("Market has ended");
    }
    
    const updates: Partial<Market> = side === "Up"
      ? { totalUp: market.totalUp + netLamports }
      : { totalDown: market.totalDown + netLamports };
    
    const updatedMarket = await this.updateMarket(marketPubkey, updates);
    if (!updatedMarket) {
      throw new Error("Failed to update market");
    }
    
    const positionUpdate: InsertPosition = {
      user: userPubkey,
      market: marketPubkey,
      upNet: side === "Up" ? netLamports : 0,
      downNet: side === "Down" ? netLamports : 0,
      claimed: false,
    };
    
    const position = await this.createOrUpdatePosition(positionUpdate);
    
    return { market: updatedMarket, position };
  }

  async claim(marketPubkey: string, userPubkey: string): Promise<number> {
    const market = await this.getMarket(marketPubkey);
    if (!market) {
      throw new Error("Market not found");
    }
    
    if (market.status !== "Resolved" && market.status !== "Cancelled") {
      throw new Error("Market is not resolved yet");
    }
    
    const position = await this.getPosition(marketPubkey, userPubkey);
    if (!position) {
      throw new Error("No position found");
    }
    
    if (position.claimed) {
      throw new Error("Already claimed");
    }
    
    const poolTotal = market.totalUp + market.totalDown;
    let payout = 0;
    
    if (market.status === "Cancelled" || market.result === "Push") {
      payout = position.upNet + position.downNet;
    } else if (market.result === "Up" && position.upNet > 0) {
      payout = Math.floor((poolTotal * position.upNet) / market.totalUp);
    } else if (market.result === "Down" && position.downNet > 0) {
      payout = Math.floor((poolTotal * position.downNet) / market.totalDown);
    }
    
    if (payout === 0) {
      throw new Error("No winnings to claim");
    }
    
    const key = this.positionKey(marketPubkey, userPubkey);
    this.positions.set(key, { ...position, claimed: true });
    
    return payout;
  }
}

export const storage = new MemStorage();
