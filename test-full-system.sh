#!/bin/bash
# ============================================================
#  Hook'd Guard — Full System Test
#  Runs all attack phases and shows results in the UI.
#  Usage:  ./test-full-system.sh
# ============================================================

set -e

# Load env
if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi

RPC="${NEXT_PUBLIC_SEPOLIA_RPC:-https://ethereum-sepolia-rpc.publicnode.com}"

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set"
  echo "Run:  set -a && source .env.local && set +a"
  exit 1
fi

run_phase() {
  local phase=$1
  local label=$2
  echo ""
  echo "============================================"
  echo "  PHASE $phase — $label"
  echo "============================================"
  PHASE=$phase forge script script/SimulateAttacks.s.sol \
    --rpc-url "$RPC" --broadcast -vv
}

echo ""
echo "=========================================="
echo "  Hook'd Guard — Full System Test"
echo "=========================================="
echo ""
echo "Open the UI at http://localhost:3000"
echo "  Dashboard:   /dashboard"
echo "  Pools:       /pools"
echo "  Simulations: /simulations"
echo "  Keeper:      /keeper"
echo "  Challenges:  /challenges"
echo ""
echo "Press Enter to start..."
read

# Phase 0 — Baseline
run_phase 0 "Normal Swaps (baseline)"
echo ""
echo ">> Check Pools page — 3 new swaps should appear"
echo "Press Enter to continue..."
read

# Phase 1 — Wash Trading
run_phase 1 "Wash Trading Attack"
echo ""
echo ">> Check Simulations page — protection events should appear"
echo ">> Fees should escalate across the 8 swaps"
echo "Press Enter to continue..."
read

# Phase 3 — Sandwich
run_phase 3 "Sandwich Attack"
echo ""
echo ">> Check Dashboard — activity feed shows blocked attacks"
echo "Press Enter to continue..."
read

# Phase 4 — Keeper Registration
run_phase 4 "Keeper Registration"
echo ""
echo ">> Check Keeper page — should show Active Keeper status"
echo "Press Enter to continue..."
read

# Phase 5 — Challenge Flow
run_phase 5 "Challenge Submission + Vote"
echo ""
echo ">> Check Challenges page — new challenge with vote"
echo ""

echo "============================================"
echo "  ALL PHASES COMPLETE"
echo "============================================"
echo ""
echo "Summary of what happened:"
echo "  1. Normal swaps established baseline (no protection)"
echo "  2. Wash trading triggered progressive fee escalation"
echo "  3. Sandwich attack was detected and penalized"
echo "  4. Keeper node registered with 0.001 ETH stake"
echo "  5. Challenge submitted and voted on"
echo ""
echo "Check all UI pages to see the results!"
echo ""
