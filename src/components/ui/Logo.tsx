"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl sm:text-7xl",
};

export function Logo({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={cn("font-semibold tracking-tight text-gold", SIZES[size], className)}>ASCEND</span>;
  }

  return (
    <motion.span
      className={cn(
        "inline-block bg-gradient-to-r from-text-primary via-gold to-text-primary bg-[length:200%_100%] bg-clip-text font-semibold tracking-tight text-transparent",
        SIZES[size],
        className,
      )}
      animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      ASCEND
    </motion.span>
  );
}
