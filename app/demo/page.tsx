'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBlockNumber } from 'wagmi';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  ShieldAlert,
  Swords,
  Wallet,
  XCircle,
  Zap,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useSwapExecutor, type SwapDirection, type TxStatus } from '@/lib/hooks/useSwapExecutor';
import { useChallenges } from '@/lib/hooks/useChallenges';
import { useKeeper } from '@/lib/hooks/useKeeper';
import { usePoolData } from '@/lib/hooks/usePoolData';
import { DEFAULT_POOL_IDS } from '@/lib/constants';
import { formatAddress, formatAmount } from '@/lib/utils';

export default function DemoPage() {
  const { address, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const poolId = (DEFAULT_POOL_IDS[0] || '') as `0x${string}`;

  const swap = useSwapExecutor();
  const challenges = useChallenges(poolId || undefined);
  const keeper = useKeeper();
  const pool = usePoolData(poolId || undefined);

  // Swap form
  const [swapAmount, setSwapAmount] = useState('10');
  const [swapDirection, setSwapDirection] = useState<SwapDirection>('USDC_TO_WETH');

  // Challenge form
  const [attackerAddr, setAttackerAddr] = useState('0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe');
  const [evidenceNote, setEvidenceNote] = useState('wash-trading-evidence');
  const [challengeStatus, setChallengeStatus] = useState<string | null>(null);

  const handleSwap = async () => {
    try {
      await swap.executeSwap(swapDirection, swapAmount);
    } catch {}
  };

  const handleSubmitChallenge = async () => {
    try {
      setChallengeStatus('Submitting challenge...');
      // Hash the evidence note to get a bytes32
      const encoder = new TextEncoder();
      const data = encoder.encode(evidenceNote);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const evidenceHash = ('0x' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      await challenges.submitChallenge(attackerAddr as `0x${string}`, evidenceHash);
      setChallengeStatus('Challenge submitted successfully!');
    } catch (err: any) {
      setChallengeStatus(`Error: ${err?.shortMessage || err?.message || 'Failed'}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Interactive Demo
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold">Live Attack Simulator</h1>
        <p className="text-muted-foreground max-w-2xl">
          Execute real on-chain swaps and attack patterns, then watch Hook&apos;d Guard&apos;s 3-layer protection respond in real-time.
        </p>
      </header>

      {/* Wallet & Token Status */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Setup</p>
            <h2 className="text-xl font-semibold">Wallet & Tokens</h2>
          </div>
          <ConnectButton />
        </div>

        {isConnected && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">USDC Balance</p>
              <p className="text-lg font-semibold">
                {swap.usdcBalance !== undefined ? formatUnits(swap.usdcBalance, 6) : '--'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Allowance: {swap.usdcAllowance !== undefined && swap.usdcAllowance > 0n ? 'Approved' : 'Not approved'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">WETH Balance</p>
              <p className="text-lg font-semibold">
                {swap.wethBalance !== undefined ? Number(formatUnits(swap.wethBalance, 18)).toFixed(6) : '--'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Allowance: {swap.wethAllowance !== undefined && swap.wethAllowance > 0n ? 'Approved' : 'Not approved'}
              </p>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant={swap.needsApproval ? 'default' : 'secondary'}
                onClick={swap.approveTokens}
                disabled={swap.isExecuting}
              >
                {swap.isExecuting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                {swap.needsApproval ? 'Approve Tokens' : 'Re-Approve Tokens'}
              </Button>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Connect your wallet to start the demo. Make sure you have Sepolia USDC and WETH.
          </div>
        )}
      </section>

      {/* Pool State (compact) */}
      {pool.state && pool.config && (
        <section className="grid gap-4 md:grid-cols-4">
          <MiniStat label="Recent Volume" value={formatAmount(pool.state.recentVolume)} />
          <MiniStat label="Baseline Volume" value={formatAmount(pool.state.baselineVolume)} />
          <MiniStat
            label="Velocity Limit (3x)"
            value={formatAmount(
              (pool.state.baselineVolume * BigInt(pool.config.velocityMultiplier)) / 100n
            )}
          />
          <MiniStat label="Current Block" value={blockNumber?.toString() || '--'} />
        </section>
      )}

      {/* Main Grid: Swap + Attacks */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Single Swap */}
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 1</p>
              <h2 className="text-xl font-semibold">Execute Swap</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Execute a single swap to demonstrate normal operation. Repeated swaps will trigger progressive fees.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Direction</label>
              <select
                value={swapDirection}
                onChange={(e) => setSwapDirection(e.target.value as SwapDirection)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="USDC_TO_WETH">USDC → WETH</option>
                <option value="WETH_TO_USDC">WETH → USDC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Amount ({swapDirection === 'USDC_TO_WETH' ? 'USDC' : 'WETH'})
              </label>
              <input
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={swapDirection === 'USDC_TO_WETH' ? '10' : '0.005'}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSwap}
              disabled={!isConnected || swap.isExecuting}
            >
              {swap.isExecuting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Execute Swap
            </Button>
          </div>
        </section>

        {/* Attack Patterns */}
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 2</p>
              <h2 className="text-xl font-semibold">Attack Patterns</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Simulate real MEV attacks. Each pattern fires multiple swaps and triggers different protection layers.
          </p>

          <div className="space-y-3">
            <AttackButton
              title="Wash Trading"
              description="6 rapid 15 USDC → WETH swaps → Progressive fees escalate"
              layer="Layer 2"
              onClick={() => swap.attackWashTrading(6)}
              disabled={!isConnected || swap.isExecuting}
              isExecuting={swap.isExecuting}
              color="amber"
            />
            <AttackButton
              title="Volume Spike"
              description="5 large 100 USDC → WETH swaps → Velocity protection triggers"
              layer="Layer 1"
              onClick={() => swap.attackVolumeSpike(5)}
              disabled={!isConnected || swap.isExecuting}
              isExecuting={swap.isExecuting}
              color="red"
            />
            <AttackButton
              title="Sandwich Attack"
              description="Front-run (50) + victim (20) + back-run (80) USDC → WETH → Multi-layer protection"
              layer="Layer 1+2"
              onClick={swap.attackSandwich}
              disabled={!isConnected || swap.isExecuting}
              isExecuting={swap.isExecuting}
              color="purple"
            />
          </div>
        </section>
      </div>

      {/* Challenge System */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 3</p>
            <h2 className="text-xl font-semibold">Keeper Challenge System</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Submit a challenge against a suspected attacker. Requires keeper registration.
          {keeper.keeper ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Keeper Active
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
              <AlertTriangle className="h-3 w-3" /> Not a Keeper
            </span>
          )}
        </p>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Suspected Attacker Address</label>
              <input
                value={attackerAddr}
                onChange={(e) => setAttackerAddr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Evidence Note</label>
              <input
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="wash-trading-evidence"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmitChallenge}
              disabled={!isConnected || !keeper.keeper}
            >
              <Shield className="h-4 w-4 mr-2" />
              Submit Challenge
            </Button>
            {!keeper.keeper && isConnected && (
              <p className="text-xs text-amber-400">
                Register as a keeper first on the <a href="/keeper" className="underline">Keeper page</a>.
              </p>
            )}
            {challengeStatus && (
              <div className={`rounded-xl border p-3 text-sm ${
                challengeStatus.startsWith('Error')
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}>
                {challengeStatus}
              </div>
            )}
          </div>

          {/* Active Challenges */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Active Challenges ({challenges.challenges.filter(c => !c.executed).length})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {challenges.challenges.filter(c => !c.executed).length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No active challenges
                </div>
              )}
              {challenges.challenges
                .filter((c) => !c.executed)
                .map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Challenge #{c.id}</span>
                      <span className="text-amber-300">
                        {c.votesFor}v / {c.votesAgainst}a
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      Target: {formatAddress(c.suspectedAttacker)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-xs"
                        onClick={() => challenges.voteOnChallenge(c.id, true)}
                      >
                        Vote For
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-xs"
                        onClick={() => challenges.voteOnChallenge(c.id, false)}
                      >
                        Against
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs border border-border/60"
                        onClick={() => challenges.executeChallenge(c.id)}
                      >
                        Execute
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Transaction Log */}
      {swap.txLog.length > 0 && (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Transaction Log
              </p>
              <h2 className="text-xl font-semibold">Live Results</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={swap.clearLog}>
              Clear
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {swap.txLog.map((tx, i) => (
              <TxLogEntry key={i} tx={tx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

function AttackButton({
  title,
  description,
  layer,
  onClick,
  disabled,
  isExecuting,
  color,
}: {
  title: string;
  description: string;
  layer: string;
  onClick: () => void;
  disabled: boolean;
  isExecuting: boolean;
  color: 'amber' | 'red' | 'purple';
}) {
  const colors = {
    amber: 'border-amber-500/40 hover:border-amber-500/60 hover:bg-amber-500/5',
    red: 'border-red-500/40 hover:border-red-500/60 hover:bg-red-500/5',
    purple: 'border-purple-500/40 hover:border-purple-500/60 hover:bg-purple-500/5',
  };
  const layerColors = {
    amber: 'bg-amber-500/20 text-amber-300',
    red: 'bg-red-500/20 text-red-300',
    purple: 'bg-purple-500/20 text-purple-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${layerColors[color]}`}>
          {layer}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {isExecuting && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Executing...
        </div>
      )}
    </button>
  );
}

function TxLogEntry({ tx }: { tx: TxStatus }) {
  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-blue-400 animate-pulse" />,
    confirming: <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <XCircle className="h-4 w-4 text-red-400" />,
  };

  const statusColors = {
    pending: 'border-blue-500/30 bg-blue-500/5',
    confirming: 'border-amber-500/30 bg-amber-500/5',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <div className={`rounded-xl border p-3 ${statusColors[tx.status]}`}>
      <div className="flex items-center gap-3">
        {statusIcons[tx.status]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tx.step}</p>
          {tx.hash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition truncate block"
            >
              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)} &rarr;
            </a>
          )}
          {tx.error && (
            <p className="text-xs text-red-400 mt-1 break-words">{tx.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
