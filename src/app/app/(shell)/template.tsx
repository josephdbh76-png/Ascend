"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

/**
 * A template (unlike layout) remounts on every navigation within this
 * segment, which is exactly what a per-page enter transition needs.
 * Keeps every /app/* page from just instantly swapping in — without
 * touching the pages' own visual design.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  if (reduced) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
