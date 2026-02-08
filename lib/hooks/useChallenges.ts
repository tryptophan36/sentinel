import { useMemo, useCallback } from 'react';
import { useReadContract, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { useHookdGuardContract } from './useHookdGuardContract';

export type Challenge = {
  id: number;
  suspectedAttacker: string;
  challenger: string;
  evidenceHash: string;
  submitBlock: bigint;
  votesFor: number;
  votesAgainst: number;
  executed: boolean;
  challengerStake: bigint;
};

export function useChallenges(poolId?: `0x${string}`) {
  const contract = useHookdGuardContract();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const countQuery = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'getChallengeCount',
    args: poolId ? [poolId] : undefined,
    query: {
      enabled: Boolean(poolId && contract.address),
      refetchInterval: 12000,
    },
  });

  const count = countQuery.data ? Number(countQuery.data) : 0;

  const challengeReads = useMemo(() => {
    if (!poolId || count === 0) return [];
    return Array.from({ length: count }, (_, index) => ({
      address: contract.address,
      abi: contract.abi,
      functionName: 'getChallenge',
      args: [poolId, BigInt(index)],
    }));
  }, [poolId, count, contract.address, contract.abi]);

  const challengesQuery = useReadContracts({
    contracts: challengeReads,
    query: {
      enabled: challengeReads.length > 0,
      refetchInterval: 12000,
    },
  });

  const challenges = useMemo<Challenge[]>(() => {
    if (!challengesQuery.data) return [];
    return challengesQuery.data
      .map((result, index) => {
        if (!result.result) return null;
        // viem decodes named structs as objects, not arrays
        const r = (result as any)?.result as Record<string, any>;
        return {
          id: index,
          suspectedAttacker: r.suspectedAttacker as string,
          challenger: r.challenger as string,
          evidenceHash: r.evidenceHash as string,
          submitBlock: r.submitBlock as bigint,
          votesFor: Number(r.votesFor),
          votesAgainst: Number(r.votesAgainst),
          executed: r.executed as boolean,
          challengerStake: r.challengerStake as bigint,
        };
      })
      .filter(Boolean) as Challenge[];
  }, [challengesQuery.data]);

  const refetch = useCallback(async () => {
    const { data: newCount } = await countQuery.refetch();
    // If the count changed, challengeReads is stale in this closure.
    // Refetch challenges anyway (helps when count is unchanged, e.g. after vote/execute).
    // For count changes, React re-render will update challengeReads and wagmi auto-fetches.
    if (challengeReads.length > 0) {
      await challengesQuery.refetch();
    }
  }, [countQuery, challengesQuery, challengeReads]);

  const submitChallenge = async (attacker: `0x${string}`, evidence: `0x${string}`) => {
    if (!poolId) throw new Error('Pool id required');
    const hash = await writeContractAsync({
      address: contract.address,
      abi: contract.abi,
      functionName: 'submitChallenge',
      args: [poolId, attacker, evidence],
    });
    // Wait for the transaction to be confirmed on-chain
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    }
    // Refetch challenges so the new one is visible immediately
    await refetch();
    return hash;
  };

  const voteOnChallenge = async (id: number, support: boolean) => {
    if (!poolId) throw new Error('Pool id required');
    const hash = await writeContractAsync({
      address: contract.address,
      abi: contract.abi,
      functionName: 'voteOnChallenge',
      args: [poolId, BigInt(id), support],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    }
    await refetch();
    return hash;
  };

  const executeChallenge = async (id: number) => {
    if (!poolId) throw new Error('Pool id required');
    const hash = await writeContractAsync({
      address: contract.address,
      abi: contract.abi,
      functionName: 'executeChallenge',
      args: [poolId, BigInt(id)],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    }
    await refetch();
    return hash;
  };

  return {
    challengeCount: count,
    challenges,
    isLoading: countQuery.isLoading || challengesQuery.isLoading,
    submitChallenge,
    voteOnChallenge,
    executeChallenge,
    refetch,
  };
}
