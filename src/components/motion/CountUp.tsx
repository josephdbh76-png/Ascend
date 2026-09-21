"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function CountUp({
  value,
  format,
  className,
  duration = 1.2,
  decimals = 0,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
  /** Precision to round intermediate animated frames to; the final value always renders exactly `value`. */
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const factor = 10 ** decimals;

  // Framer Motion's useReducedMotion() can already report the OS preference
  // on the very first client render, while the server (which can't know
  // it) always assumes false — branching the returned JSX on `reduced`
  // used to make that first client render disagree with the server's HTML
  // (a real hydration mismatch, not just a lint nitpick). Rendering the
  // same structure unconditionally and only changing *how the value gets
  // there* client-side avoids that.
  useEffect(() => {
    if (!inView) return;
    if (reduced && "jump" in spring) {
      (spring as unknown as { jump: (v: number) => void }).jump(value);
    } else {
      motionValue.set(value);
    }
  }, [inView, reduced, motionValue, spring, value]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = format(Math.round(spring.get() * factor) / factor);
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = format(Math.round(v * factor) / factor);
    });
  }, [spring, format, factor]);

  return (
    <motion.span ref={ref} className={className}>
      {format(0)}
    </motion.span>
  );
}

/**
 * Server Components can't pass function props to Client Components — a
 * plain function like formatCurrency isn't serializable across that
 * boundary and throws at render time. These wrap CountUp with the
 * formatter baked in client-side, so a Server Component only ever needs
 * to pass a plain number through.
 */
export function CurrencyCountUp({ value, className }: { value: number; className?: string }) {
  return <CountUp value={value} format={formatCurrency} className={className} />;
}

export function PercentCountUp({ value, decimals = 1, className }: { value: number; decimals?: number; className?: string }) {
  return <CountUp value={value} format={formatPercent} decimals={decimals} className={className} />;
}

export function PlainCountUp({ value, className }: { value: number; className?: string }) {
  return <CountUp value={value} format={(n) => n.toLocaleString("fr-FR")} className={className} />;
}

export function RankCountUp({ value, className }: { value: number; className?: string }) {
  return <CountUp value={value} format={(n) => `#${n}`} className={className} />;
}
