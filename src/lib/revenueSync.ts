/** A connected revenue source older than this is re-synced when its owner opens the dashboard. */
export const REVENUE_RESYNC_AFTER_MS = 20 * 60 * 60 * 1000;

export function isRevenueSyncStale(lastSyncedAt: string | null): boolean {
  return !lastSyncedAt || new Date(lastSyncedAt).getTime() < Date.now() - REVENUE_RESYNC_AFTER_MS;
}

/** Sources that sync on their own (the bank and manual declarations don't). */
export const AUTO_SYNC_PROVIDERS = [
  "stripe",
  "shopify",
  "paypal",
  "lemonsqueezy",
  "qonto",
  "mollie",
  "paddle",
  "gumroad",
  "whop",
  "woocommerce",
] as const;
