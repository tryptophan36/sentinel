'use client';

import { useMemo, useState, useCallback } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUnits } from 'viem';
import { DEFAULT_POOL_IDS, USDC_ADDRESS, WETH_ADDRESS, POOL_SWAP_TEST_ADDRESS } from '@/lib/constants';
import { usePoolData } from '@/lib/hooks/usePoolData';
import { useSwapHistory } from '@/lib/hooks/useSwapHistory';
import { formatAmount, formatAddress, formatFee } from '@/lib/utils';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Token configuration for the USDC/WETH pool
// In Uniswap V4, tokens are sorted by address: USDC < WETH
const TOKEN_CONFIG = {
  token0: { symbol: 'USDC', decimals: 6, address: USDC_ADDRESS },
  token1: { symbol: 'WETH', decimals: 18, address: WETH_ADDRESS },
} as const;

export default function PoolsPage() {
  const [poolId, setPoolId] = useState<`0x${string}` | ''>(
    (DEFAULT_POOL_IDS[0] as `0x${string}`) ?? ''
  );
  const { state, config, isLoading } = usePoolData(poolId || undefined);
  const { swaps, stats, hasSwaps, isLoadingHistory, fetchError, refetch: refetchSwaps } = useSwapHistory(poolId || undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchSwaps();
    setIsRefreshing(false);
  };

  // Convert raw bigint volumes (18 decimals) to human-readable numbers for the chart
  const chartData = useMemo(() => {
    if (!state || !config) return [];
    const baseline = Number(formatUnits(state.baselineVolume, 18));
    const volume = Number(formatUnits(state.recentVolume, 18));
    const threshold = (baseline * config.velocityMultiplier) / 100;
    return [
      {
        block: Number(state.lastUpdateBlock),
        volume,
        baseline,
        threshold,
      },
    ];
  }, [state, config]);

  const formatChartValue = useCallback((value: number) => {
    if (value === 0) return '0';
    if (value < 0.001) return value.toExponential(2);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, []);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Monitoring</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Pools</h1>
        <p className="text-muted-foreground max-w-2xl">
          Track velocity protection, swap history, and configuration settings for every protected pool.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool List</p>
          <h2 className="text-xl font-semibold">Protected Pools</h2>
          <div className="mt-6 space-y-3">
            {DEFAULT_POOL_IDS.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                Set NEXT_PUBLIC_POOL_IDS to list pools.
              </div>
            )}
            {DEFAULT_POOL_IDS.map((pool, idx) => (
              <button
                key={pool}
                onClick={() => setPoolId(pool)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  pool === poolId
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/60 bg-background/60 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Pool {idx + 1}
                      {idx === 0 && (
                        <span className="ml-2 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 font-normal">
                          Active
                        </span>
                      )}
                      {idx > 0 && (
                        <span className="ml-2 rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 font-normal">
                          Legacy
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{pool}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                    {config?.protectionEnabled ? 'Protected' : 'Disabled'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {poolId && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Velocity Graph</p>
                  <h2 className="text-xl font-semibold font-mono truncate max-w-md" title={poolId}>
                    {formatAddress(poolId)}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  Block window: {config ? `${config.blockWindow} blocks` : '--'}
                </span>
              </div>
              <div className="mt-6 h-64">
                {isLoading || chartData.length === 0 ? (
                  <div className="h-full rounded-2xl border border-dashed border-border/60 flex items-center justify-center text-sm text-muted-foreground">
                    Waiting for pool data...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="block" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={formatChartValue}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1f2937' }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value?: number, name?: string) => [
                          formatChartValue(value ?? 0),
                          (name ?? '').charAt(0).toUpperCase() + (name ?? '').slice(1),
                        ]}
                        labelFormatter={(label) => `Block: ${label}`}
                      />
                      <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot name="volume" />
                      <Line type="monotone" dataKey="baseline" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot name="baseline" />
                      <Line type="monotone" dataKey="threshold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 6" dot name="threshold" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swap History</p>
                    <h2 className="text-xl font-semibold">Recent Swaps</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRefresh}
                      disabled={isRefreshing || isLoadingHistory}
                      className="h-8 w-8 p-0"
                      title="Refresh swap history"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoadingHistory ? 'animate-spin' : ''}`} />
                    </Button>
                    {hasSwaps && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Swaps</p>
                        <p className="text-lg font-semibold">{stats.totalSwaps}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
                  {isLoadingHistory ? (
                    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                      Loading swap history...
                    </div>
                  ) : fetchError ? (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-400">
                      <p className="font-semibold mb-1">Failed to fetch swap history</p>
                      <p className="text-xs text-red-400/80">{fetchError}</p>
                    </div>
                  ) : !hasSwaps ? (
                    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground space-y-3">
                      <p>No swaps found for this pool.</p>
                      <div className="text-xs space-y-1">
                        <p>To generate swap data, run attack simulations:</p>
                        <code className="block bg-black/30 p-2 rounded-lg mt-2">
                          ./run-all-attacks.sh
                        </code>
                      </div>
                    </div>
                  ) : (
                    swaps.slice(0, 20).map((swap) => {
                      const isViaRouter = swap.sender.toLowerCase() === POOL_SWAP_TEST_ADDRESS.toLowerCase();
                      const displayAddr = swap.from !== swap.sender ? swap.from : swap.sender;
                      return (
                        <div
                          key={swap.id}
                          className="rounded-2xl border border-border/60 bg-background/60 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {swap.amount0 < 0n ? (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                              )}
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatAddress(displayAddr)}
                              </span>
                              {isViaRouter && swap.from !== swap.sender && (
                                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                                  via Router
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Fee: {formatFee(swap.fee)}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">{TOKEN_CONFIG.token0.symbol}: </span>
                              <span className={`font-semibold ${swap.amount0 < 0n ? 'text-red-400' : 'text-green-400'}`}>
                                {swap.amount0 < 0n ? '-' : '+'}{formatAmount(swap.amount0 < 0n ? -swap.amount0 : swap.amount0, TOKEN_CONFIG.token0.decimals)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{TOKEN_CONFIG.token1.symbol}: </span>
                              <span className={`font-semibold ${swap.amount1 < 0n ? 'text-red-400' : 'text-green-400'}`}>
                                {swap.amount1 < 0n ? '-' : '+'}{formatAmount(swap.amount1 < 0n ? -swap.amount1 : swap.amount1, TOKEN_CONFIG.token1.decimals)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Block: {swap.blockNumber.toString()}</span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${swap.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition"
                            >
                              View tx &rarr;
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Configuration</p>
                <h2 className="text-xl font-semibold">Protection Settings</h2>
                <div className="mt-6 space-y-3">
                  <ConfigItem label="Velocity Multiplier" value={config ? `${config.velocityMultiplier / 100}x` : '--'} />
                  <ConfigItem label="Block Window" value={config ? `${config.blockWindow} blocks` : '--'} />
                  <ConfigItem label="Surge Fee Multiplier" value={config ? `${config.surgeFeeMultiplier / 100}x` : '--'} />
                  <ConfigItem label="Protection Enabled" value={config ? (config.protectionEnabled ? 'Yes' : 'No') : '--'} />
                  <ConfigItem label="Recent Volume" value={state ? formatAmount(state.recentVolume) : '--'} />
                  <ConfigItem label="Baseline Volume" value={state ? formatAmount(state.baselineVolume) : '--'} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
