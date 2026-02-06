import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Activity, Users, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Autonomous MEV Defense
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
            Hook&apos;d Guard V2 keeps LPs ahead of MEV.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            A decentralized agent network coordinating through Uniswap v4 hooks to block sandwich attacks,
            JIT liquidity, and velocity spikes before they extract value.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-base">
                Launch Dashboard
              </Button>
            </Link>
            <Link href="/keeper">
              <Button size="lg" variant="secondary" className="text-base">
                Become a Keeper
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">Protection Layers</p>
              <p className="text-lg font-semibold text-foreground">4 Modules</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">Realtime Sync</p>
              <p className="text-lg font-semibold text-foreground">12s Blocks</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em]">Coverage</p>
              <p className="text-lg font-semibold text-foreground">Uniswap v4</p>
            </div>
          </div>
        </div>
        <div className="relative rounded-3xl border border-border/70 bg-card/70 p-8 backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-300/40 to-emerald-400/40 blur-2xl" />
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Live Sentinel</p>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">Active</span>
            </div>
            <div className="space-y-4">
              <Metric label="Attacks Blocked" value="128" helper="Today" />
              <Metric label="Active Keepers" value="42" helper="Across networks" />
              <Metric label="Pending Challenges" value="7" helper="Awaiting votes" />
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Latest Activity</p>
              <p className="mt-2 text-sm text-foreground">
                Protection triggered on ETH/USDC v4 pool. Surge fee applied.
              </p>
              <Link href="/dashboard" className="mt-3 inline-flex items-center text-sm text-primary">
                View dashboard <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={<Shield className="w-6 h-6" />}
          title="Multi-Layer Protection"
          description="Velocity limits, progressive fees, and on-chain challenge enforcement."
        />
        <FeatureCard
          icon={<Activity className="w-6 h-6" />}
          title="Real-Time Monitoring"
          description="Keeper network monitors mempool activity 24/7."
        />
        <FeatureCard
          icon={<Users className="w-6 h-6" />}
          title="Decentralized Coordination"
          description="No single point of failure with distributed keeper consensus."
        />
        <FeatureCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Economically Aligned"
          description="Reputation-weighted rewards for accurate detections."
        />
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/70 p-10 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">Ship safer liquidity today.</h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Launch the dashboard to monitor pool defenses or register as a keeper to help the network
          respond to MEV threats in real time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">Launch Dashboard</Button>
          </Link>
          <Link href="/keeper">
            <Button size="lg" variant="secondary">Become a Keeper</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background/70 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <span className="text-xs text-muted-foreground">{helper}</span>
    </div>
  );
}
