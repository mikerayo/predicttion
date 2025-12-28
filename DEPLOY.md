# SOL15 Deployment Guide

## Prerequisites

- [Rust](https://rustup.rs/) installed
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) v1.18+
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) v0.29.0

## Option 1: GitHub Actions (Recommended)

### Setup

1. **Create a Solana wallet** (if you don't have one):
   ```bash
   solana-keygen new -o my-wallet.json
   ```

2. **Fund your wallet**:
   - Devnet: `solana airdrop 2 --url devnet`
   - Mainnet: Transfer SOL from an exchange

3. **Get the private key as base58**:
   ```bash
   cat my-wallet.json
   # Copy the array of numbers
   ```

4. **Add GitHub Secret**:
   - Go to: Repository → Settings → Secrets → Actions
   - Create secret: `SOLANA_PRIVATE_KEY`
   - Value: The JSON array from your wallet file (e.g., `[123,45,67,...]`)

### Deploy

- **Automatic**: Push to `main` branch (changes in `programs/` folder)
- **Manual**: Actions → "Deploy Solana Program" → Run workflow → Select network

## Option 2: Local Deploy

### Setup

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Create wallet
solana-keygen new

# Configure for devnet
solana config set --url devnet

# Get free SOL
solana airdrop 2
```

### Deploy

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to devnet
./scripts/deploy.sh devnet

# Deploy to mainnet (when ready)
./scripts/deploy.sh mainnet-beta
```

## Post-Deployment

After deployment, you'll get a **Program ID**. Update it in:

1. `anchor/Anchor.toml`:
   ```toml
   [programs.devnet]
   pm15 = "YOUR_NEW_PROGRAM_ID"
   ```

2. `programs/pm15/src/lib.rs`:
   ```rust
   declare_id!("YOUR_NEW_PROGRAM_ID");
   ```

3. Rebuild:
   ```bash
   anchor build
   ```

## Initialize the Program

After deployment, initialize the config:

```bash
# Using the keeper or a custom script
npx ts-node keeper/src/initialize.ts
```

This creates:
- `config` PDA with fee settings
- `treasury_vault` PDA for collecting fees

## Verify Deployment

```bash
# Check program exists
solana program show YOUR_PROGRAM_ID

# Check account balance
solana balance YOUR_PROGRAM_ID
```

## Costs

| Network | Deploy Cost | Transaction Cost |
|---------|-------------|------------------|
| Devnet | FREE (test SOL) | FREE |
| Mainnet | ~2-5 SOL | ~0.000005 SOL |

## Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 2  # Devnet only
```

### "Program deployment failed"
- Check wallet balance
- Ensure Anchor version matches (0.29.0)
- Try: `anchor build --force`

### "Account not found"
- Initialize config first before creating markets
- Ensure PDAs are properly derived
