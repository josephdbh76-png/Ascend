"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently refreshes stale revenue in the background, then re-renders the dashboard with fresh numbers. */
export function AutoRevenueSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/revenue/auto-sync", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { synced?: number } | null) => {
        if (!cancelled && data?.synced) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
