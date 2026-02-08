'use client';

import { useEffect, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { useHookdGuardContract } from './useContract';

export interface ActivityEvent {
  id: string;
  type: 'protection' | 'challenge' | 'vote' | 'execution';
  timestamp: number;
  data: any;
}

export function useRealtimeActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const contract = useHookdGuardContract();
  
  // Watch ProtectionTriggered events
  useWatchContractEvent({
    ...contract,
    eventName: 'ProtectionTriggered',
    onLogs: (logs) => {
      logs.forEach((log) => {
        setEvents((prev) => [
          {
            id: log.transactionHash || `${log.blockHash}-${log.logIndex}`,
            type: 'protection',
            timestamp: Date.now(),
            data: log,
          },
          ...prev.slice(0, 49), // Keep last 50
        ]);
      });
    },
  });
  
  // Watch ChallengeSubmitted events
  useWatchContractEvent({
    ...contract,
    eventName: 'ChallengeSubmitted',
    onLogs: (logs) => {
      logs.forEach((log) => {
        setEvents((prev) => [
          {
            id: log.transactionHash || `${log.blockHash}-${log.logIndex}`,
            type: 'challenge',
            timestamp: Date.now(),
            data: log,
          },
          ...prev.slice(0, 49),
        ]);
      });
    },
  });
  
  return events;
}