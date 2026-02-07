#!/bin/bash

# HookdGuard Pool Initialization Script
# Initializes a pool with real tokens on Sepolia testnet

set -e

echo "🏊 HookdGuard Pool Initialization"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Please create .env.local with your configuration"
    exit 1
fi

# Source environment variables
set -a
source .env.local
set +a

# Check if hook is deployed
if [ -z "$NEXT_PUBLIC_HOOK_ADDRESS" ] || [ "$NEXT_PUBLIC_HOOK_ADDRESS" = "" ]; then
    echo "❌ Hook not deployed!"
    echo ""
    echo "Please deploy the hook first:"
    echo "  ./deploy.sh sepolia"
    echo ""
    exit 1
fi

echo "✓ Hook deployed at: $NEXT_PUBLIC_HOOK_ADDRESS"
echo ""

# Build contracts
echo "🔨 Building contracts..."
forge build

echo ""
echo "🏊 Initializing pool with test tokens..."
echo ""
echo "This will create an ETH/USDC pool on Sepolia testnet"
echo "Initial price: ~2500 USDC per ETH"
echo ""

# Run initialization script
forge script script/TestPool.s.sol \
    --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
    --broadcast \
    -vvv

echo ""
echo "✅ Pool initialization complete!"
echo ""
echo "📝 Don't forget to:"
echo "  1. Copy the Pool ID from above"
echo "  2. Update NEXT_PUBLIC_POOL_IDS in .env.local"
echo "  3. Restart your Next.js dev server"
echo ""
echo "🎯 Ready to simulate attacks!"
echo ""
