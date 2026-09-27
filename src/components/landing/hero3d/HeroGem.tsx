"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { useScroll } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const GemScene = dynamic(() => import("./GemScene"), { ssr: false });

/** The 3D gem tracks scroll progress across the hero section it's placed inside of. */
export function HeroGem({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  if (reduced) return null;

  return (
    // No negative z-index here on purpose: a WebGL canvas stacked behind
    // its own overflow-hidden ancestor via z-index < 0 doesn't get
    // composited at all in Chromium — silently renders nothing, no error.
    // Placing this element first in DOM order (before the foreground
    // content, in Hero.tsx) achieves the same "behind" effect safely.
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <GemScene scrollProgress={scrollYProgress} />
    </div>
  );
}
