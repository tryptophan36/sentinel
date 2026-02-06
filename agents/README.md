# Hook'd Guard Agent (TypeScript)

This is the off-chain sentinel skeleton. It should watch pending swaps targeting the protected pool and call the hook guardian function when risk thresholds are exceeded.

## Next steps
- Choose an RPC provider that exposes pending tx streams (e.g., custom node or relay).
- Decode Uniswap v4 swap calldata for the target pool.
- Estimate price impact and compare against `MAX_IMPACT_BPS`.
- Send a signed transaction to the hook guardian function.

## Environment variables
- `RPC_URL`
- `CHAIN_ID`
- `POOL_ID`
- `GUARDIAN_KEY`
- `HOOK_ADDRESS`
- `MAX_IMPACT_BPS`
