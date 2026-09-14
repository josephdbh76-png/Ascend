"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export function CountUp({
  value,
  format,
  className,
  duration = 1.2,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (inView && !reduced) motionValue.set(value);
  }, [inView, reduced, motionValue, value]);

  useEffect(() => {
    if (!ref.current) return;
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = format(Math.round(v));
    });
  }, [spring, format]);

  if (reduced) {
    return (
      <span ref={ref} className={className}>
        {format(value)}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {format(0)}
    </motion.span>
  );
}
