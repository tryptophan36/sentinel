import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits } from 'viem';


export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: bigint, decimals: number = 18): string {
  const num = Number(formatUnits(amount, decimals));
  if (num === 0) return '0';

  // For very small amounts, show more decimals so they don't display as "0"
  const abs = Math.abs(num);
  let maxFractionDigits = 4;
  if (abs > 0 && abs < 0.0001) maxFractionDigits = 8;
  else if (abs > 0 && abs < 0.01) maxFractionDigits = 6;

  return num.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

export function formatFee(feePips: number): string {
  // Uniswap V4 fees are in pips (hundredths of a basis point)
  // 3000 pips = 0.30%, 10000 pips = 1.00%
  return `${(feePips / 10000).toFixed(2)}%`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
