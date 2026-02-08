export const HOOK_ADDRESS = (process.env.NEXT_PUBLIC_HOOK_ADDRESS || '') as `0x${string}`;
export const POOL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '') as `0x${string}`;

export const DEFAULT_POOL_IDS = (process.env.NEXT_PUBLIC_POOL_IDS || '')
  .split(',')
  .map((pool) => pool.trim())
  .filter(Boolean) as `0x${string}`[];

// Sepolia token addresses
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as `0x${string}`;

// PoolSwapTest (Uniswap V4 test swap router deployed on Sepolia)
export const POOL_SWAP_TEST_ADDRESS = '0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe' as `0x${string}`;

// Swap price limits
export const MIN_SQRT_RATIO = 4295128740n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970341n;
