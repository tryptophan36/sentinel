#!/bin/bash

# Quick Demo Script for Judges
# This script runs a single attack simulation to demonstrate protection

set -e

echo "🎯 Hook'd Guard - Quick Demo"
echo "============================"
echo ""

# Check if private key is set
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set!"
    echo ""
    echo "Please set it first:"
    echo "  export DEPLOYER_PRIVATE_KEY=<your-private-key>"
    echo ""
    exit 1
fi

RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

echo "📊 Step 1: Check initial pool state"
echo "-----------------------------------"
forge script script/CheckCorrectPool.s.sol --rpc-url $RPC_URL
echo ""

echo "⚔️  Step 2: Run Velocity Attack"
echo "-------------------------------"
echo "This will attempt 5 swaps of 0.8 ETH each"
echo "Expected: First 3 succeed, last 2 blocked by protection"
echo ""
echo "Press Enter to start the attack..."
read

ATTACK_TYPE=1 forge script script/SimulateAttackWorking.s.sol \
    --rpc-url $RPC_URL --broadcast -vv

echo ""
echo "✅ Step 3: Check final pool state"
echo "----------------------------------"
forge script script/CheckCorrectPool.s.sol --rpc-url $RPC_URL
echo ""

echo "🎉 Demo Complete!"
echo ""
echo "📊 Now check the UI:"
echo "  - Dashboard: http://localhost:3000/dashboard"
echo "  - Pools: http://localhost:3000/pools"
echo "  - Simulations: http://localhost:3000/simulations"
echo ""
echo "You should see:"
echo "  ✅ Swaps in the 'Recent Swaps' section"
echo "  ✅ Protection events in the activity feed"
echo "  ✅ Updated pool metrics"
echo ""
