"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Step {
  key: string;
  render: () => React.ReactNode;
  duration: number;
}

export function VerificationReveal({
  rank,
  revenueCents,
  milestoneCents,
}: {
  rank: number | null;
  revenueCents: number | null;
  milestoneCents: number | null;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  const remaining = milestoneCents != null && revenueCents != null ? milestoneCents - revenueCents : null;

  const steps: Step[] = [
    { key: "success", render: () => <Line>Connexion réussie.</Line>, duration: 1100 },
    { key: "analyze", render: () => <Line muted>Analyse de tes performances…</Line>, duration: 1400 },
    {
      key: "verified",
      render: () => (
        <Line accent>
          <CheckCircle2 className="mr-2 inline h-7 w-7 -translate-y-0.5 text-success" />
          Revenus vérifiés
        </Line>
      ),
      duration: 1400,
    },
    ...(rank != null
      ? [
          { key: "you-are", render: () => <Line muted>Tu es actuellement…</Line>, duration: 1000 },
          { key: "rank", render: () => <Line big gold>{`#${rank} mondial`}</Line>, duration: 1600 },
        ]
      : []),
    ...(remaining != null && remaining > 0
      ? [
          {
            key: "milestone",
            render: () => (
              <Line>
                Ton prochain objectif : <span className="text-gold">{formatCurrency(milestoneCents!)}</span> / mois
              </Line>
            ),
            duration: 1800,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (reduced) {
      router.replace("/dashboard");
      return;
    }
    if (index >= steps.length) {
      const t = setTimeout(() => router.replace("/dashboard"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), steps[index].duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduced]);

  const current = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(245,196,81,0.07),transparent)]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {current.render()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Line({
  children,
  muted,
  accent,
  gold,
  big,
}: {
  children: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
  gold?: boolean;
  big?: boolean;
}) {
  return (
    <p
      className={
        big
          ? "text-5xl font-semibold tracking-tight text-gold sm:text-6xl"
          : `text-2xl font-medium sm:text-3xl ${
              muted ? "text-text-secondary" : accent ? "text-success" : gold ? "text-gold" : "text-text-primary"
            }`
      }
    >
      {children}
    </p>
  );
}
