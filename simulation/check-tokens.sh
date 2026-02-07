#!/bin/bash

# Check token balances for liquidity provision

set -e

echo "🪙 Checking Token Balances"
echo "=========================="
echo ""

# Get the project root (parent directory of simulation/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local not found at $ENV_FILE"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

# Get deployer address
DEPLOYER=$(cast wallet address $DEPLOYER_PRIVATE_KEY 2>/dev/null || echo "")

if [ -z "$DEPLOYER" ]; then
    echo "❌ Could not derive address from private key"
    exit 1
fi

echo "Wallet Address: $DEPLOYER"
echo ""

# Token addresses
WETH="0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
USDC="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
RPC="https://ethereum-sepolia-rpc.publicnode.com"

# Check ETH balance
echo "📊 Balances on Sepolia:"
echo "----------------------"

ETH_BALANCE=$(cast balance $DEPLOYER --rpc-url $RPC)
echo "ETH: $(cast --from-wei $ETH_BALANCE) ETH"

# Check WETH balance
WETH_BALANCE=$(cast call $WETH "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC)
echo "WETH: $(cast --from-wei $WETH_BALANCE) WETH"

# Check USDC balance (assuming 6 decimals)
USDC_BALANCE=$(cast call $USDC "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC)
USDC_FORMATTED=$(echo "scale=2; $USDC_BALANCE / 1000000" | bc)
echo "USDC: $USDC_FORMATTED USDC"

echo ""
echo "📋 Liquidity Requirements:"
echo "-------------------------"
echo "Minimum for testing:"
echo "  - 0.2 WETH"
echo "  - 500 USDC"
echo ""

# Check if sufficient
WETH_WEI=$(echo "$WETH_BALANCE" | sed 's/^0x//' | xargs printf "%d")
USDC_RAW=$(echo "$USDC_BALANCE" | sed 's/^0x//' | xargs printf "%d")

MIN_WETH_WEI="200000000000000000"  # 0.2 ETH in wei
MIN_USDC="500000000"  # 500 USDC with 6 decimals

if [ "$WETH_WEI" -ge "$MIN_WETH_WEI" ] && [ "$USDC_RAW" -ge "$MIN_USDC" ]; then
    echo "✅ You have sufficient tokens to add liquidity!"
    echo ""
    echo "Next steps:"
    echo "1. Add liquidity via Uniswap V4 interface"
    echo "2. Or deploy PoolModifyLiquidityTest and use script"
elif [ "$WETH_WEI" -lt "$MIN_WETH_WEI" ]; then
    echo "⚠️  Need more WETH!"
    echo ""
    echo "To get WETH:"
    echo "  cast send $WETH \"deposit()\" \\"
    echo "    --value 0.2ether \\"
    echo "    --rpc-url $RPC \\"
    echo "    --private-key \$DEPLOYER_PRIVATE_KEY"
elif [ "$USDC_RAW" -lt "$MIN_USDC" ]; then
    echo "⚠️  Need more USDC!"
    echo ""
    echo "Get test USDC from Sepolia faucets"
fi

echo ""
echo "💡 To get test tokens:"
echo "  ETH: https://sepoliafaucet.com/"
echo "  WETH: Wrap ETH using the command above"
echo "  USDC: Find Sepolia USDC faucet or mint function"
echo ""
