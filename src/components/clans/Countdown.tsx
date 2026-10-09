"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number): string {
  if (ms <= 0) return "maintenant";
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1e3);
  if (d > 0) return `${d} j ${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

// A clock ticking every second (the snapshot only changes once a second).
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const currentSecond = () => Math.floor(Date.now() / 1000);

/** "3 j 04 h 12 min", ticking. Renders "…" on the server, then the live value. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const second = useSyncExternalStore(subscribe, currentSecond, () => null);
  return (
    <span className={className} suppressHydrationWarning>
      {second == null ? "…" : parts(target - second * 1000)}
    </span>
  );
}
