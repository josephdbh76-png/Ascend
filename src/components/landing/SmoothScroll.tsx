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

    // Kept deliberately subtle — a long duration fights the trackpad's
    // own native momentum (which is already smooth on macOS) and reads
    // as lag rather than polish. This is just enough to soften a raw
    // mouse-wheel notch without slowing the scroll down.
    const lenis = new Lenis({
      duration: 0.55,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      syncTouch: false,
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
