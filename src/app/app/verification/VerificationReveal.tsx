"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ShieldCheck, ScanLine } from "lucide-react";
import { GoldParticles } from "@/components/motion/GoldParticles";
import { RevealBadge } from "@/components/motion/RevealBadge";
import { CountUp } from "@/components/motion/CountUp";
import { Logo } from "@/components/ui/Logo";

interface Step {
  key: string;
  render: () => React.ReactNode;
  duration: number;
  burst?: boolean;
}

export function VerificationReveal({ rank }: { rank: number | null; revenueCents: number | null; milestoneCents: number | null }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  const steps: Step[] = [
    {
      key: "secure",
      render: () => (
        <Line muted>
          <ShieldCheck className="mr-2 inline h-6 w-6 -translate-y-0.5 text-text-secondary" />
          Connexion sécurisée
        </Line>
      ),
      duration: 1200,
    },
    {
      key: "analyze",
      render: () => (
        <Line muted>
          <ScanLine className="mr-2 inline h-6 w-6 -translate-y-0.5 animate-pulse text-gold" />
          Analyse de tes données…
        </Line>
      ),
      duration: 1500,
    },
    {
      key: "verified",
      render: () => (
        <div className="flex flex-col items-center gap-6">
          <RevealBadge />
          <Line accent>
            <CheckCircle2 className="mr-2 inline h-7 w-7 -translate-y-0.5 text-success" />
            Performance vérifiée
          </Line>
        </div>
      ),
      duration: 2600,
    },
    ...(rank != null
      ? [
          {
            key: "rank",
            render: () => (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium uppercase tracking-wide text-text-muted">
                  Classement mondial
                </span>
                <span className="text-6xl font-semibold tracking-tight text-gold sm:text-7xl">
                  #<CountUp value={rank} format={(n) => `${n}`} duration={1.4} />
                </span>
              </div>
            ),
            duration: 2200,
          },
        ]
      : []),
    {
      key: "welcome",
      render: () => (
        <div className="flex flex-col items-center gap-3">
          <Logo size="xl" />
          <p className="text-lg text-text-secondary">Bienvenue dans ASCEND.</p>
        </div>
      ),
      duration: 2200,
      burst: true,
    },
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-[120px]"
      />
      <GoldParticles burst={current.burst} />
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
}: {
  children: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <p
      className={`text-2xl font-medium sm:text-3xl ${
        muted ? "text-text-secondary" : accent ? "text-success" : gold ? "text-gold" : "text-text-primary"
      }`}
    >
      {children}
    </p>
  );
}
