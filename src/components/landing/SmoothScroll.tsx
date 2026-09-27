"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/**
 * Scoped to the public landing page only (mounted from app/page.tsx, not
 * the root layout) — the logged-in dashboard keeps native scroll, since
 * inertial scroll on a data tool people check daily is friction, not
 * delight. Skipped entirely under prefers-reduced-motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
