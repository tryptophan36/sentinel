#!/bin/bash

# HookdGuard Attack Simulation Script
# Simulates different types of MEV attacks

set -e

ATTACK_TYPE=${1:-"help"}

echo "⚔️  HookdGuard Attack Simulator"
echo "=============================="
echo ""

if [ "$ATTACK_TYPE" = "help" ] || [ "$ATTACK_TYPE" = "-h" ] || [ "$ATTACK_TYPE" = "--help" ]; then
    echo "Usage: ./attack-sim.sh [attack_type]"
    echo ""
    echo "Available attack types:"
    echo "  sandwich    - Simulate sandwich attack (front-run + back-run)"
    echo "  velocity    - High volume in short time window"
    echo "  wash        - Rapid back-and-forth wash trading"
    echo "  gradual     - Progressive fee testing"
    echo ""
    echo "Example:"
    echo "  ./attack-sim.sh velocity"
    echo ""
    exit 0
fi

# Check environment
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

# Map attack type to number
case $ATTACK_TYPE in
    sandwich)
        ATTACK_NUM=0
        echo "🎯 Simulating SANDWICH ATTACK"
        echo "Testing velocity protection with large front-run and back-run"
        ;;
    velocity)
        ATTACK_NUM=1
        echo "🎯 Simulating VELOCITY ATTACK"
        echo "Testing surge fees with high volume in short time"
        ;;
    wash)
        ATTACK_NUM=2
        echo "🎯 Simulating WASH TRADING"
        echo "Testing progressive fees with rapid swaps"
        ;;
    gradual)
        ATTACK_NUM=3
        echo "🎯 Simulating GRADUAL ATTACK"
        echo "Testing progressive fee accumulation"
        ;;
    *)
        echo "❌ Unknown attack type: $ATTACK_TYPE"
        echo "Run './attack-sim.sh help' for available options"
        exit 1
        ;;
esac

echo ""
echo "Note: This requires swap router integration"
echo "For now, this demonstrates the attack patterns"
echo ""

export ATTACK_TYPE=$ATTACK_NUM

forge script script/SimulateAttack.s.sol \
    --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
    --broadcast \
    -vvv

echo ""
echo "✅ Attack simulation complete!"
echo ""
echo "Check the pool state with: ./check-pool.sh"
echo ""
