'use client';

import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const poolData = [
  {
    id: '0x8a...f12',
    name: 'ETH / USDC',
    status: 'Protected',
    velocityMultiplier: '1.6x',
    blockWindow: '12 blocks',
    surgeFee: '2.4x',
    swaps: [
      { block: 5589021, address: '0xA1f4...91B2', amount: '52 ETH', fee: '0.32%' },
      { block: 5589018, address: '0x9B2e...2D91', amount: '118k USDC', fee: '0.25%' },
      { block: 5589013, address: '0x44cd...eF10', amount: '37 ETH', fee: '0.30%' },
    ],
    velocity: [
      { block: 5588998, volume: 14, baseline: 10, threshold: 16 },
      { block: 5588999, volume: 12, baseline: 10, threshold: 16 },
      { block: 5589000, volume: 15, baseline: 10, threshold: 16 },
      { block: 5589001, volume: 16, baseline: 10, threshold: 16 },
      { block: 5589002, volume: 13, baseline: 10, threshold: 16 },
      { block: 5589003, volume: 18, baseline: 10, threshold: 16 },
      { block: 5589004, volume: 14, baseline: 10, threshold: 16 },
    ],
  },
  {
    id: '0xb4...9a0',
    name: 'WBTC / ETH',
    status: 'Monitoring',
    velocityMultiplier: '1.5x',
    blockWindow: '10 blocks',
    surgeFee: '2.0x',
    swaps: [
      { block: 5589019, address: '0x31ad...55e0', amount: '8 WBTC', fee: '0.28%' },
      { block: 5589014, address: '0x72c9...1A0F', amount: '21 ETH', fee: '0.24%' },
      { block: 5589011, address: '0xa023...77be', amount: '5 WBTC', fee: '0.21%' },
    ],
    velocity: [
      { block: 5588998, volume: 6, baseline: 5, threshold: 9 },
      { block: 5588999, volume: 7, baseline: 5, threshold: 9 },
      { block: 5589000, volume: 5, baseline: 5, threshold: 9 },
      { block: 5589001, volume: 8, baseline: 5, threshold: 9 },
      { block: 5589002, volume: 6, baseline: 5, threshold: 9 },
      { block: 5589003, volume: 9, baseline: 5, threshold: 9 },
      { block: 5589004, volume: 7, baseline: 5, threshold: 9 },
    ],
  },
  {
    id: '0x31...c88',
    name: 'ARB / USDT',
    status: 'Protected',
    velocityMultiplier: '1.4x',
    blockWindow: '14 blocks',
    surgeFee: '2.2x',
    swaps: [
      { block: 5589017, address: '0x90aa...B7f3', amount: '42k ARB', fee: '0.31%' },
      { block: 5589012, address: '0x44df...9C01', amount: '76k USDT', fee: '0.27%' },
      { block: 5589009, address: '0x2E9b...11a5', amount: '31k ARB', fee: '0.29%' },
    ],
    velocity: [
      { block: 5588998, volume: 9, baseline: 7, threshold: 12 },
      { block: 5588999, volume: 8, baseline: 7, threshold: 12 },
      { block: 5589000, volume: 10, baseline: 7, threshold: 12 },
      { block: 5589001, volume: 11, baseline: 7, threshold: 12 },
      { block: 5589002, volume: 12, baseline: 7, threshold: 12 },
      { block: 5589003, volume: 9, baseline: 7, threshold: 12 },
      { block: 5589004, volume: 8, baseline: 7, threshold: 12 },
    ],
  },
];

export default function PoolsPage() {
  const [poolId, setPoolId] = useState(poolData[0]?.id ?? '');

  const selectedPool = useMemo(
    () => poolData.find((pool) => pool.id === poolId) ?? poolData[0],
    [poolId]
  );

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
            {poolData.map((pool) => (
              <button
                key={pool.id}
                onClick={() => setPoolId(pool.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  pool.id === poolId
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/60 bg-background/60 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{pool.name}</p>
                    <p className="text-xs text-muted-foreground">{pool.id}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                    {pool.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedPool && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Velocity Graph</p>
                  <h2 className="text-xl font-semibold">{selectedPool.name}</h2>
                </div>
                <span className="text-xs text-muted-foreground">Block window: {selectedPool.blockWindow}</span>
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedPool.velocity}>
                    <XAxis dataKey="block" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1f2937' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="baseline" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="threshold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swap History</p>
                <h2 className="text-xl font-semibold">Recent Swaps</h2>
                <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background/70 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Block</th>
                        <th className="px-4 py-3 font-medium">Address</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Fee Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPool.swaps.map((swap) => (
                        <tr key={swap.block} className="border-t border-border/60">
                          <td className="px-4 py-3">{swap.block}</td>
                          <td className="px-4 py-3 font-mono">{swap.address}</td>
                          <td className="px-4 py-3">{swap.amount}</td>
                          <td className="px-4 py-3">{swap.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Configuration</p>
                <h2 className="text-xl font-semibold">Protection Settings</h2>
                <div className="mt-6 space-y-3">
                  <ConfigItem label="Velocity Multiplier" value={selectedPool.velocityMultiplier} />
                  <ConfigItem label="Block Window" value={selectedPool.blockWindow} />
                  <ConfigItem label="Surge Fee Multiplier" value={selectedPool.surgeFee} />
                  <ConfigItem label="Protection Enabled" value="Yes" />
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
