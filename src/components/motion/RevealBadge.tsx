"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Check } from "lucide-react";

/**
 * A 3D coin-like badge: flips in face-on, then settles into a slow,
 * continuous turn so it keeps catching the light. Pure CSS 3D transforms
 * (perspective + rotateY) — no WebGL, but reads as genuinely dimensional.
 */
export function RevealBadge({ size = 128 }: { size?: number }) {
  const reduced = useReducedMotionSafe();

  return (
    <div style={{ perspective: 900 }} className="mx-auto" aria-hidden>
      <motion.div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transformStyle: "preserve-3d",
        }}
        initial={reduced ? undefined : { rotateY: -180, scale: 0.6, opacity: 0 }}
        animate={
          reduced
            ? undefined
            : { rotateY: [-180, 0, 0, 360], scale: [0.6, 1.08, 1, 1], opacity: 1 }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 3.6,
                times: [0, 0.35, 0.4, 1],
                ease: [0.16, 1, 0.3, 1],
                repeat: Infinity,
                repeatDelay: 0.6,
              }
        }
        className="relative rounded-full"
      >
        <div
          className="absolute inset-0 rounded-full border-4 border-gold-light/60"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #e8c875 0%, #d6a84f 45%, #9a722d 100%)",
            boxShadow: "0 0 60px rgba(214,168,79,0.55), inset 0 0 20px rgba(0,0,0,0.25)",
          }}
        />
        <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[#0a0b0d]/90">
          <Check className="text-gold" style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2.5} />
        </div>
      </motion.div>
    </div>
  );
}
