import { Button } from "@/components/ui/button";

const signals = [
  {
    id: "sig-001",
    title: "Mempool spike detected",
    details: "Large swap observed (12.4% pool depth). Risk threshold exceeded.",
    status: "Mitigated",
    time: "T-12s"
  },
  {
    id: "sig-002",
    title: "Fee guard raised",
    details: "Hook set dynamic fee to 90% for 1 block.",
    status: "Active",
    time: "T-8s"
  },
  {
    id: "sig-003",
    title: "Pool stabilized",
    details: "Swaps resumed at baseline fee after 1 block cooldown.",
    status: "Recovered",
    time: "T+4s"
  }
];

export default function Home() {
  return (
    <main>
      <section className="rounded-3xl border border-white/10 bg-panel/40 p-8 shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-muted">
              Uniswap v4 Agentic Finance
            </p>
            <h1 className="text-4xl font-semibold text-ink md:text-5xl">
              Hook&apos;d Guard
            </h1>
            <p className="max-w-2xl text-base text-muted">
              A lightweight agentic sentinel that detects targeted MEV behavior and
              activates a Uniswap v4 hook to protect LPs with instant, transparent
              responses.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button>Arm Guardian</Button>
            <Button variant="secondary">Simulate Attack</Button>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Pool</p>
          <p className="mt-3 text-2xl font-semibold">WETH/USDC</p>
          <p className="mt-2 text-sm text-muted">Hook enabled · Dynamic fee</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Agent</p>
          <p className="mt-3 text-2xl font-semibold text-accent">Armed</p>
          <p className="mt-2 text-sm text-muted">Guardian wallet connected</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Protection</p>
          <p className="mt-3 text-2xl font-semibold">Fee Shield</p>
          <p className="mt-2 text-sm text-muted">90% for 1 block on trigger</p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest Signals</h2>
          <Button variant="ghost" size="sm">
            Export Log
          </Button>
        </div>
        <div className="mt-4 grid gap-4">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-panel/30 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted">
                  {signal.id}
                </p>
                <p className="mt-2 text-lg font-semibold">{signal.title}</p>
                <p className="text-sm text-muted">{signal.details}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                  {signal.status}
                </span>
                <span className="text-xs text-muted">{signal.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-white/10 bg-panel/30 p-6">
        <h3 className="text-lg font-semibold">Demo Flow</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold">1. Detect</p>
            <p className="mt-2 text-sm text-muted">
              Agent monitors mempool and pool imbalance in real-time.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold">2. Defend</p>
            <p className="mt-2 text-sm text-muted">
              Hook raises fee or pauses for a single block.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold">3. Recover</p>
            <p className="mt-2 text-sm text-muted">
              Normal fee resumes, LPs stay protected.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
