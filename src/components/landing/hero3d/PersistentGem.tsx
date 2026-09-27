"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type RefObject } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const GemScene = dynamic(() => import("./GemScene"), { ssr: false });

/**
 * One gem, one WebGL canvas for the whole page — mounted once here rather
 * than disappearing with the hero. As the hero scrolls past, it shrinks
 * and slides into a small fixed corner badge that stays for the rest of
 * the scroll, instead of a large canvas quietly still rendering full-size
 * off-screen (real, measurable jank further down the page).
 */
export function PersistentGem({ heroRef }: { heroRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotionSafe();
  const [viewportHeight, setViewportHeight] = useState(900);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const size = useTransform(scrollYProgress, [0, 1], [340, 84]);
  const top = useTransform(scrollYProgress, [0, 1], [90, viewportHeight - 116]);
  const right = useTransform(scrollYProgress, [0, 1], [90, 24]);

  if (reduced) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-30"
      style={{ top, right, width: size, height: size }}
      aria-hidden
    >
      <GemScene />
    </motion.div>
  );
}
