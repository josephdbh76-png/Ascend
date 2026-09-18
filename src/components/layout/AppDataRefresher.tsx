"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 45000;

/**
 * The notification bell and the "Messages" nav badge are seeded once from
 * the shell layout's server-rendered props — without this, a notification
 * or message that arrives while you're just sitting on a page never shows
 * up until your next navigation. A plain background refresh (the same
 * router.refresh() already used everywhere in this app after a mutation)
 * re-runs the shell layout's data fetch on an interval, which is enough to
 * keep both badges honest without adding a realtime subscription.
 */
export function AppDataRefresher() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
