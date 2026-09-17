"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Framer Motion's useReducedMotion() can already report the OS "reduce
 * motion" preference on the very first client render, while the server
 * (which has no way to know it) always assumes false. Any component that
 * branches its rendered JSX/attributes on that value — not just its
 * transition config — hydrates with mismatched attributes as a result.
 * Worse: React does not patch attribute-only mismatches back up, so
 * content can get stuck (e.g. permanently opacity: 0) rather than just
 * flashing briefly.
 *
 * This hook stays false through the first client render (matching the
 * server) and only starts reflecting the real preference one tick after
 * mount, via an ordinary state update — a normal re-render, not a
 * hydration correction, so it never triggers that mismatch.
 */
export function useReducedMotionSafe(): boolean {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Deliberately a one-time mount gate, not a derived-state smell: it
    // exists specifically so the client's first render matches the
    // server's (both "not mounted yet"), and only diverges afterward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return mounted && !!prefersReduced;
}
