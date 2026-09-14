"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface Step {
  key: string;
  render: () => React.ReactNode;
  duration: number;
}

export function VerificationReveal({ rank }: { rank: number | null; revenueCents: number | null; milestoneCents: number | null }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  const steps: Step[] = [
    { key: "secure", render: () => <Line muted>Connexion sécurisée</Line>, duration: 1100 },
    { key: "analyze", render: () => <Line muted>Analyse de tes données…</Line>, duration: 1400 },
    {
      key: "verified",
      render: () => (
        <Line accent>
          <CheckCircle2 className="mr-2 inline h-7 w-7 -translate-y-0.5 text-success" />
          Performance vérifiée
        </Line>
      ),
      duration: 1400,
    },
    ...(rank != null
      ? [{ key: "rank", render: () => <Line big gold>{`Tu es actuellement #${rank}`}</Line>, duration: 1700 }]
      : []),
    { key: "welcome", render: () => <Line>Bienvenue dans ASCEND.</Line>, duration: 1500 },
  ];

  useEffect(() => {
    if (reduced) {
      router.replace("/app/dashboard");
      return;
    }
    if (index >= steps.length) {
      const t = setTimeout(() => router.replace("/app/dashboard"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), steps[index].duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduced]);

  const current = steps[Math.min(index, steps.length - 1)];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
          ? "text-4xl font-semibold tracking-tight text-gold sm:text-5xl"
          : `text-2xl font-medium sm:text-3xl ${
              muted ? "text-text-secondary" : accent ? "text-success" : gold ? "text-gold" : "text-text-primary"
            }`
      }
    >
      {children}
    </p>
  );
}
