import { useState, useCallback } from 'react';
import { useAccount, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { poolSwapTestAbi, erc20Abi } from '@/lib/abi/poolSwapTest';
import {
  HOOK_ADDRESS,
  POOL_SWAP_TEST_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
} from '@/lib/constants';

export type SwapDirection = 'USDC_TO_WETH' | 'WETH_TO_USDC';

export type TxStatus = {
  step: string;
  status: 'pending' | 'confirming' | 'success' | 'error';
  hash?: `0x${string}`;
  error?: string;
};

// Pool key for our USDC/WETH pool
// Fee must be DYNAMIC_FEE_FLAG (0x800000) so the hook can override fees per-swap
const DYNAMIC_FEE_FLAG = 0x800000;
const POOL_KEY = {
  currency0: USDC_ADDRESS,
  currency1: WETH_ADDRESS,
  fee: DYNAMIC_FEE_FLAG,
  tickSpacing: 120,
  hooks: HOOK_ADDRESS,
} as const;

const TEST_SETTINGS = {
  takeClaims: false,
  settleUsingBurn: false,
} as const;

export function useSwapExecutor() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [txLog, setTxLog] = useState<TxStatus[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Read token balances and allowances
  const tokensQuery = useReadContracts({
    contracts: [
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined },
      { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: address ? [address, POOL_SWAP_TEST_ADDRESS] : undefined },
      { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: address ? [address, POOL_SWAP_TEST_ADDRESS] : undefined },
    ],
    query: {
      enabled: Boolean(address),
      refetchInterval: 10000,
    },
  });

  const usdcBalance = tokensQuery.data?.[0]?.result as bigint | undefined;
  const wethBalance = tokensQuery.data?.[1]?.result as bigint | undefined;
  const usdcAllowance = tokensQuery.data?.[2]?.result as bigint | undefined;
  const wethAllowance = tokensQuery.data?.[3]?.result as bigint | undefined;

  const addLog = useCallback((entry: TxStatus) => {
    setTxLog((prev) => [...prev, entry]);
  }, []);

  const updateLastLog = useCallback((update: Partial<TxStatus>) => {
    setTxLog((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...update };
      }
      return copy;
    });
  }, []);

  const waitForTx = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) return;
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    },
    [publicClient]
  );

  // Approve tokens for PoolSwapTest
  const approveTokens = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    setIsExecuting(true);
    setTxLog([]);

    try {
      // Approve USDC
      addLog({ step: 'Approving USDC...', status: 'pending' });
      const usdcHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [POOL_SWAP_TEST_ADDRESS, maxUint256],
      });
      updateLastLog({ status: 'confirming', hash: usdcHash });
      await waitForTx(usdcHash);
      updateLastLog({ status: 'success' });

      // Approve WETH
      addLog({ step: 'Approving WETH...', status: 'pending' });
      const wethHash = await writeContractAsync({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [POOL_SWAP_TEST_ADDRESS, maxUint256],
      });
      updateLastLog({ status: 'confirming', hash: wethHash });
      await waitForTx(wethHash);
      updateLastLog({ status: 'success' });

      tokensQuery.refetch();
    } catch (err: any) {
      updateLastLog({ status: 'error', error: err?.shortMessage || err?.message || 'Approval failed' });
    } finally {
      setIsExecuting(false);
    }
  }, [address, writeContractAsync, waitForTx, addLog, updateLastLog, tokensQuery]);

  // Execute a single swap
  const executeSwap = useCallback(
    async (direction: SwapDirection, amount: string) => {
      if (!address) throw new Error('Wallet not connected');
      setIsExecuting(true);

      const zeroForOne = direction === 'USDC_TO_WETH';
      const decimals = zeroForOne ? 6 : 18;
      const tokenName = zeroForOne ? 'USDC' : 'WETH';
      const targetName = zeroForOne ? 'WETH' : 'USDC';
      const rawAmount = parseUnits(amount, decimals);

      const label = `Swapping ${amount} ${tokenName} → ${targetName}`;
      addLog({ step: label, status: 'pending' });

      try {
        const hash = await writeContractAsync({
          address: POOL_SWAP_TEST_ADDRESS,
          abi: poolSwapTestAbi,
          functionName: 'swap',
          args: [
            POOL_KEY,
            {
              zeroForOne,
              amountSpecified: -rawAmount, // Negative = exact input
              sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_RATIO : MAX_SQRT_RATIO,
            },
            TEST_SETTINGS,
            '0x',
          ],
        });
        updateLastLog({ status: 'confirming', hash });
        await waitForTx(hash);
        updateLastLog({ status: 'success' });
        tokensQuery.refetch();
        return hash;
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || 'Swap failed';
        updateLastLog({ status: 'error', error: msg });
        throw err;
      } finally {
        setIsExecuting(false);
      }
    },
    [address, writeContractAsync, waitForTx, addLog, updateLastLog, tokensQuery]
  );

  // Attack pattern: Wash Trading (rapid USDC→WETH swaps)
  const attackWashTrading = useCallback(
    async (rounds: number = 6) => {
      if (!address) throw new Error('Wallet not connected');
      setIsExecuting(true);
      setTxLog([]);

      try {
        for (let i = 0; i < rounds; i++) {
          const amount = '15';
          const rawAmount = parseUnits(amount, 6);

          addLog({ step: `Wash #${i + 1}: ${amount} USDC → WETH`, status: 'pending' });

          const hash = await writeContractAsync({
            address: POOL_SWAP_TEST_ADDRESS,
            abi: poolSwapTestAbi,
            functionName: 'swap',
            args: [
              POOL_KEY,
              {
                zeroForOne: true,
                amountSpecified: -rawAmount,
                sqrtPriceLimitX96: MIN_SQRT_RATIO,
              },
              TEST_SETTINGS,
              '0x',
            ],
          });
          updateLastLog({ status: 'confirming', hash });
          await waitForTx(hash);
          updateLastLog({ status: 'success' });
        }
        tokensQuery.refetch();
      } catch (err: any) {
        updateLastLog({ status: 'error', error: err?.shortMessage || err?.message || 'Attack simulation failed' });
      } finally {
        setIsExecuting(false);
      }
    },
    [address, writeContractAsync, waitForTx, addLog, updateLastLog, tokensQuery]
  );

  // Attack pattern: Volume Spike (large USDC swaps to exceed velocity)
  const attackVolumeSpike = useCallback(
    async (rounds: number = 5) => {
      if (!address) throw new Error('Wallet not connected');
      setIsExecuting(true);
      setTxLog([]);

      try {
        for (let i = 0; i < rounds; i++) {
          const rawAmount = parseUnits('100', 6);
          addLog({ step: `Volume Spike #${i + 1}: 100 USDC → WETH`, status: 'pending' });

          const hash = await writeContractAsync({
            address: POOL_SWAP_TEST_ADDRESS,
            abi: poolSwapTestAbi,
            functionName: 'swap',
            args: [
              POOL_KEY,
              {
                zeroForOne: true,
                amountSpecified: -rawAmount,
                sqrtPriceLimitX96: MIN_SQRT_RATIO,
              },
              TEST_SETTINGS,
              '0x',
            ],
          });
          updateLastLog({ status: 'confirming', hash });
          await waitForTx(hash);
          updateLastLog({ status: 'success' });
        }
        tokensQuery.refetch();
      } catch (err: any) {
        updateLastLog({ status: 'error', error: err?.shortMessage || err?.message || 'Attack simulation failed' });
      } finally {
        setIsExecuting(false);
      }
    },
    [address, writeContractAsync, waitForTx, addLog, updateLastLog, tokensQuery]
  );

  // Attack pattern: Sandwich Attack (realistic: front-run buy, victim buy, back-run sell)
  const attackSandwich = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    setIsExecuting(true);
    setTxLog([]);

    // Realistic sandwich: attacker buys before victim, then sells after
    const steps: { label: string; amount: string; zeroForOne: boolean; decimals: number }[] = [
      { label: 'Front-run: 50 USDC → WETH (attacker buys)', amount: '50', zeroForOne: true, decimals: 6 },
      { label: 'Victim swap: 20 USDC → WETH', amount: '20', zeroForOne: true, decimals: 6 },
      { label: 'Back-run: 0.02 WETH → USDC (attacker sells)', amount: '0.02', zeroForOne: false, decimals: 18 },
    ];

    try {
      for (const step of steps) {
        const rawAmount = parseUnits(step.amount, step.decimals);
        addLog({ step: step.label, status: 'pending' });

        const hash = await writeContractAsync({
          address: POOL_SWAP_TEST_ADDRESS,
          abi: poolSwapTestAbi,
          functionName: 'swap',
          args: [
            POOL_KEY,
            {
              zeroForOne: step.zeroForOne,
              amountSpecified: -rawAmount,
              sqrtPriceLimitX96: step.zeroForOne ? MIN_SQRT_RATIO : MAX_SQRT_RATIO,
            },
            TEST_SETTINGS,
            '0x',
          ],
        });
        updateLastLog({ status: 'confirming', hash });
        await waitForTx(hash);
        updateLastLog({ status: 'success' });
      }
      tokensQuery.refetch();
    } catch (err: any) {
      updateLastLog({ status: 'error', error: err?.shortMessage || err?.message || 'Sandwich simulation failed' });
    } finally {
      setIsExecuting(false);
    }
  }, [address, writeContractAsync, waitForTx, addLog, updateLastLog, tokensQuery]);

  const clearLog = useCallback(() => setTxLog([]), []);

  const needsApproval =
    (usdcAllowance !== undefined && usdcAllowance === 0n) ||
    (wethAllowance !== undefined && wethAllowance === 0n);

  return {
    // State
    isExecuting,
    txLog,
    needsApproval,
    // Balances
    usdcBalance,
    wethBalance,
    usdcAllowance,
    wethAllowance,
    // Actions
    approveTokens,
    executeSwap,
    attackWashTrading,
    attackVolumeSpike,
    attackSandwich,
    clearLog,
    refetchBalances: tokensQuery.refetch,
  };
}
