import type { Metadata } from 'next';
import Link from 'next/link';
import { Space_Grotesk, Space_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Button } from '@/components/ui/button';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Hook\'d Guard - Decentralized LP Protection',
  description: 'Autonomous agent network protecting Uniswap v4 liquidity providers from MEV attacks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans`}>
        <Providers>
          <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35),rgba(56,189,248,0))] blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.3),rgba(251,191,36,0))] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),rgba(16,185,129,0))] blur-3xl" />

            <header className="container mx-auto px-6 pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-400 to-amber-300 p-[2px]">
                    <div className="h-full w-full rounded-[10px] bg-background flex items-center justify-center text-sm font-bold text-foreground">
                      HG
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight">Hook&apos;d Guard V2</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">LP Defense Network</p>
                  </div>
                </Link>
                <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
                  <Link href="/keeper" className="hover:text-foreground transition">Keeper</Link>
                  <Link href="/challenges" className="hover:text-foreground transition">Challenges</Link>
                  <Link href="/pools" className="hover:text-foreground transition">Pools</Link>
                  <Link href="/dashboard">
                    <Button size="sm">Launch App</Button>
                  </Link>
                </nav>
              </div>
            </header>

            <main className="container mx-auto px-6 py-10">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
