export interface PoolState {
    recentVolume: bigint;
    baselineVolume: bigint;
    lastUpdateBlock: bigint;
    lastPrice: bigint;
  }
  
  export interface PoolConfig {
    velocityMultiplier: number;
    blockWindow: number;
    surgeFeeMultiplier: number;
    protectionEnabled: boolean;
  }
  
  export interface SwapHistory {
    swapsInWindow: number;
    volumeInWindow: bigint;
    lastSwapBlock: bigint;
  }
  
  export interface Keeper {
    stake: bigint;
    reputationScore: bigint;
    isActive: boolean;
  }
  
  export interface Challenge {
    suspectedAttacker: string;
    challenger: string;
    evidenceHash: string;
    submitBlock: bigint;
    votesFor: number;
    votesAgainst: number;
    executed: boolean;
    challengerStake: bigint;
  }