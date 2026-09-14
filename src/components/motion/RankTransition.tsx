"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";

/** Animates a rank number counting from `from` down/up to `to` (e.g. #59 → #47). */
export function RankTransition({
  from,
  to,
  className,
}: {
  from: number | null;
  to: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(from ?? to);

  useEffect(() => {
    if (ref.current) ref.current.textContent = `#${Math.round(motionValue.get())}`;
  }, [motionValue]);

  useEffect(() => {
    if (from == null || reduced || from === to) {
      if (ref.current) ref.current.textContent = `#${to}`;
      return;
    }
    const controls = animate(motionValue, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `#${Math.round(v)}`;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, reduced]);

  return (
    <motion.span ref={ref} className={className}>
      #{to}
    </motion.span>
  );
}
