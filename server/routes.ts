import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { placeBetSchema, claimSchema, calculateFee } from "@shared/schema";

const MOCK_USER_PUBKEY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/markets", async (_req, res) => {
    try {
      const markets = await storage.getMarkets();
      res.json(markets);
    } catch (error) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const market = await storage.getMarket(id);
      
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      
      const position = await storage.getPosition(id, MOCK_USER_PUBKEY);
      
      res.json({ ...market, position });
    } catch (error) {
      console.error("Error fetching market:", error);
      res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats(MOCK_USER_PUBKEY);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/bets", async (req, res) => {
    try {
      const parsed = placeBetSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parsed.error.format() 
        });
      }
      
      const { marketPubkey, side, grossLamports } = parsed.data;
      
      const { net } = calculateFee(grossLamports, 100);
      
      const { market, position } = await storage.placeBet(
        marketPubkey,
        MOCK_USER_PUBKEY,
        side,
        net
      );
      
      res.json({ success: true, market, position });
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to place bet" 
      });
    }
  });

  app.post("/api/claim", async (req, res) => {
    try {
      const parsed = claimSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parsed.error.format() 
        });
      }
      
      const { marketPubkey } = parsed.data;
      
      const payout = await storage.claim(marketPubkey, MOCK_USER_PUBKEY);
      
      res.json({ success: true, payout });
    } catch (error) {
      console.error("Error claiming:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to claim" 
      });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const alignedStart = Math.floor(now / 900) * 900 + 900;
      
      const basePrice = 19400 + Math.random() * 100;
      const priceInt = Math.floor(basePrice * 100000000);
      
      const market = await storage.createMarket({
        feedId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        startTs: alignedStart,
        endTs: alignedStart + 900,
        startPrice: priceInt,
        startExpo: -8,
        endPrice: null,
        endExpo: null,
        totalUp: 0,
        totalDown: 0,
        status: "Open",
        result: "Unset",
      });
      
      res.json(market);
    } catch (error) {
      console.error("Error creating market:", error);
      res.status(500).json({ error: "Failed to create market" });
    }
  });

  return httpServer;
}
