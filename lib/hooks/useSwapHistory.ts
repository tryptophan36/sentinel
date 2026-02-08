import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useWatchContractEvent, usePublicClient } from 'wagmi';
import { POOL_MANAGER_ADDRESS, POOL_SWAP_TEST_ADDRESS } from '@/lib/constants';

export type SwapEvent = {
  id: string;
  poolId: `0x${string}`;
  sender: `0x${string}`;
  /** Actual wallet that initiated the transaction (tx.from) */
  from: `0x${string}`;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  fee: number;
  timestamp: number;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
};

const MAX_SWAPS = 100;
const TOTAL_BLOCKS_TO_FETCH = 50000n;
const CHUNK_SIZE = 3000n;

// PoolManager ABI - just the Swap event
const poolManagerAbi = [
  {
    type: 'event',
    name: 'Swap',
    inputs: [
      { indexed: true, name: 'id', type: 'bytes32' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0', type: 'int128' },
      { indexed: false, name: 'amount1', type: 'int128' },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'liquidity', type: 'uint128' },
      { indexed: false, name: 'tick', type: 'int24' },
      { indexed: false, name: 'fee', type: 'uint24' },
    ],
  },
] as const;

/**
 * Batch-resolve the actual tx.from (wallet address) for a set of swap events.
 * Groups by unique transactionHash to minimize RPC calls.
 */
async function resolveFromAddresses(
  swaps: SwapEvent[],
  publicClient: ReturnType<typeof usePublicClient>
): Promise<SwapEvent[]> {
  if (!publicClient || swaps.length === 0) return swaps;

  // Collect unique tx hashes
  const uniqueHashes = [...new Set(swaps.map((s) => s.transactionHash))];

  // Fetch transactions in parallel (batched)
  const fromMap = new Map<string, `0x${string}`>();
  const batchSize = 10;

  for (let i = 0; i < uniqueHashes.length; i += batchSize) {
    const batch = uniqueHashes.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((hash) => publicClient.getTransaction({ hash }))
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value?.from) {
        fromMap.set(batch[idx], result.value.from as `0x${string}`);
      }
    });
  }

  return swaps.map((swap) => ({
    ...swap,
    from: fromMap.get(swap.transactionHash) || swap.sender,
  }));
}

export function useSwapHistory(poolId?: `0x${string}`) {
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  const fetchIdRef = useRef(0);

  const pushSwap = useCallback((swap: SwapEvent) => {
    setSwaps((prev) => {
      const exists = prev.some((s) => s.id === swap.id);
      if (exists) return prev;
      return [swap, ...prev].slice(0, MAX_SWAPS);
    });
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!publicClient || !poolId || !POOL_MANAGER_ADDRESS) return;

    const fetchId = ++fetchIdRef.current;
    setIsLoadingHistory(true);
    setFetchError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const startBlock =
        currentBlock > TOTAL_BLOCKS_TO_FETCH
          ? currentBlock - TOTAL_BLOCKS_TO_FETCH
          : 0n;

      const allLogs: SwapEvent[] = [];
      let to = currentBlock;

      while (to > startBlock && allLogs.length < MAX_SWAPS) {
        const from =
          to - CHUNK_SIZE > startBlock ? to - CHUNK_SIZE : startBlock;

        try {
          const logs = await publicClient.getLogs({
            address: POOL_MANAGER_ADDRESS,
            event: poolManagerAbi[0],
            args: { id: poolId },
            fromBlock: from,
            toBlock: to,
          });

          for (const log of logs) {
            const {
              id,
              sender,
              amount0,
              amount1,
              sqrtPriceX96,
              liquidity,
              tick,
              fee,
            } = log.args as {
              id: `0x${string}`;
              sender: `0x${string}`;
              amount0: bigint;
              amount1: bigint;
              sqrtPriceX96: bigint;
              liquidity: bigint;
              tick: number;
              fee: number;
            };

            allLogs.push({
              id: `${log.transactionHash}-${log.logIndex}`,
              poolId: id,
              sender,
              from: sender, // placeholder, resolved below
              amount0,
              amount1,
              sqrtPriceX96,
              liquidity,
              tick,
              fee,
              timestamp: Date.now(),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          }
        } catch {
          // Some RPCs reject large ranges; continue scanning
        }

        if (allLogs.length >= MAX_SWAPS) break;
        to = from - 1n;
      }

      // Bail if a newer fetch was triggered while we were running
      if (fetchId !== fetchIdRef.current) return;

      // Resolve actual wallet addresses from tx.from
      const resolved = await resolveFromAddresses(
        allLogs.slice(0, MAX_SWAPS),
        publicClient
      );

      if (fetchId !== fetchIdRef.current) return;
      setSwaps(resolved);
    } catch (error: any) {
      if (fetchId !== fetchIdRef.current) return;
      const message =
        error?.shortMessage ||
        error?.message ||
        'Failed to fetch swap history';
      console.error('Error fetching swap history:', message);
      setFetchError(message);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoadingHistory(false);
      }
    }
  }, [publicClient, poolId]);

  // Fetch historical swaps on mount and when poolId changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Watch for new swap events in real-time
  useWatchContractEvent({
    address: POOL_MANAGER_ADDRESS,
    abi: poolManagerAbi,
    eventName: 'Swap',
    poll: true,
    pollingInterval: 4_000, // 4 seconds – more aggressive than default
    onLogs(logs) {
      logs.forEach(async (log) => {
        const {
          id,
          sender,
          amount0,
          amount1,
          sqrtPriceX96,
          liquidity,
          tick,
          fee,
        } = log.args as {
          id: `0x${string}`;
          sender: `0x${string}`;
          amount0: bigint;
          amount1: bigint;
          sqrtPriceX96: bigint;
          liquidity: bigint;
          tick: number;
          fee: number;
        };

        if (poolId && id !== poolId) return;

        // Try to resolve actual tx sender
        let fromAddr: `0x${string}` = sender;
        if (publicClient) {
          try {
            const tx = await publicClient.getTransaction({
              hash: log.transactionHash,
            });
            if (tx?.from) fromAddr = tx.from as `0x${string}`;
          } catch {
            // fallback to sender
          }
        }

        pushSwap({
          id: `${log.transactionHash}-${log.logIndex}`,
          poolId: id,
          sender,
          from: fromAddr,
          amount0,
          amount1,
          sqrtPriceX96,
          liquidity,
          tick,
          fee,
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      });
    },
  });

  const filteredSwaps = useMemo(() => {
    if (!poolId) return swaps;
    return swaps.filter((swap) => swap.poolId === poolId);
  }, [swaps, poolId]);

  // Sort by blockNumber descending (most recent first), then by logIndex
  const sortedSwaps = useMemo(
    () =>
      [...filteredSwaps].sort((a, b) => {
        const blockDiff = Number(b.blockNumber - a.blockNumber);
        if (blockDiff !== 0) return blockDiff;
        // Same block: sort by id (txHash-logIndex) for stable ordering
        return b.id.localeCompare(a.id);
      }),
    [filteredSwaps]
  );

  const stats = useMemo(() => {
    const totalVolume0 = filteredSwaps.reduce(
      (sum, swap) => sum + (swap.amount0 < 0n ? -swap.amount0 : swap.amount0),
      0n
    );
    const totalVolume1 = filteredSwaps.reduce(
      (sum, swap) => sum + (swap.amount1 < 0n ? -swap.amount1 : swap.amount1),
      0n
    );
    const avgFee =
      filteredSwaps.length > 0
        ? filteredSwaps.reduce((sum, swap) => sum + swap.fee, 0) /
          filteredSwaps.length
        : 0;

    return {
      totalSwaps: filteredSwaps.length,
      totalVolume0,
      totalVolume1,
      avgFee,
    };
  }, [filteredSwaps]);

  return {
    swaps: sortedSwaps,
    stats,
    hasSwaps: sortedSwaps.length > 0,
    isLoadingHistory,
    fetchError,
    /** Manually re-fetch swap history from chain */
    refetch: fetchHistory,
  };
}
