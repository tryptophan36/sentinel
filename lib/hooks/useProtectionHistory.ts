import { useMemo, useState, useEffect } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { HOOK_ADDRESS } from '@/lib/constants';
import { hookdGuardAbi } from '@/lib/abi/hookdGuard';

export type ProtectionEvent = {
  id: string;
  poolId: `0x${string}`;
  swapper: `0x${string}`;
  fee: number;
  reason: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  timestamp: number;
};

const MAX_EVENTS = 100;
const TOTAL_BLOCKS_TO_FETCH = 50000n;
const CHUNK_SIZE = 3000n;

export function useProtectionHistory(poolId?: `0x${string}`) {
  const [events, setEvents] = useState<ProtectionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const pushEvent = (event: ProtectionEvent) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id);
      if (exists) return prev;
      return [event, ...prev].slice(0, MAX_EVENTS);
    });
  };

  // Fetch historical ProtectionTriggered events
  useEffect(() => {
    if (!publicClient || !HOOK_ADDRESS) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock =
          currentBlock > TOTAL_BLOCKS_TO_FETCH
            ? currentBlock - TOTAL_BLOCKS_TO_FETCH
            : 0n;

        const allLogs: ProtectionEvent[] = [];
        let to = currentBlock;

        while (to > startBlock && allLogs.length < MAX_EVENTS) {
          const from = to - CHUNK_SIZE > startBlock ? to - CHUNK_SIZE : startBlock;

          try {
            const logs = await publicClient.getLogs({
              address: HOOK_ADDRESS,
              event: {
                type: 'event',
                name: 'ProtectionTriggered',
                inputs: [
                  { name: 'poolId', type: 'bytes32', indexed: true },
                  { name: 'swapper', type: 'address', indexed: true },
                  { name: 'fee', type: 'uint24', indexed: false },
                  { name: 'reason', type: 'string', indexed: false },
                ],
              },
              fromBlock: from,
              toBlock: to,
            });

            for (const log of logs) {
              const { poolId: evPoolId, swapper, fee, reason } = log.args as {
                poolId: `0x${string}`;
                swapper: `0x${string}`;
                fee: number;
                reason: string;
              };

              // Filter by poolId if specified
              if (poolId && evPoolId !== poolId) continue;

              allLogs.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                poolId: evPoolId,
                swapper,
                fee: Number(fee),
                reason,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: Date.now(),
              });
            }
          } catch {
            // Some RPC providers reject large ranges; just continue
          }

          if (allLogs.length >= MAX_EVENTS) break;
          to = from - 1n;
        }

        setEvents(allLogs.slice(0, MAX_EVENTS));
      } catch (error: any) {
        const message =
          error?.shortMessage || error?.message || 'Failed to fetch protection history';
        console.error('Error fetching protection history:', message);
        setFetchError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [publicClient, poolId]);

  // Watch for new ProtectionTriggered events in real-time
  useWatchContractEvent({
    address: HOOK_ADDRESS,
    abi: hookdGuardAbi,
    eventName: 'ProtectionTriggered',
    onLogs(logs) {
      logs.forEach((log) => {
        const { poolId: evPoolId, swapper, fee } = log.args as {
          poolId: `0x${string}`;
          swapper: `0x${string}`;
          fee: number;
        };

        if (poolId && evPoolId !== poolId) return;

        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          poolId: evPoolId,
          swapper,
          fee: Number(fee),
          reason: 'MEV_PROTECTION',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: Date.now(),
        });
      });
    },
  });

  const sorted = useMemo(
    () => [...events].sort((a, b) => Number(b.blockNumber - a.blockNumber)),
    [events]
  );

  const stats = useMemo(() => {
    const totalBlocked = sorted.length;
    const avgFee =
      sorted.length > 0
        ? sorted.reduce((sum, e) => sum + e.fee, 0) / sorted.length
        : 0;
    const maxFee = sorted.length > 0 ? Math.max(...sorted.map((e) => e.fee)) : 0;
    const uniqueAttackers = new Set(sorted.map((e) => e.swapper)).size;
    return { totalBlocked, avgFee, maxFee, uniqueAttackers };
  }, [sorted]);

  return {
    events: sorted,
    stats,
    isLoading,
    fetchError,
    hasEvents: sorted.length > 0,
  };
}
