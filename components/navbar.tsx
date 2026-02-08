'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="container mx-auto px-6 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-400 to-amber-300 p-[2px]">
            <div className="h-full w-full rounded-[10px] bg-background flex items-center justify-center text-sm font-bold text-foreground">
              S
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Sentinel</p>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">LP Defense Network</p>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
          <Link href="/pools" className="hover:text-foreground transition">Pools</Link>
          <Link href="/demo" className="hover:text-foreground transition font-semibold text-amber-400 hover:text-amber-300">Demo</Link>
          <Link href="/keeper" className="hover:text-foreground transition">Keeper</Link>
          <Link href="/challenges" className="hover:text-foreground transition">Challenges</Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
