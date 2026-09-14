"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export function LoadingScreen({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("flex min-h-[60vh] w-full flex-col items-center justify-center gap-5", className)}>
      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Logo size="lg" />
      </motion.div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-gold/60"
            animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={reduced ? undefined : { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
