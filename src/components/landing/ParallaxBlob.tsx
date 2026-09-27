"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/**
 * A soft glow that drifts as the section scrolls past — cheap way to add
 * a felt sense of depth to an otherwise flat section background. Purely
 * decorative (aria-hidden), scoped to its own section's scroll range so
 * it doesn't need to know about the rest of the page.
 */
export function ParallaxBlob({
  className,
  range = 120,
}: {
  className?: string;
  /** How far, in pixels, the blob drifts across the section's scroll range. */
  range?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-range, range]);

  if (reduced) {
    return <div ref={ref} aria-hidden className={className} />;
  }

  return <motion.div ref={ref} aria-hidden className={className} style={{ y }} />;
}
