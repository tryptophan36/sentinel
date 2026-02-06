'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Award, BadgeCheck, Coins } from 'lucide-react';

const leaderboard = [
  { address: '0x91e2...4B12', reputation: 92, stake: '3.4 ETH', challenges: 48 },
  { address: '0x72c9...1A0F', reputation: 88, stake: '2.9 ETH', challenges: 41 },
  { address: '0x44df...9C01', reputation: 84, stake: '2.1 ETH', challenges: 35 },
  { address: '0xa023...77be', reputation: 80, stake: '1.9 ETH', challenges: 29 },
];

export default function KeeperPage() {
  const [stakeAmount, setStakeAmount] = useState('0.5');

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
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Registration</p>
          <h2 className="text-xl font-semibold">Activate Keeper Node</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Stake amount (min 0.1 ETH)</label>
              <input
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.5"
              />
            </div>
            <Button size="lg" className="w-full">
              Register as Keeper
            </Button>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">If already registered</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Current stake: 1.6 ETH</p>
                <p>Reputation score: 86</p>
                <p>Status: Active</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keeper Stats</p>
          <h2 className="text-xl font-semibold">Performance</h2>
          <div className="mt-6 grid gap-4">
            <StatRow icon={<BadgeCheck className="h-5 w-5" />} label="Challenges submitted" value="52" />
            <StatRow icon={<Award className="h-5 w-5" />} label="Challenges approved" value="41" />
            <StatRow icon={<Coins className="h-5 w-5" />} label="Accuracy rate" value="78%" />
            <StatRow icon={<Coins className="h-5 w-5" />} label="Total earnings" value="2.3 ETH" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leaderboard</p>
        <h2 className="text-xl font-semibold">Top Keepers</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Reputation</th>
                <th className="px-4 py-3 font-medium">Stake</th>
                <th className="px-4 py-3 font-medium">Challenges</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((keeper) => (
                <tr key={keeper.address} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono">{keeper.address}</td>
                  <td className="px-4 py-3">{keeper.reputation}</td>
                  <td className="px-4 py-3">{keeper.stake}</td>
                  <td className="px-4 py-3">{keeper.challenges}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
