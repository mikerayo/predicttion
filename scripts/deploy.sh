#!/bin/bash
set -e

NETWORK=${1:-devnet}
PROGRAM_DIR="programs/pm15"

echo "============================================"
echo "  SOL15 Prediction Markets - Deploy Script"
echo "============================================"
echo ""
echo "Network: $NETWORK"
echo ""

if ! command -v solana &> /dev/null; then
    echo "Error: Solana CLI not installed"
    echo "Install: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "Error: Anchor CLI not installed"
    echo "Install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
    exit 1
fi

echo "Configuring Solana for $NETWORK..."
if [ "$NETWORK" = "mainnet-beta" ]; then
    solana config set --url https://api.mainnet-beta.solana.com
else
    solana config set --url https://api.devnet.solana.com
fi

echo ""
echo "Wallet: $(solana address)"
echo "Balance: $(solana balance)"
echo ""

if [ "$NETWORK" = "devnet" ]; then
    BALANCE=$(solana balance | awk '{print $1}')
    if [ "$(echo "$BALANCE < 1" | bc -l 2>/dev/null || echo "1")" = "1" ]; then
        echo "Low balance. Requesting airdrop..."
        solana airdrop 2 || echo "Airdrop failed, you may need to use a faucet"
        sleep 5
        echo "New balance: $(solana balance)"
    fi
fi

echo ""
echo "Building program..."
cd "$PROGRAM_DIR"
anchor build

echo ""
echo "Deploying to $NETWORK..."
anchor deploy --provider.cluster "$NETWORK"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
if [ -f target/deploy/pm15-keypair.json ]; then
    echo "Program ID: $(solana address -k target/deploy/pm15-keypair.json)"
else
    echo "Check deploy logs for Program ID"
fi
echo ""
echo "Next steps:"
echo "  1. Update Program ID in anchor/Anchor.toml"
echo "  2. Update declare_id! in programs/pm15/src/lib.rs"
echo "  3. Run: anchor build (to rebuild with new ID)"
echo ""
