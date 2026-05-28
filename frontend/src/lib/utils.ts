import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if(!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatSalary(min: number | null, max: number | null): string {
  if(!min && !max) return '—';
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if(min && max) return `${fmt(min)} - ${fmt(max)}`;
  if(min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}
