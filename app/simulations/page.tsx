'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Zap,
  ArrowDownUp,
  Users,
} from 'lucide-react';
import { DEFAULT_POOL_IDS } from '@/lib/constants';
import { usePoolData } from '@/lib/hooks/usePoolData';
import { useSwapHistory } from '@/lib/hooks/useSwapHistory';
import { useProtectionHistory } from '@/lib/hooks/useProtectionHistory';
import { useChallenges } from '@/lib/hooks/useChallenges';
import { formatAmount, formatAddress, formatFee } from '@/lib/utils';

export default function SimulationsPage() {
  const [poolId, setPoolId] = useState<`0x${string}` | ''>(
    (DEFAULT_POOL_IDS[0] as `0x${string}`) ?? ''
  );
  const { state, config } = usePoolData(poolId || undefined);
  const { swaps, stats: swapStats, hasSwaps, isLoadingHistory } = useSwapHistory(poolId || undefined);
  const {
    events: protectionEvents,
    stats: protectionStats,
    isLoading: isLoadingProtection,
    hasEvents: hasProtectionEvents,
  } = useProtectionHistory(poolId || undefined);
  const { challenges } = useChallenges(poolId || undefined);

  // Compute protection rate from on-chain data
  const protectionRate =
    swapStats.totalSwaps > 0
      ? (protectionStats.totalBlocked / swapStats.totalSwaps) * 100
      : 0;

  // Identify which swaps had elevated fees (protection triggered)
  const protectedSwaps = useMemo(() => {
    return swaps.filter((s) => s.fee > 3000); // Base fee is 3000 pips (0.3%)
  }, [swaps]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Attack Testing
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold">Simulation Results</h1>
        <p className="text-muted-foreground max-w-2xl">
          Live on-chain results from attack simulations. Every swap, protection event, and
          challenge below is a real Sepolia transaction.
        </p>
      </header>

      {/* Pool Selector */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <label className="text-sm text-muted-foreground">Select Pool</label>
        <select
          value={poolId}
          onChange={(event) => setPoolId(event.target.value as `0x${string}`)}
          className="mt-2 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DEFAULT_POOL_IDS.length === 0 ? (
            <option value="">Set NEXT_PUBLIC_POOL_IDS</option>
          ) : (
            DEFAULT_POOL_IDS.map((pool) => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))
          )}
        </select>
      </section>

      {/* ── Overview Stats ────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Swaps"
          value={swapStats.totalSwaps.toString()}
          helper="On-chain swaps recorded"
          icon={<ArrowDownUp className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Protection Triggered"
          value={protectionStats.totalBlocked.toString()}
          helper="Attacks detected & blocked"
          icon={<ShieldAlert className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Elevated Fee Swaps"
          value={protectedSwaps.length.toString()}
          helper={`Swaps with fee > 0.30%`}
          icon={<Shield className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Active Challenges"
          value={challenges.filter((c) => !c.executed).length.toString()}
          helper="Pending keeper votes"
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
      </section>

      {/* ── Protection Event Log ──────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                On-Chain Evidence
              </p>
              <h2 className="text-xl font-semibold">Protection Events</h2>
            </div>
            {hasProtectionEvents && (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                {protectionStats.totalBlocked} blocked
              </span>
            )}
          </div>

          <div className="mt-6 space-y-3 max-h-[28rem] overflow-y-auto">
            {isLoadingProtection ? (
              <Placeholder text="Scanning chain for ProtectionTriggered events..." />
            ) : !hasProtectionEvents ? (
              <Placeholder text="No protection events found yet. Run attack simulations to generate them." />
            ) : (
              protectionEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-300">
                        Attack Blocked
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Block {ev.blockNumber.toString()}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Attacker: </span>
                      <span className="font-mono">{formatAddress(ev.swapper)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Surge Fee: </span>
                      <span className="font-semibold text-red-300">
                        {formatFee(ev.fee)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${ev.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition"
                    >
                      View tx on Etherscan &rarr;
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Swap History with Fee Highlighting ─────────────────── */}
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Swap Feed
              </p>
              <h2 className="text-xl font-semibold">Recent Swaps</h2>
            </div>
            {hasSwaps && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                {swapStats.totalSwaps} total
              </span>
            )}
          </div>

          <div className="mt-6 space-y-3 max-h-[28rem] overflow-y-auto">
            {isLoadingHistory ? (
              <Placeholder text="Loading swap history..." />
            ) : !hasSwaps ? (
              <Placeholder text="No swaps found. Run simulations to populate." />
            ) : (
              swaps.slice(0, 20).map((swap) => {
                const isElevated = swap.fee > 3000;
                return (
                  <div
                    key={swap.id}
                    className={`rounded-2xl border p-3 ${
                      isElevated
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-border/60 bg-background/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatAddress(swap.sender)}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isElevated ? 'text-amber-300' : 'text-muted-foreground'
                        }`}
                      >
                        Fee: {formatFee(swap.fee)}
                        {isElevated && ' (surge)'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Block {swap.blockNumber.toString()}</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${swap.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition"
                      >
                        tx &rarr;
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── Attack Scenario Cards ─────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Attack Scenarios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Each scenario runs a Foundry script that broadcasts real transactions on
            Sepolia.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AttackScenarioCard
            title="Wash Trading"
            description="8 rapid buy/sell swaps from same address. Progressive fees escalate +20% per swap."
            command="PHASE=1 forge script script/SimulateAttacks.s.sol --rpc-url $RPC --broadcast -vv"
            expected="Fees climb from 0.30% to ~0.78% by swap 8. ProtectionTriggered events emitted."
            layer="Layer 2: Progressive Fees"
            status={swapStats.totalSwaps >= 8 ? 'tested' : 'pending'}
          />
          <AttackScenarioCard
            title="Sandwich Attack"
            description="Front-run (50 USDC buy), victim swap, back-run (0.02 WETH sell), extract (30 USDC)."
            command="PHASE=3 forge script script/SimulateAttacks.s.sol --rpc-url $RPC --broadcast -vv"
            expected="Steps 3-4 hit velocity + progressive fees. Attacker profits erased by surge fee."
            layer="Layer 1 + 2"
            status={swapStats.totalSwaps >= 3 ? 'tested' : 'pending'}
          />
          <AttackScenarioCard
            title="Volume Spike"
            description="5 consecutive 0.05 WETH swaps within the 10-block window to exceed 3x velocity limit."
            command="PHASE=2 forge script script/SimulateAttacks.s.sol --rpc-url $RPC --broadcast -vv"
            expected="Volume exceeds baseline x3. Surge fee applied, ProtectionTriggered emitted."
            layer="Layer 1: Velocity"
            status={protectionStats.totalBlocked > 0 ? 'tested' : 'pending'}
          />
          <AttackScenarioCard
            title="Keeper Challenge"
            description="Register as keeper, submit challenge against attacker address, vote and execute."
            command="PHASE=4 && PHASE=5 (run sequentially)"
            expected="Keeper registered, challenge submitted, penalty applied after vote."
            layer="Layer 3: Challenge"
            status={challenges.length > 0 ? 'tested' : 'pending'}
          />
        </div>
      </section>

      {/* ── Pool State ────────────────────────────────────────────── */}
      {poolId && state && config && (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold mb-4">Current Pool State</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <StateItem label="Recent Volume" value={formatAmount(state.recentVolume)} />
            <StateItem
              label="Baseline Volume"
              value={formatAmount(state.baselineVolume)}
            />
            <StateItem
              label="Velocity Limit (3x)"
              value={formatAmount(
                (state.baselineVolume * BigInt(config.velocityMultiplier)) / 100n
              )}
            />
            <StateItem
              label="Block Window"
              value={`${config.blockWindow} blocks`}
            />
            <StateItem
              label="Last Update"
              value={`Block ${state.lastUpdateBlock.toString()}`}
            />
            <StateItem
              label="Protection"
              value={config.protectionEnabled ? 'Active' : 'Disabled'}
              highlight={config.protectionEnabled}
            />
          </div>
        </section>
      )}

      {/* ── How To Run ────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold mb-4">Run Simulations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Step
            num="1"
            title="Export Env"
            code="set -a && source .env.local && set +a"
          />
          <Step
            num="2"
            title="Normal Swaps"
            code="PHASE=0 forge script script/SimulateAttacks.s.sol --rpc-url $NEXT_PUBLIC_SEPOLIA_RPC --broadcast -vv"
          />
          <Step
            num="3"
            title="Wash Trading"
            code="PHASE=1 forge script script/SimulateAttacks.s.sol --rpc-url $NEXT_PUBLIC_SEPOLIA_RPC --broadcast -vv"
          />
          <Step
            num="4"
            title="Keeper + Challenge"
            code="PHASE=4 forge script script/SimulateAttacks.s.sol --rpc-url $NEXT_PUBLIC_SEPOLIA_RPC --broadcast -vv && PHASE=5 forge script script/SimulateAttacks.s.sol --rpc-url $NEXT_PUBLIC_SEPOLIA_RPC --broadcast -vv"
          />
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StatCard({
  title,
  value,
  helper,
  icon,
  color,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'amber';
}) {
  const colorClasses = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className={colorClasses[color]}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function AttackScenarioCard({
  title,
  description,
  command,
  expected,
  layer,
  status,
}: {
  title: string;
  description: string;
  command: string;
  expected: string;
  layer: string;
  status: 'pending' | 'tested';
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur ${
        status === 'tested'
          ? 'border-green-500/40 bg-green-500/5'
          : 'border-border/60 bg-card/70'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">{title}</h3>
        {status === 'tested' ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <span className="inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary mb-3">
        {layer}
      </span>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Command:</p>
          <code className="text-[11px] bg-black/30 p-2 rounded block break-all">
            {command}
          </code>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Expected result:</p>
          <p className="text-xs">{expected}</p>
        </div>
      </div>
    </div>
  );
}

function StateItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-green-400' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function Step({ num, title, code }: { num: string; title: string; code: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
      <h3 className="font-semibold mb-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs text-primary mr-2">
          {num}
        </span>
        {title}
      </h3>
      <code className="text-[11px] text-muted-foreground block bg-black/30 p-3 rounded-lg break-all">
        {code}
      </code>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
