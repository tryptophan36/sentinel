// Hook'd Guard agent (skeleton)
// Monitors pending swaps + pool state, triggers hook guardian tx when risk threshold is hit.

export type SentinelConfig = {
  chainId: number;
  rpcUrl: string;
  poolId: string;
  guardianKey: string;
  hookAddress: string;
  maxImpactBps: number;
};

export function buildConfig(): SentinelConfig {
  return {
    chainId: Number(process.env.CHAIN_ID || 11155111),
    rpcUrl: process.env.RPC_URL || "",
    poolId: process.env.POOL_ID || "",
    guardianKey: process.env.GUARDIAN_KEY || "",
    hookAddress: process.env.HOOK_ADDRESS || "",
    maxImpactBps: Number(process.env.MAX_IMPACT_BPS || 900)
  };
}

export async function runSentinel(config: SentinelConfig) {
  if (!config.rpcUrl || !config.guardianKey || !config.hookAddress) {
    throw new Error("Missing RPC_URL, GUARDIAN_KEY, or HOOK_ADDRESS");
  }

  // TODO: connect to a public mempool relay or RPC pending tx stream
  // TODO: decode v4 swap calldata for the target pool
  // TODO: estimate impact and send hook tx when threshold exceeded
  console.log("Sentinel armed", {
    chainId: config.chainId,
    poolId: config.poolId,
    hook: config.hookAddress
  });
}

if (require.main === module) {
  runSentinel(buildConfig()).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
