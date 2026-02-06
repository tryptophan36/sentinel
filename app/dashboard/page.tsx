'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

const pools = [
  {
    id: '0x8a...f12',
    name: 'ETH / USDC',
    status: 'Protected',
    volume: '$18.2M',
    velocity: '1.4x',
    baseline: '1.0x',
    threshold: '1.6x',
  },
  {
    id: '0xb4...9a0',
    name: 'WBTC / ETH',
    status: 'Monitoring',
    volume: '$6.7M',
    velocity: '1.1x',
    baseline: '1.0x',
    threshold: '1.5x',
  },
  {
    id: '0x31...c88',
    name: 'ARB / USDT',
    status: 'Protected',
    volume: '$3.9M',
    velocity: '1.2x',
    baseline: '0.9x',
    threshold: '1.4x',
  },
];

const activityFeed = [
  {
    id: 1,
    type: 'Protection Triggered',
    color: 'bg-red-500/20 text-red-200 border-red-500/30',
    time: '2m ago',
    address: '0xA1f4...91B2',
    reason: 'Velocity spike on ETH/USDC pool',
  },
  {
    id: 2,
    type: 'Challenge Submitted',
    color: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    time: '6m ago',
    address: '0x9B2e...2D91',
    reason: 'Suspected sandwich attempt',
  },
  {
    id: 3,
    type: 'Challenge Executed',
    color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
    time: '18m ago',
    address: '0x44cd...eF10',
    reason: 'Penalty applied to attacker',
  },
  {
    id: 4,
    type: 'Protection Triggered',
    color: 'bg-red-500/20 text-red-200 border-red-500/30',
    time: '26m ago',
    address: '0x90aa...B7f3',
    reason: 'JIT liquidity surge detected',
  },
];

export default function DashboardPage() {
  const [poolId, setPoolId] = useState(pools[0]?.id ?? '');

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === poolId) ?? pools[0],
    [poolId]
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">System Overview</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground max-w-2xl">
          Monitor live protection events, keeper activity, and pool health across the Hook&apos;d Guard network.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="System Status" value="Active" helper="All hooks online" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard title="Attacks Blocked Today" value="128" helper="Last 24h" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard title="Active Keepers" value="42" helper="Across networks" icon={<Activity className="h-5 w-5" />} />
        <StatCard title="Pending Challenges" value="7" helper="Awaiting votes" icon={<AlertTriangle className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live Activity</p>
              <h2 className="text-xl font-semibold">Network Feed</h2>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">Live</span>
          </div>
          <div className="mt-6 space-y-4">
            {activityFeed.map((event) => (
              <div key={event.id} className={`rounded-2xl border ${event.color} p-4`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{event.type}</p>
                  <span className="text-xs text-muted-foreground">{event.time}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{event.reason}</p>
                <p className="mt-3 font-mono text-xs text-foreground">{event.address}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Selector</p>
          <h2 className="text-xl font-semibold">Protected Pools</h2>
          <div className="mt-4">
            <label className="text-sm text-muted-foreground">Choose pool</label>
            <select
              value={poolId}
              onChange={(event) => setPoolId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name} ({pool.id})
                </option>
              ))}
            </select>
          </div>

          {selectedPool && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Status</p>
                <p className="mt-2 text-lg font-semibold">{selectedPool.status}</p>
                <p className="text-sm text-muted-foreground">24h Volume: {selectedPool.volume}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniStat label="Velocity" value={selectedPool.velocity} />
                <MiniStat label="Baseline" value={selectedPool.baseline} />
                <MiniStat label="Threshold" value={selectedPool.threshold} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
