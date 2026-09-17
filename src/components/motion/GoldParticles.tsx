"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

interface Particle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  extra: number;
}

// Deterministic pseudo-random in [0,1) — pure (same seed always gives the
// same output), unlike Math.random(), so it's safe to call during render.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** A field of slow-drifting gold specks — ambient premium texture, not confetti. */
export function GoldParticles({ count = 26, burst = false }: { count?: number; burst?: boolean }) {
  const reduced = useReducedMotionSafe();
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: pseudoRandom(i + 1) * 100,
        size: 2 + pseudoRandom(i + 2) * 3,
        delay: pseudoRandom(i + 3) * 2.5,
        duration: 3.5 + pseudoRandom(i + 4) * 3,
        drift: (pseudoRandom(i + 5) - 0.5) * 60,
        extra: pseudoRandom(i + 6),
      })),
    [count],
  );

  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-gold"
          style={{
            left: `${p.left.toFixed(2)}%`,
            bottom: "-5%",
            width: `${p.size.toFixed(2)}px`,
            height: `${p.size.toFixed(2)}px`,
            boxShadow: "0 0 6px rgba(214,168,79,0.8)",
          }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            y: burst ? -420 - p.extra * 200 : -520,
            x: p.drift,
          }}
          transition={{
            duration: burst ? p.duration * 0.6 : p.duration,
            delay: burst ? p.delay * 0.3 : p.delay,
            repeat: burst ? 0 : Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
