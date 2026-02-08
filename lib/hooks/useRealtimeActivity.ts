import { useMemo, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { useHookdGuardContract } from './useHookdGuardContract';

export type ActivityEvent = {
  id: string;
  type: 'ProtectionTriggered' | 'ChallengeSubmitted' | 'ChallengeVoted' | 'ChallengeExecuted' | 'KeeperRegistered';
  timestamp: number;
  summary: string;
  address?: string;
};

const MAX_EVENTS = 50;

export function useRealtimeActivity() {
  const contract = useHookdGuardContract();
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const pushEvent = (event: ActivityEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  };

  useWatchContractEvent({
    address: contract.address,
    abi: contract.abi,
    eventName: 'ProtectionTriggered',
    onLogs(logs) {
      logs.forEach((log) => {
        const { poolId, swapper, fee } = log.args as {
          poolId: `0x${string}`;
          swapper: `0x${string}`;
          fee: number;
          reason: string;
        };
        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ProtectionTriggered',
          timestamp: Date.now(),
          summary: `Protection triggered on pool ${poolId}. Surge fee ${Number(fee) / 10000}% applied.`,
          address: swapper,
        });
      });
    },
  });

  useWatchContractEvent({
    address: contract.address,
    abi: contract.abi,
    eventName: 'ChallengeSubmitted',
    onLogs(logs) {
      logs.forEach((log) => {
        const { poolId, attacker, challenger, challengeId } = log.args as {
          poolId: `0x${string}`;
          attacker: `0x${string}`;
          challenger: `0x${string}`;
          challengeId: bigint;
        };
        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ChallengeSubmitted',
          timestamp: Date.now(),
          summary: `Challenge #${Number(challengeId)} submitted against ${attacker} on pool ${poolId}.`,
          address: challenger,
        });
      });
    },
  });

  useWatchContractEvent({
    address: contract.address,
    abi: contract.abi,
    eventName: 'ChallengeVoted',
    onLogs(logs) {
      logs.forEach((log) => {
        const { challengeId, voter, support } = log.args as {
          challengeId: bigint;
          voter: `0x${string}`;
          support: boolean;
        };
        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ChallengeVoted',
          timestamp: Date.now(),
          summary: `Vote ${support ? 'for' : 'against'} on challenge #${Number(challengeId)}.`,
          address: voter,
        });
      });
    },
  });

  useWatchContractEvent({
    address: contract.address,
    abi: contract.abi,
    eventName: 'ChallengeExecuted',
    onLogs(logs) {
      logs.forEach((log) => {
        const { challengeId, approved } = log.args as {
          challengeId: bigint;
          approved: boolean;
        };
        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ChallengeExecuted',
          timestamp: Date.now(),
          summary: `Challenge #${Number(challengeId)} ${approved ? 'approved' : 'rejected'}.`,
        });
      });
    },
  });

  useWatchContractEvent({
    address: contract.address,
    abi: contract.abi,
    eventName: 'KeeperRegistered',
    onLogs(logs) {
      logs.forEach((log) => {
        const { keeper } = log.args as { keeper: `0x${string}` };
        pushEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'KeeperRegistered',
          timestamp: Date.now(),
          summary: `Keeper ${keeper} registered.`,
          address: keeper,
        });
      });
    },
  });

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.timestamp - a.timestamp),
    [events]
  );

  return { events: sorted };
}
