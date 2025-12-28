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
 * - KEEPER_PRIVATE_KEY: Base58 encoded private key for keeper wallet  
 * - PROGRAM_ID: PM15 program ID
 * - PYTH_RECEIVER_PROGRAM_ID: Pyth Solana Receiver program ID
 * - SOL_USD_FEED_ID: SOL/USD price feed ID
 * - MAX_STALENESS_SECONDS: Max price staleness (default: 60)
 * 
 * NOTE: For Pyth Pull Oracle integration, the keeper needs to:
 * 1. Fetch price update VAA from Hermes API
 * 2. Post the VAA to create a PriceUpdateV2 account using Pyth Receiver program
 * 3. Use that account in createMarket/resolveMarket instructions
 * 
 * The current implementation includes the structure but requires additional
 * Pyth SDK integration for production use. See @pythnetwork/pyth-solana-receiver
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { HermesClient } from "@pythnetwork/hermes-client";

const MARKET_DURATION_SECONDS = 900; // 15 minutes

interface KeeperConfig {
  rpcUrl: string;
  programId: string;
  pythReceiverProgramId: string;
  solUsdFeedId: string;
  maxStalenessSeconds: number;
  hermesUrl: string;
}

interface MarketAccount {
  publicKey: PublicKey;
  feedId: number[];
  startTs: anchor.BN;
  endTs: anchor.BN;
  startPrice: anchor.BN;
  startExpo: number;
  endPrice: anchor.BN;
  endExpo: number;
  totalUp: anchor.BN;
  totalDown: anchor.BN;
  status: { open?: {} } | { closed?: {} } | { resolved?: {} } | { cancelled?: {} };
  result: { unset?: {} } | { up?: {} } | { down?: {} } | { push?: {} };
  vaultBump: number;
  bump: number;
}

const DEFAULT_CONFIG: KeeperConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  programId: process.env.PROGRAM_ID || "EEeQgeh56xge6y82xU9K8sb2PfPs9nXHh3fHrNEwdcrU",
  pythReceiverProgramId: process.env.PYTH_RECEIVER_PROGRAM_ID || "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  solUsdFeedId: process.env.SOL_USD_FEED_ID || "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  maxStalenessSeconds: parseInt(process.env.MAX_STALENESS_SECONDS || "60"),
  hermesUrl: process.env.HERMES_URL || "https://hermes.pyth.network",
};

const IDL: any = {
  version: "0.1.0",
  name: "pm15",
  address: "EEeQgeh56xge6y82xU9K8sb2PfPs9nXHh3fHrNEwdcrU",
  metadata: { name: "pm15", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initializeConfig",
      accounts: [
        { name: "config", isMut: true, isSigner: false },
        { name: "treasuryVault", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "feeBps", type: "u16" },
        { name: "minBetLamports", type: "u64" },
        { name: "maxStalenessSeconds", type: "u32" },
      ],
    },
    {
      name: "createMarket",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "marketVault", isMut: true, isSigner: false },
        { name: "priceUpdate", isMut: false, isSigner: false },
        { name: "creator", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "startTs", type: "i64" }],
    },
    {
      name: "closeMarket",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
      ],
      args: [],
    },
    {
      name: "resolveMarket",
      accounts: [
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "priceUpdate", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Config",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "treasuryVault", type: "publicKey" },
          { name: "feeBps", type: "u16" },
          { name: "minBetLamports", type: "u64" },
          { name: "maxStalenessSeconds", type: "u32" },
          { name: "allowedFeedId", type: { array: ["u8", 32] } },
          { name: "bump", type: "u8" },
        ],
      },
    },
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
  ],
  types: [
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

class Keeper {
  private config: KeeperConfig;
  private running: boolean = false;
  private connection: Connection;
  private wallet: Keypair | null = null;
  private program: anchor.Program | null = null;
  private hermesClient: HermesClient;

  constructor(config: KeeperConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.hermesClient = new HermesClient(config.hermesUrl);
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  private async initializeWallet(): Promise<void> {
    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("KEEPER_PRIVATE_KEY environment variable not set");
    }

    try {
      const secretKey = Uint8Array.from(JSON.parse(privateKey));
      this.wallet = Keypair.fromSecretKey(secretKey);
      this.log(`Keeper wallet: ${this.wallet.publicKey.toBase58()}`);
      
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      this.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch {
      const bs58 = await import("bs58");
      const secretKey = bs58.default.decode(privateKey);
      this.wallet = Keypair.fromSecretKey(secretKey);
      this.log(`Keeper wallet: ${this.wallet.publicKey.toBase58()}`);
    }

    const provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.wallet),
      { commitment: "confirmed" }
    );
    
    this.program = new anchor.Program(
      IDL,
      provider
    );
  }

  private feedIdToBuffer(): Buffer {
    const hex = this.config.solUsdFeedId.startsWith("0x") 
      ? this.config.solUsdFeedId.slice(2) 
      : this.config.solUsdFeedId;
    return Buffer.from(hex, "hex");
  }

  private getConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      new PublicKey(this.config.programId)
    );
  }

  private getTreasuryVaultPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury_vault")],
      new PublicKey(this.config.programId)
    );
  }

  private getMarketPda(startTs: number): [PublicKey, number] {
    const feedIdBuffer = this.feedIdToBuffer();
    const startTsBuffer = Buffer.alloc(8);
    startTsBuffer.writeBigInt64LE(BigInt(startTs));
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), feedIdBuffer, startTsBuffer],
      new PublicKey(this.config.programId)
    );
  }

  private getMarketVaultPda(marketPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPubkey.toBuffer()],
      new PublicKey(this.config.programId)
    );
  }

  private getAlignedStartTs(): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.ceil(now / MARKET_DURATION_SECONDS) * MARKET_DURATION_SECONDS;
  }

  async getPythPriceAccount(): Promise<PublicKey> {
    const feedIdHex = this.config.solUsdFeedId.startsWith("0x")
      ? this.config.solUsdFeedId.slice(2)
      : this.config.solUsdFeedId;
    
    const priceUpdateData = await this.hermesClient.getLatestPriceUpdates([feedIdHex]);
    this.log(`Fetched Pyth price update: ${JSON.stringify(priceUpdateData.parsed?.[0]?.price)}`);

    const shardId = 0;
    const feedIdBuffer = Buffer.from(feedIdHex, "hex");
    
    const [priceUpdatePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("price_update"),
        Buffer.from([shardId & 0xff, (shardId >> 8) & 0xff]),
        feedIdBuffer,
      ],
      new PublicKey(this.config.pythReceiverProgramId)
    );

    this.log(`Pyth price account PDA: ${priceUpdatePda.toBase58()}`);
    return priceUpdatePda;
  }

  async createMarket(startTs: number): Promise<string> {
    if (!this.program || !this.wallet) {
      throw new Error("Keeper not initialized");
    }

    this.log(`Creating market with start_ts=${startTs} (${new Date(startTs * 1000).toISOString()})`);
    
    const [configPda] = this.getConfigPda();
    const [marketPda] = this.getMarketPda(startTs);
    const [marketVaultPda] = this.getMarketVaultPda(marketPda);
    const priceUpdateAccount = await this.getPythPriceAccount();

    this.log(`Config PDA: ${configPda.toBase58()}`);
    this.log(`Market PDA: ${marketPda.toBase58()}`);
    this.log(`Market Vault PDA: ${marketVaultPda.toBase58()}`);
    
    try {
      const tx = await this.program.methods
        .createMarket(new anchor.BN(startTs))
        .accounts({
          config: configPda,
          market: marketPda,
          marketVault: marketVaultPda,
          priceUpdate: priceUpdateAccount,
          creator: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.wallet])
        .rpc();

      this.log(`Market created! TX: ${tx}`);
      return marketPda.toBase58();
    } catch (error: any) {
      this.log(`Error creating market: ${error.message}`);
      if (error.logs) {
        this.log(`Logs: ${error.logs.join("\n")}`);
      }
      throw error;
    }
  }

  async closeMarket(marketPubkey: string): Promise<void> {
    if (!this.program || !this.wallet) {
      throw new Error("Keeper not initialized");
    }

    this.log(`Closing market ${marketPubkey}...`);
    
    try {
      const tx = await this.program.methods
        .closeMarket()
        .accounts({
          market: new PublicKey(marketPubkey),
        })
        .signers([this.wallet])
        .rpc();

      this.log(`Market closed! TX: ${tx}`);
    } catch (error: any) {
      this.log(`Error closing market: ${error.message}`);
      throw error;
    }
  }

  async resolveMarket(marketPubkey: string): Promise<void> {
    if (!this.program || !this.wallet) {
      throw new Error("Keeper not initialized");
    }

    this.log(`Resolving market ${marketPubkey}...`);
    
    const [configPda] = this.getConfigPda();
    const priceUpdateAccount = await this.getPythPriceAccount();
    
    try {
      const tx = await this.program.methods
        .resolveMarket()
        .accounts({
          config: configPda,
          market: new PublicKey(marketPubkey),
          priceUpdate: priceUpdateAccount,
        })
        .signers([this.wallet])
        .rpc();

      this.log(`Market resolved! TX: ${tx}`);
    } catch (error: any) {
      this.log(`Error resolving market: ${error.message}`);
      throw error;
    }
  }

  async getOpenMarkets(): Promise<{ publicKey: string; startTs: number; endTs: number }[]> {
    if (!this.program) {
      return [];
    }

    try {
      const markets = await (this.program.account as any).market.all();
      return markets
        .filter((m: any) => m.account.status.open !== undefined)
        .map((m: any) => ({
          publicKey: m.publicKey.toBase58(),
          startTs: m.account.startTs.toNumber(),
          endTs: m.account.endTs.toNumber(),
        }));
    } catch (error: any) {
      this.log(`Error fetching open markets: ${error.message}`);
      return [];
    }
  }

  async getClosedUnresolvedMarkets(): Promise<{ publicKey: string }[]> {
    if (!this.program) {
      return [];
    }

    try {
      const markets = await (this.program.account as any).market.all();
      return markets
        .filter((m: any) => m.account.status.closed !== undefined)
        .map((m: any) => ({
          publicKey: m.publicKey.toBase58(),
        }));
    } catch (error: any) {
      this.log(`Error fetching closed markets: ${error.message}`);
      return [];
    }
  }

  async checkAndCreateMarket(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const alignedStart = this.getAlignedStartTs();
    const timeUntilNext = alignedStart - now;

    if (timeUntilNext < 60 && timeUntilNext > 0) {
      const [marketPda] = this.getMarketPda(alignedStart);
      
      try {
        const existingMarket = await (this.program?.account as any).market.fetchNullable(marketPda);
        if (!existingMarket) {
          await this.createMarket(alignedStart);
        } else {
          this.log(`Market for ${new Date(alignedStart * 1000).toISOString()} already exists`);
        }
      } catch (error: any) {
        if (error.message?.includes("Account does not exist")) {
          await this.createMarket(alignedStart);
        } else {
          this.log(`Error checking market: ${error.message}`);
        }
      }
    }
  }

  async runOnce(): Promise<void> {
    this.log("=== Keeper run started ===");
    
    try {
      if (!this.wallet) {
        await this.initializeWallet();
      }

      const now = Math.floor(Date.now() / 1000);
      
      await this.checkAndCreateMarket();
      
      const openMarkets = await this.getOpenMarkets();
      this.log(`Found ${openMarkets.length} open markets`);
      
      for (const market of openMarkets) {
        if (now >= market.endTs) {
          this.log(`Market ${market.publicKey} has ended, closing...`);
          await this.closeMarket(market.publicKey);
        }
      }
      
      const closedMarkets = await this.getClosedUnresolvedMarkets();
      this.log(`Found ${closedMarkets.length} closed markets to resolve`);
      
      for (const market of closedMarkets) {
        await this.resolveMarket(market.publicKey);
      }
      
      this.log("=== Keeper run completed ===");
    } catch (error: any) {
      this.log(`Error in keeper run: ${error.message}`);
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
