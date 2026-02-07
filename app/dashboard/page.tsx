'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, ArrowDownUp } from 'lucide-react';
import { DEFAULT_POOL_IDS } from '@/lib/constants';
import { usePoolData } from '@/lib/hooks/usePoolData';
import { useChallenges } from '@/lib/hooks/useChallenges';
import { useRealtimeActivity } from '@/lib/hooks/useRealtimeActivity';
import { useSwapHistory } from '@/lib/hooks/useSwapHistory';
import { formatAddress, formatAmount } from '@/lib/utils';

export default function DashboardPage() {
  const [poolId, setPoolId] = useState<`0x${string}` | ''>(
    (DEFAULT_POOL_IDS[0] as `0x${string}`) ?? ''
  );
  const { events } = useRealtimeActivity();
  const { state, config } = usePoolData(poolId || undefined);
  const { challenges } = useChallenges(poolId || undefined);
  const { stats: swapStats } = useSwapHistory(poolId || undefined);

  const pendingChallenges = challenges.filter((challenge) => !challenge.executed).length;
  const blockedInSession = events.filter((event) => event.type === 'ProtectionTriggered').length;

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
        <StatCard title="System Status" value="Active" helper="Hook online" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard title="Total Swaps" value={`${swapStats.totalSwaps}`} helper="Selected pool" icon={<ArrowDownUp className="h-5 w-5" />} />
        <StatCard title="Attacks Blocked (session)" value={`${blockedInSession}`} helper="Since open" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard title="Pending Challenges" value={`${pendingChallenges}`} helper="Selected pool" icon={<AlertTriangle className="h-5 w-5" />} />
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
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                No events yet. Trigger a swap or submit a challenge to populate the feed.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className={`rounded-2xl border p-4 ${getEventColor(event.type)}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{event.type}</p>
                    <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{event.summary}</p>
                  {event.address && (
                    <p className="mt-3 font-mono text-xs text-foreground">{formatAddress(event.address)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Selector</p>
          <h2 className="text-xl font-semibold">Protected Pools</h2>
          <div className="mt-4">
            <label className="text-sm text-muted-foreground">Choose pool</label>
            <select
              value={poolId}
              onChange={(event) => setPoolId(event.target.value as `0x${string}`)}
              className="mt-2 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DEFAULT_POOL_IDS.length === 0 ? (
                <option value="">Set NEXT_PUBLIC_POOL_IDS</option>
              ) : (
                DEFAULT_POOL_IDS.map((pool, idx) => (
                  <option key={pool} value={pool}>
                    Pool {idx + 1}{idx === 0 ? ' (Active)' : ' (Legacy)'}: {pool.slice(0, 10)}...{pool.slice(-6)}
                  </option>
                ))
              )}
            </select>
          </div>

          {poolId && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Status</p>
                <p className="mt-2 text-lg font-semibold">{config?.protectionEnabled ? 'Protected' : 'Disabled'}</p>
                <p className="text-sm text-muted-foreground">Recent Volume: {state ? formatAmount(state.recentVolume) : '--'}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniStat label="Velocity Multiplier" value={config ? `${config.velocityMultiplier / 100}x` : '--'} />
                <MiniStat label="Baseline Volume" value={state ? formatAmount(state.baselineVolume) : '--'} />
                <MiniStat label="Block Window" value={config ? `${config.blockWindow} blocks` : '--'} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getEventColor(type: string) {
  switch (type) {
    case 'ProtectionTriggered':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
    case 'ChallengeSubmitted':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/30';
    case 'ChallengeExecuted':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30';
    default:
      return 'bg-slate-500/20 text-slate-200 border-slate-500/30';
  }
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
