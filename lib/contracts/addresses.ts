export const CONTRACTS = {
    sepolia: {
      hookdGuard: process.env.NEXT_PUBLIC_HOOK_ADDRESS || '',
      poolManager: process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '',
    },
    mainnet: {
      hookdGuard: '',
      poolManager: '',
    },
  } as const;
  
  export function getContractAddress(
    chainId: number,
    contract: 'hookdGuard' | 'poolManager'
  ): string {
    if (chainId === 11155111) {
      return CONTRACTS.sepolia[contract];
    }
    if (chainId === 1) {
      return CONTRACTS.mainnet[contract];
    }
    throw new Error(`Unsupported chain: ${chainId}`);
  }