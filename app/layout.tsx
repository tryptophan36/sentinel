import type { Metadata } from 'next';
import { Space_Grotesk, Space_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Navbar } from '@/components/navbar';

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
  title: 'Sentinel - Decentralized LP Protection',
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

            <Navbar />

            <main className="container mx-auto px-6 py-10">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
