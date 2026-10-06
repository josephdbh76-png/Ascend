"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { AscendLogotype } from "@/components/brand/AscendLogo";

const SIZES = {
  sm: "h-4",
  md: "h-6",
  lg: "h-8",
  xl: "h-11 sm:h-14",
};

/** The ASCEND logotype for moments (loading, welcome): it rises into place. */
export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const reduced = useReducedMotionSafe();
  const logotype = <AscendLogotype className={cn("text-text-primary", SIZES[size], className)} />;
  if (reduced) return logotype;

  return (
    <motion.span
      className="inline-flex"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {logotype}
    </motion.span>
  );
}
