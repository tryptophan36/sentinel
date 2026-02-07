#!/bin/bash

# HookdGuard Deployment Script
# Usage: ./deploy.sh [sepolia|mainnet]

set -e

NETWORK=${1:-sepolia}

echo "🚀 HookdGuard Deployment Script"
echo "================================"
echo ""

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry is not installed!"
    echo ""
    echo "Install it with:"
    echo "  curl -L https://foundry.paradigm.xyz | bash"
    echo "  foundryup"
    echo ""
    exit 1
fi

echo "✓ Foundry detected"

# Check if dependencies are installed
if [ ! -d "lib/v4-core" ]; then
    echo ""
    echo "📦 Installing Uniswap V4 dependencies..."
    forge install Uniswap/v4-core --commit
    forge install Uniswap/v4-periphery --commit
    forge install foundry-rs/forge-std --commit
    echo "✓ Dependencies installed"
fi

# Check for private key
if grep -q "your_private_key_here" .env.local; then
    echo ""
    echo "⚠️  WARNING: Please update your DEPLOYER_PRIVATE_KEY in .env.local"
    echo ""
    echo "Current .env.local has placeholder values. Update:"
    echo "  - DEPLOYER_PRIVATE_KEY"
    echo "  - ETHERSCAN_API_KEY (for verification)"
    echo "  - NEXT_PUBLIC_POOL_MANAGER_ADDRESS (Uniswap V4 PoolManager)"
    echo ""
    exit 1
fi




echo ""
echo "🔍 Pre-deployment checks..."
echo "  Network: $NETWORK"
echo "  Deployer: $(cast wallet address $DEPLOYER_PRIVATE_KEY 2>/dev/null || echo 'Unable to derive address')"

# Check balance
echo ""
read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🔨 Compiling contracts..."
forge build

echo ""
echo "🚀 Deploying HookdGuard..."
echo ""

# Deploy with deterministic address (required for Uniswap V4 hooks)
forge script script/DeployDeterministic.s.sol \
    --rpc-url $NETWORK \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Copy the contract address from above"
echo "  2. Update NEXT_PUBLIC_HOOK_ADDRESS in .env.local"
echo "  3. Restart your Next.js dev server: npm run dev"
echo ""
