import { useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useHookdGuardContract } from './useHookdGuardContract';

export function useKeeper() {
  const { address } = useAccount();
  const contract = useHookdGuardContract();
  const { writeContractAsync, isPending } = useWriteContract();

  const keeperQuery = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: 'getKeeper',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && contract.address),
      refetchInterval: 12000,
    },
  });

  const keeper = useMemo(() => {
    if (!keeperQuery.data) return null;
    const { stake, reputationScore, isActive } = keeperQuery.data;
    // Default struct from Solidity has stake=0 and isActive=false
    // which means the address is NOT a registered keeper
    if (!isActive && stake === 0n) return null;
    return {
      stake,
      reputationScore: Number(reputationScore),
      isActive,
    };
  }, [keeperQuery.data]);

  const registerKeeper = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    if (!contract.address) throw new Error('Hook address not configured');
    return writeContractAsync({
      address: contract.address,
      abi: contract.abi,
      functionName: 'registerKeeper',
      value: parseEther(amount),
      gas: 500000n, // Set reasonable gas limit
    });
  };

  return {
    keeper,
    isLoading: keeperQuery.isLoading,
    isPending,
    registerKeeper,
    isConnected: Boolean(address),
  };
}
