import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { useHookdGuardContract } from './useHookdGuardContract';

export type PoolState = {
  recentVolume: bigint;
  baselineVolume: bigint;
  lastUpdateBlock: bigint;
  lastPrice: bigint;
};

export type PoolConfig = {
  velocityMultiplier: number;
  blockWindow: number;
  surgeFeeMultiplier: number;
  protectionEnabled: boolean;
};

export function usePoolData(poolId?: `0x${string}`) {
  const contract = useHookdGuardContract();

  const stateQuery = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'getPoolState',
    args: poolId ? [poolId] : undefined,
    query: {
      enabled: Boolean(poolId && contract.address),
      refetchInterval: 12000,
    },
  });

  const configQuery = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'poolConfigs',
    args: poolId ? [poolId] : undefined,
    query: {
      enabled: Boolean(poolId && contract.address),
      refetchInterval: 12000,
    },
  });

  const state = useMemo<PoolState | null>(() => {
    if (!stateQuery.data) return null;
    const { recentVolume, baselineVolume, lastUpdateBlock, lastPrice } = stateQuery.data;
    return {
      recentVolume,
      baselineVolume,
      lastUpdateBlock: BigInt(lastUpdateBlock),
      lastPrice,
    };
  }, [stateQuery.data]);

  const config = useMemo<PoolConfig | null>(() => {
    if (!configQuery.data) return null;
    const { velocityMultiplier, blockWindow, surgeFeeMultiplier, protectionEnabled } = configQuery.data;
    return {
      velocityMultiplier: Number(velocityMultiplier),
      blockWindow: Number(blockWindow),
      surgeFeeMultiplier: Number(surgeFeeMultiplier),
      protectionEnabled,
    };
  }, [configQuery.data]);

  return {
    state,
    config,
    isLoading: stateQuery.isLoading || configQuery.isLoading,
  };
}
