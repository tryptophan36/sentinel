'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Plus, ShieldAlert, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAccount, useBlockNumber } from 'wagmi';
import { DEFAULT_POOL_IDS } from '@/lib/constants';
import { useChallenges } from '@/lib/hooks/useChallenges';
import { useKeeper } from '@/lib/hooks/useKeeper';
import { formatAddress } from '@/lib/utils';

const CHALLENGE_DURATION = 5n;

export default function ChallengesPage() {
  const { isConnected } = useAccount();
  const [poolId, setPoolId] = useState<`0x${string}` | ''>(
    (DEFAULT_POOL_IDS[0] as `0x${string}`) ?? ''
  );
  const { challenges, isLoading, submitChallenge, voteOnChallenge, executeChallenge } = useChallenges(poolId || undefined);
  const { keeper } = useKeeper();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Submit challenge form
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [attackerAddr, setAttackerAddr] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vote/execute feedback
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

  const activeChallenges = useMemo(
    () => challenges.filter((challenge) => !challenge.executed),
    [challenges]
  );
  const pastChallenges = useMemo(
    () => challenges.filter((challenge) => challenge.executed),
    [challenges]
  );

  const timeRemaining = (submitBlock: bigint) => {
    if (!blockNumber) return '--';
    const remaining = submitBlock + CHALLENGE_DURATION - blockNumber;
    return remaining > 0n ? `${remaining} blocks` : 'Voting ended';
  };

  const isVotingEnded = (submitBlock: bigint) => {
    if (!blockNumber) return false;
    return blockNumber >= submitBlock + CHALLENGE_DURATION;
  };

  const handleSubmitChallenge = async () => {
    if (!attackerAddr) {
      setSubmitStatus('Please enter an attacker address');
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitStatus('Submitting challenge...');

      // Hash the evidence note to get bytes32
      const encoder = new TextEncoder();
      const data = encoder.encode(evidenceNote || 'evidence');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const evidenceHash = ('0x' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      await submitChallenge(attackerAddr as `0x${string}`, evidenceHash);
      setSubmitStatus('Challenge submitted successfully!');
      setAttackerAddr('');
      setEvidenceNote('');
      setShowSubmitForm(false);
    } catch (err: any) {
      setSubmitStatus(`Error: ${err?.shortMessage || err?.message || 'Failed to submit challenge'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (id: number, support: boolean) => {
    const key = `vote-${id}`;
    try {
      setActionStatus(prev => ({ ...prev, [key]: 'Submitting vote...' }));
      await voteOnChallenge(id, support);
      setActionStatus(prev => ({ ...prev, [key]: `Voted ${support ? 'for' : 'against'}!` }));
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [key]: `Error: ${err?.shortMessage || err?.message || 'Vote failed'}` }));
    }
  };

  const handleExecute = async (id: number) => {
    const key = `exec-${id}`;
    try {
      setActionStatus(prev => ({ ...prev, [key]: 'Executing...' }));
      await executeChallenge(id);
      setActionStatus(prev => ({ ...prev, [key]: 'Executed!' }));
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [key]: `Error: ${err?.shortMessage || err?.message || 'Execution failed'}` }));
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Challenge System</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Challenges</h1>
        <p className="text-muted-foreground max-w-2xl">
          Review evidence, vote on suspected MEV attacks, and execute finalized challenges.
        </p>
      </header>

      {/* Pool Selector + Keeper Status */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pool Selector</p>
            <h2 className="text-xl font-semibold">Active Pool</h2>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                keeper ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {keeper ? (
                  <><CheckCircle2 className="h-3 w-3 inline mr-1" /> Keeper Active</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 inline mr-1" /> Not a Keeper</>
                )}
              </div>
            )}
            <select
              value={poolId}
              onChange={(event) => setPoolId(event.target.value as `0x${string}`)}
              className="w-full md:w-72 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {poolId ? `Showing challenges for ${poolId}` : 'No pool selected.'}
        </p>
      </section>

      {/* Submit Challenge Form */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New Challenge</p>
              <h2 className="text-xl font-semibold">Submit Challenge</h2>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSubmitForm(!showSubmitForm)}
          >
            {showSubmitForm ? 'Cancel' : 'New Challenge'}
          </Button>
        </div>

        {!keeper && isConnected && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            You need to be a registered keeper to submit challenges.{' '}
            <a href="/keeper" className="underline hover:text-amber-200">Register here</a>.
          </div>
        )}

        {showSubmitForm && keeper && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Suspected Attacker Address</label>
              <input
                value={attackerAddr}
                onChange={(e) => setAttackerAddr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Evidence Description</label>
              <input
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., wash-trading-evidence-2024"
              />
              <p className="text-xs text-muted-foreground mt-1">Will be hashed to bytes32 for on-chain submission.</p>
            </div>
            <Button className="w-full" onClick={handleSubmitChallenge} disabled={isSubmitting || !poolId}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4 mr-2" />
              )}
              Submit Challenge
            </Button>
          </div>
        )}

        {submitStatus && (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${
            submitStatus.startsWith('Error')
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : submitStatus.includes('...')
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          }`}>
            {submitStatus}
          </div>
        )}
      </section>

      {/* Active Challenges */}
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active Challenges</p>
          <h2 className="text-xl font-semibold">Vote Window</h2>
        </div>
        {isLoading && (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            Loading challenges...
          </div>
        )}
        {!isLoading && activeChallenges.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            No active challenges for this pool.
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {activeChallenges.map((challenge) => {
            const votingEnded = isVotingEnded(challenge.submitBlock);
            const voteKey = `vote-${challenge.id}`;
            const execKey = `exec-${challenge.id}`;

            return (
              <div key={challenge.id} className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Challenge #{challenge.id}</p>
                  <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                    votingEnded
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-200'
                  }`}>
                    <Clock className="h-3 w-3" />
                    {timeRemaining(challenge.submitBlock)}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Suspected attacker:</span> <span className="font-mono">{formatAddress(challenge.suspectedAttacker)}</span></p>
                  <p><span className="text-muted-foreground">Challenger:</span> <span className="font-mono">{formatAddress(challenge.challenger)}</span></p>
                  <p><span className="text-muted-foreground">Evidence hash:</span> <span className="font-mono text-xs">{challenge.evidenceHash}</span></p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Votes For / Against</p>
                    <p className="text-lg font-semibold">{challenge.votesFor} / {challenge.votesAgainst}</p>
                  </div>
                  {!votingEnded && keeper && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleVote(challenge.id, true)}>Vote For</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleVote(challenge.id, false)}>Vote Against</Button>
                    </div>
                  )}
                  {!votingEnded && !keeper && isConnected && (
                    <p className="text-xs text-amber-400">Keeper required to vote</p>
                  )}
                </div>
                {actionStatus[voteKey] && (
                  <p className={`mt-2 text-xs ${actionStatus[voteKey].startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {actionStatus[voteKey]}
                  </p>
                )}

                {/* Only show Execute when voting has ended */}
                {votingEnded && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-4 w-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => handleExecute(challenge.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Execute Challenge
                  </Button>
                )}
                {!votingEnded && (
                  <p className="mt-3 text-xs text-center text-muted-foreground">
                    Execute available after voting ends
                  </p>
                )}
                {actionStatus[execKey] && (
                  <p className={`mt-2 text-xs ${actionStatus[execKey].startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {actionStatus[execKey]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Past Challenges */}
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Past Challenges</p>
            <h2 className="text-xl font-semibold">Finalized Results</h2>
          </div>
        </div>
        {pastChallenges.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            No executed challenges yet.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/70 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Attacker</th>
                  <th className="px-4 py-3 font-medium">Votes</th>
                  <th className="px-4 py-3 font-medium">Submit Block</th>
                </tr>
              </thead>
              <tbody>
                {pastChallenges.map((challenge) => (
                  <tr key={challenge.id} className="border-t border-border/60">
                    <td className="px-4 py-3">#{challenge.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-300">Executed</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatAddress(challenge.suspectedAttacker)}</td>
                    <td className="px-4 py-3">{challenge.votesFor} / {challenge.votesAgainst}</td>
                    <td className="px-4 py-3">{challenge.submitBlock.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
