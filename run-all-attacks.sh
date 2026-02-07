#!/bin/bash

# Run all attack simulations
# This script tests all protection layers

set -e

echo "🎯 HookdGuard - Complete Attack Simulation Suite"
echo "================================================"
echo ""

# Check if private key is set
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set!"
    echo "Export it first: export DEPLOYER_PRIVATE_KEY=<your-key>"
    exit 1
fi

RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

echo "📊 Step 1: Check initial pool state"
echo "-----------------------------------"
forge script script/CheckCorrectPool.s.sol --rpc-url $RPC_URL
echo ""
read -p "Press Enter to continue..."
echo ""

echo "⚔️  Step 2: Velocity Attack (High volume in short time)"
echo "-------------------------------------------------------"
echo "This will attempt 5 swaps of 0.8 ETH each"
echo "Expected: First 3 succeed, last 2 blocked by protection"
echo ""
ATTACK_TYPE=1 forge script script/SimulateAttackWorking.s.sol \
    --rpc-url $RPC_URL --broadcast -vv
echo ""
read -p "Press Enter to continue..."
echo ""

echo "🔄 Step 3: Wash Trading Attack (Rapid back-and-forth)"
echo "------------------------------------------------------"
echo "This will attempt 10 rapid swaps alternating direction"
echo "Expected: Progressive fees increase with each swap"
echo ""
ATTACK_TYPE=2 forge script script/SimulateAttackWorking.s.sol \
    --rpc-url $RPC_URL --broadcast -vv
echo ""
read -p "Press Enter to continue..."
echo ""

echo "🎭 Step 4: Sandwich Attack (Front-run + back-run)"
echo "--------------------------------------------------"
echo "This simulates a classic sandwich attack pattern"
echo "Expected: Protection detects and penalizes"
echo ""
ATTACK_TYPE=0 forge script script/SimulateAttackWorking.s.sol \
    --rpc-url $RPC_URL --broadcast -vv
echo ""
read -p "Press Enter to continue..."
echo ""

echo "📈 Step 5: Gradual Attack (Progressive fee testing)"
echo "----------------------------------------------------"
echo "This tests progressive fee accumulation"
echo "Expected: Fees increase with frequency"
echo ""
ATTACK_TYPE=3 forge script script/SimulateAttackWorking.s.sol \
    --rpc-url $RPC_URL --broadcast -vv
echo ""

echo "✅ Step 6: Check final pool state"
echo "----------------------------------"
forge script script/CheckCorrectPool.s.sol --rpc-url $RPC_URL
echo ""

echo "🎉 All attack simulations complete!"
echo ""
echo "📊 Summary:"
echo "  - Velocity Attack: Tests volume limits"
echo "  - Wash Trading: Tests progressive fees"
echo "  - Sandwich Attack: Tests MEV detection"
echo "  - Gradual Attack: Tests fee accumulation"
echo ""
echo "Check ATTACK_SIMULATION_RESULTS.md for detailed results"
echo ""
