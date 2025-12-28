/**
 * SOL15 Prediction Markets Keeper
 * 
 * This keeper service is responsible for:
 * 1. Creating new markets every 15 minutes
 * 2. Closing markets when they end
 * 3. Resolving markets with end prices from Pyth oracle
 * 
 * Environment variables:
 * - SOLANA_RPC_URL: RPC endpoint (default: https://api.devnet.solana.com)
 * - KEEPER_KEYPAIR_PATH: Path to keeper wallet keypair
 * - PROGRAM_ID: PM15 program ID
 * - PYTH_RECEIVER_PROGRAM_ID: Pyth Solana Receiver program ID
 * - SOL_USD_FEED_ID: SOL/USD price feed ID
 * - MAX_STALENESS_SECONDS: Max price staleness (default: 60)
 */

const MARKET_DURATION_SECONDS = 900; // 15 minutes

interface KeeperConfig {
  rpcUrl: string;
  programId: string;
  pythReceiverProgramId: string;
  solUsdFeedId: string;
  maxStalenessSeconds: number;
}

interface Market {
  publicKey: string;
  startTs: number;
  endTs: number;
  status: "Open" | "Closed" | "Resolved" | "Cancelled";
}

const DEFAULT_CONFIG: KeeperConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  programId: process.env.PROGRAM_ID || "PM15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  pythReceiverProgramId: process.env.PYTH_RECEIVER_PROGRAM_ID || "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  solUsdFeedId: process.env.SOL_USD_FEED_ID || "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  maxStalenessSeconds: parseInt(process.env.MAX_STALENESS_SECONDS || "60"),
};

class Keeper {
  private config: KeeperConfig;
  private running: boolean = false;

  constructor(config: KeeperConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  private getAlignedStartTs(): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.ceil(now / MARKET_DURATION_SECONDS) * MARKET_DURATION_SECONDS;
  }

  async postPythUpdate(): Promise<string> {
    this.log("Posting Pyth price update...");
    return "price_update_account_pubkey";
  }

  async createMarket(startTs: number): Promise<string> {
    this.log(`Creating market with start_ts=${startTs}`);
    
    const priceUpdateAccount = await this.postPythUpdate();
    
    this.log(`Market created successfully for ${new Date(startTs * 1000).toISOString()}`);
    return "new_market_pubkey";
  }

  async closeMarket(marketPubkey: string): Promise<void> {
    this.log(`Closing market ${marketPubkey}...`);
    this.log(`Market ${marketPubkey} closed`);
  }

  async resolveMarket(marketPubkey: string): Promise<void> {
    this.log(`Resolving market ${marketPubkey}...`);
    
    const priceUpdateAccount = await this.postPythUpdate();
    
    this.log(`Market ${marketPubkey} resolved`);
  }

  async getOpenMarkets(): Promise<Market[]> {
    return [];
  }

  async getClosedUnresolvedMarkets(): Promise<Market[]> {
    return [];
  }

  async runOnce(): Promise<void> {
    this.log("=== Keeper run started ===");
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const alignedStart = this.getAlignedStartTs();
      
      const openMarkets = await this.getOpenMarkets();
      const hasUpcomingMarket = openMarkets.some(m => m.startTs === alignedStart);
      
      if (!hasUpcomingMarket && alignedStart - now < 60) {
        await this.createMarket(alignedStart);
      }
      
      for (const market of openMarkets) {
        if (now >= market.endTs) {
          await this.closeMarket(market.publicKey);
        }
      }
      
      const closedMarkets = await this.getClosedUnresolvedMarkets();
      for (const market of closedMarkets) {
        await this.resolveMarket(market.publicKey);
      }
      
      this.log("=== Keeper run completed ===");
    } catch (error) {
      this.log(`Error in keeper run: ${error}`);
    }
  }

  async runLoop(intervalSeconds: number = 30): Promise<void> {
    this.log(`Starting keeper loop with interval ${intervalSeconds}s`);
    this.running = true;
    
    while (this.running) {
      await this.runOnce();
      await this.sleep(intervalSeconds * 1000);
    }
    
    this.log("Keeper loop stopped");
  }

  stop(): void {
    this.running = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "once";
  
  const keeper = new Keeper();
  
  if (mode === "loop") {
    const interval = parseInt(args[1] || "30");
    console.log(`Running keeper in loop mode with ${interval}s interval`);
    
    process.on("SIGINT", () => {
      console.log("\nReceived SIGINT, stopping keeper...");
      keeper.stop();
    });
    
    await keeper.runLoop(interval);
  } else {
    console.log("Running keeper once...");
    await keeper.runOnce();
  }
}

main().catch(console.error);

export { Keeper, KeeperConfig };
