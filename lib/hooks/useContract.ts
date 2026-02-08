'use client';

import { getContractAddress } from '@/lib/contracts/addresses';
import { HOOKD_GUARD_ABI } from '@/lib/contracts/hookdGuardABI';
import { useChainId } from 'wagmi';

export function useHookdGuardContract() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, 'hookdGuard');
  
  return {
    address: address as `0x${string}`,
    abi: HOOKD_GUARD_ABI,
  };
}