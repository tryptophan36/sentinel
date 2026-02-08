import { hookdGuardAbi } from '@/lib/abi/hookdGuard';
import { HOOK_ADDRESS } from '@/lib/constants';

export function useHookdGuardContract() {
  return {
    address: HOOK_ADDRESS,
    abi: hookdGuardAbi,
  };
}
