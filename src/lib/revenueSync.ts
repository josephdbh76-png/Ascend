/** A connected revenue source older than this is re-synced when its owner opens the dashboard. */
export const REVENUE_RESYNC_AFTER_MS = 20 * 60 * 60 * 1000;

export function isRevenueSyncStale(lastSyncedAt: string | null): boolean {
  return !lastSyncedAt || new Date(lastSyncedAt).getTime() < Date.now() - REVENUE_RESYNC_AFTER_MS;
}
