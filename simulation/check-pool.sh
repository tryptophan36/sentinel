#!/bin/bash

# Check pool status and protection state

set -e

echo "🔍 Checking Pool Status..."
echo ""

if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

set -a
source .env.local
set +a

if [ -z "$NEXT_PUBLIC_POOL_IDS" ]; then
    echo "❌ No pool initialized!"
    echo "Run ./init-pool.sh first"
    exit 1
fi

forge script script/QuickSwap.s.sol \
    --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
    -vv
