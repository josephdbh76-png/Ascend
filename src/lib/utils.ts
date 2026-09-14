import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Resolves the app's public base URL. Uses `||` rather than `??` on
 * purpose — an env var that exists but was saved as an empty string (a
 * real misconfiguration we've hit on Vercel) must fall back too, not just
 * a missing/undefined one.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function formatCurrency(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCurrencyRange(minCents: number, maxCents: number, currency = "EUR"): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(v / 100);
  return `${fmt(minCents)}–${fmt(maxCents)}`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number, opts?: { showSign?: boolean }): string {
  const sign = opts?.showSign !== false ? (value > 0 ? "+" : "") : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function calculateGrowth(current: number, previous: number): number | null {
  if (previous === 0 || previous == null || current == null) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function revenueRange(cents: number): { min: number; max: number } {
  const step = 1000000;
  const min = Math.floor(cents / step) * step;
  return { min, max: min + step };
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "A";
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: [number, string, string][] = [
    [31536000, "an", "ans"],
    [2592000, "mois", "mois"],
    [86400, "jour", "jours"],
    [3600, "heure", "heures"],
    [60, "minute", "minutes"],
  ];
  for (const [secs, singular, plural] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `il y a ${count} ${count > 1 ? plural : singular}`;
  }
  return "à l'instant";
}
