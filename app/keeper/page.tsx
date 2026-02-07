'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Award, BadgeCheck, Coins } from 'lucide-react';
import { useKeeper } from '@/lib/hooks/useKeeper';
import { formatAmount } from '@/lib/utils';

export default function KeeperPage() {
  const [stakeAmount, setStakeAmount] = useState('0.5');
  const [error, setError] = useState('');
  const { keeper, isLoading, isPending, registerKeeper, isConnected } = useKeeper();

  const handleRegister = async () => {
    try {
      setError('');
      if (!isConnected) {
        setError('Please connect your wallet first');
        return;
      }
      await registerKeeper(stakeAmount);
    } catch (err: any) {
      setError(err?.message || 'Failed to register keeper');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keeper Network</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Become a Keeper</h1>
        <p className="text-muted-foreground max-w-2xl">
          Register as a keeper to monitor the mempool, submit challenges, and earn rewards for accurate MEV detections.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          {isLoading && isConnected ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keeper Status</p>
              <h2 className="text-xl font-semibold">Loading...</h2>
              <div className="mt-4">
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground animate-pulse">
                  Checking keeper registration status...
                </div>
              </div>
            </>
          ) : !keeper ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Registration</p>
              <h2 className="text-xl font-semibold">Activate Keeper Node</h2>
              <div className="mt-4 space-y-4">
                {!isConnected && (
                  <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                      Connect your wallet to register as a keeper
                    </p>
                    <ConnectButton />
                  </div>
                )}
                {isConnected && (
                  <div className="rounded-2xl border border-blue-500/60 bg-blue-500/10 p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      You are not yet registered as a keeper. Stake ETH below to activate your node.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-muted-foreground">Stake amount (min 0.001 ETH)</label>
                  <input
                    value={stakeAmount}
                    onChange={(event) => setStakeAmount(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.5"
                  />
                </div>
                <Button size="lg" className="w-full" onClick={handleRegister} disabled={isPending || !isConnected}>
                  {!isConnected ? 'Connect Wallet First' : isPending ? 'Registering...' : 'Register as Keeper'}
                </Button>
                {error && (
                  <div className="rounded-2xl border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-500">
                    {error}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keeper Status</p>
              <h2 className="text-xl font-semibold">{keeper.isActive ? 'Active Keeper' : 'Inactive Keeper'}</h2>
              <div className="mt-4 space-y-4">
                <div className={`rounded-2xl border p-4 ${keeper.isActive ? 'border-green-500/60 bg-green-500/10' : 'border-amber-500/60 bg-amber-500/10'}`}>
                  <p className={`text-sm mb-2 ${keeper.isActive ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {keeper.isActive ? 'You are registered as an active keeper' : 'Your keeper node is currently inactive'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Current status</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current stake</span>
                      <span className="text-sm font-semibold">{formatAmount(keeper.stake)} ETH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reputation score</span>
                      <span className="text-sm font-semibold">{keeper.reputationScore} / 10,000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={`text-sm font-semibold ${keeper.isActive ? 'text-green-400' : 'text-amber-400'}`}>
                        {keeper.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {/* Reputation bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Reputation</span>
                        <span>{(keeper.reputationScore / 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-background/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                          style={{ width: `${(keeper.reputationScore / 10000) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keeper Stats</p>
          <h2 className="text-xl font-semibold">Performance</h2>
          <div className="mt-6 grid gap-4">
            <StatRow icon={<BadgeCheck className="h-5 w-5" />} label="Challenges submitted" value="-" />
            <StatRow icon={<Award className="h-5 w-5" />} label="Challenges approved" value="-" />
            <StatRow icon={<Coins className="h-5 w-5" />} label="Accuracy rate" value="-" />
            <StatRow icon={<Coins className="h-5 w-5" />} label="Total earnings" value="-" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Aggregated keeper stats require an indexer or off-chain service.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leaderboard</p>
        <h2 className="text-xl font-semibold">Top Keepers</h2>
        <div className="mt-6 rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          Leaderboard requires historical keeper activity indexing.
        </div>
      </section>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-primary">{icon}</span>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
