'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, ShieldAlert } from 'lucide-react';

const pools = [
  { id: '0x8a...f12', name: 'ETH / USDC' },
  { id: '0xb4...9a0', name: 'WBTC / ETH' },
  { id: '0x31...c88', name: 'ARB / USDT' },
];

const activeChallenges = [
  {
    id: 21,
    attacker: '0xA1f4...91B2',
    challenger: '0x9B2e...2D91',
    evidence: 'ipfs://bafybeif...c12',
    votesFor: 18,
    votesAgainst: 6,
    timeRemaining: '3h 14m',
  },
  {
    id: 22,
    attacker: '0x44cd...eF10',
    challenger: '0x2E9b...11a5',
    evidence: 'ipfs://bafybeif...f77',
    votesFor: 12,
    votesAgainst: 9,
    timeRemaining: '6h 02m',
  },
];

const pastChallenges = [
  { id: 19, outcome: 'Approved', attacker: '0x90aa...B7f3', block: 5589031 },
  { id: 18, outcome: 'Rejected', attacker: '0x72c9...1A0F', block: 5588902 },
  { id: 17, outcome: 'Approved', attacker: '0x31ad...55e0', block: 5588754 },
];

export default function ChallengesPage() {
  const [poolId, setPoolId] = useState(pools[0]?.id ?? '');

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === poolId) ?? pools[0],
    [poolId]
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Challenge System</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Challenges</h1>
        <p className="text-muted-foreground max-w-2xl">
          Review evidence, vote on suspected MEV attacks, and execute finalized challenges.
        </p>
      </header>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Selector</p>
            <h2 className="text-xl font-semibold">Active Pool</h2>
          </div>
          <select
            value={poolId}
            onChange={(event) => setPoolId(event.target.value)}
            className="w-full md:w-72 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {pools.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.name} ({pool.id})
              </option>
            ))}
          </select>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Showing challenges for {selectedPool?.name}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active Challenges</p>
          <h2 className="text-xl font-semibold">Vote Window</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {activeChallenges.map((challenge) => (
            <div key={challenge.id} className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Challenge #{challenge.id}</p>
                <span className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
                  <Clock className="h-3 w-3" />
                  {challenge.timeRemaining}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Suspected attacker:</span> <span className="font-mono">{challenge.attacker}</span></p>
                <p><span className="text-muted-foreground">Challenger:</span> <span className="font-mono">{challenge.challenger}</span></p>
                <p><span className="text-muted-foreground">Evidence hash:</span> <span className="font-mono">{challenge.evidence}</span></p>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Votes For / Against</p>
                  <p className="text-lg font-semibold">{challenge.votesFor} / {challenge.votesAgainst}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Vote For</Button>
                  <Button size="sm" variant="secondary">Vote Against</Button>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="mt-4 w-full border border-border/60">
                Execute Challenge
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Past Challenges</p>
            <h2 className="text-xl font-semibold">Finalized Results</h2>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Attacker</th>
                <th className="px-4 py-3 font-medium">Block</th>
              </tr>
            </thead>
            <tbody>
              {pastChallenges.map((challenge) => (
                <tr key={challenge.id} className="border-t border-border/60">
                  <td className="px-4 py-3">#{challenge.id}</td>
                  <td className="px-4 py-3">
                    <span className={challenge.outcome === 'Approved' ? 'text-emerald-300' : 'text-red-300'}>
                      {challenge.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{challenge.attacker}</td>
                  <td className="px-4 py-3">{challenge.block}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
