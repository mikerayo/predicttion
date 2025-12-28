/**
 * Initialize the PM15 program on Solana Devnet
 * 
 * This script must be run once after deploying the program to set up:
 * - Config PDA with program parameters
 * - Treasury vault PDA for fee collection
 * 
 * Usage:
 *   KEEPER_PRIVATE_KEY=<base58_private_key> npx tsx scripts/initialize-program.ts
 * 
 * Or for dry-run (shows what would be done):
 *   npx tsx scripts/initialize-program.ts --dry-run
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import bs58 from "bs58";

const PROGRAM_ID = new PublicKey("EEeQgeh56xge6y82xU9K8sb2PfPs9nXHh3fHrNEwdcrU");
const SOL_USD_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

const CONFIG = {
  feeBps: 100,
  minBetLamports: new BN(10_000_000),
  maxStalenessSeconds: 60,
};

function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

function getTreasuryVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury_vault")],
    PROGRAM_ID
  );
}

function createInitializeConfigInstruction(
  config: PublicKey,
  treasuryVault: PublicKey,
  authority: PublicKey,
  feeBps: number,
  minBetLamports: BN,
  maxStalenessSeconds: number
): TransactionInstruction {
  const discriminator = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70]);
  
  const feeBpsBuffer = Buffer.alloc(2);
  feeBpsBuffer.writeUInt16LE(feeBps);
  
  const minBetBuffer = Buffer.alloc(8);
  minBetLamports.toArrayLike(Buffer, 'le', 8).copy(minBetBuffer);
  
  const stalenessBuffer = Buffer.alloc(4);
  stalenessBuffer.writeUInt32LE(maxStalenessSeconds);
  
  const data = Buffer.concat([
    discriminator,
    feeBpsBuffer,
    minBetBuffer,
    stalenessBuffer,
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: treasuryVault, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

async function checkConfigExists(connection: Connection): Promise<boolean> {
  const [configPda] = getConfigPda();
  const accountInfo = await connection.getAccountInfo(configPda);
  return accountInfo !== null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  
  console.log("=".repeat(60));
  console.log("PM15 Program Initialization");
  console.log("=".repeat(60));
  console.log(`Network: ${rpcUrl}`);
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`Mode: ${isDryRun ? "DRY RUN (no transaction)" : "LIVE"}`);
  console.log("");

  const connection = new Connection(rpcUrl, "confirmed");

  const [configPda, configBump] = getConfigPda();
  const [treasuryVaultPda, treasuryBump] = getTreasuryVaultPda();

  console.log("PDAs:");
  console.log(`  Config: ${configPda.toBase58()} (bump: ${configBump})`);
  console.log(`  Treasury Vault: ${treasuryVaultPda.toBase58()} (bump: ${treasuryBump})`);
  console.log("");

  const configExists = await checkConfigExists(connection);
  if (configExists) {
    console.log("Config already exists! Program is already initialized.");
    console.log("No action needed.");
    return;
  }

  console.log("Config does not exist. Program needs initialization.");
  console.log("");
  console.log("Configuration to set:");
  console.log(`  Fee: ${CONFIG.feeBps} bps (${CONFIG.feeBps / 100}%)`);
  console.log(`  Min Bet: ${CONFIG.minBetLamports.toString()} lamports (${CONFIG.minBetLamports.toNumber() / 1_000_000_000} SOL)`);
  console.log(`  Max Staleness: ${CONFIG.maxStalenessSeconds} seconds`);
  console.log(`  Feed ID: ${SOL_USD_FEED_ID}`);
  console.log("");

  if (isDryRun) {
    console.log("DRY RUN: Would initialize program with above configuration.");
    console.log("");
    console.log("To actually initialize, run:");
    console.log("  KEEPER_PRIVATE_KEY=<your_key> npx tsx scripts/initialize-program.ts");
    return;
  }

  const privateKeyEnv = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKeyEnv) {
    console.error("ERROR: KEEPER_PRIVATE_KEY environment variable is required.");
    process.exit(1);
  }

  let authority: Keypair;
  try {
    const privateKeyBytes = bs58.decode(privateKeyEnv);
    authority = Keypair.fromSecretKey(privateKeyBytes);
  } catch (e) {
    console.error("ERROR: Invalid KEEPER_PRIVATE_KEY format. Must be base58 encoded.");
    process.exit(1);
  }

  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`Balance: ${balance / 1_000_000_000} SOL`);
  
  if (balance < 0.01 * 1_000_000_000) {
    console.error("");
    console.error("ERROR: Insufficient balance. Need at least 0.01 SOL for rent.");
    console.error("");
    console.error("Get devnet SOL with:");
    console.error(`  solana airdrop 1 ${authority.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }

  console.log("");
  console.log("Initializing program...");

  try {
    const instruction = createInitializeConfigInstruction(
      configPda,
      treasuryVaultPda,
      authority.publicKey,
      CONFIG.feeBps,
      CONFIG.minBetLamports,
      CONFIG.maxStalenessSeconds
    );

    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: "confirmed" }
    );

    console.log("");
    console.log("SUCCESS! Program initialized.");
    console.log(`Transaction: ${signature}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log("");
    console.log("Next steps:");
    console.log("1. Run the keeper service to create markets");
    console.log("2. Users can now place bets on active markets");

  } catch (error: any) {
    console.error("");
    console.error("ERROR: Failed to initialize program.");
    console.error(error.message || error);
    
    if (error.logs) {
      console.error("");
      console.error("Program logs:");
      error.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
