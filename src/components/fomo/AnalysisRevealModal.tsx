"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/motion/CountUp";
import { GoldParticles } from "@/components/motion/GoldParticles";

export interface AnalysisStep {
  key: string;
  icon: LucideIcon;
  label: string;
  duration: number;
}

/**
 * A short, honest "we're computing this for you" animation before landing
 * on a real result (a real match score / a real count fetched server-side —
 * never a fabricated number). Used to make Elite-gated discovery features
 * feel earned rather than just showing a flat paywall.
 */
export function AnalysisRevealModal({
  open,
  onClose,
  steps,
  resultIcon: ResultIcon = Sparkles,
  resultHeadline,
  resultScore,
  resultScoreFormat = (n) => `${Math.round(n)}%`,
  resultScoreLabel,
  resultSubtext,
  ctaLabel,
  ctaHref,
}: {
  open: boolean;
  onClose: () => void;
  steps: AnalysisStep[];
  resultIcon?: LucideIcon;
  resultHeadline: string;
  resultScore?: number | null;
  resultScoreFormat?: (n: number) => string;
  resultScoreLabel?: string;
  resultSubtext: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const reduced = useReducedMotionSafe();
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "result">("scanning");
  // Reduced motion skips straight to the result — derived at render time
  // rather than via an effect, so there's no extra render/setState pass.
  const effectivePhase = reduced ? "result" : phase;

  function handleClose() {
    setStepIndex(0);
    setPhase("scanning");
    onClose();
  }

  useEffect(() => {
    if (!open || reduced || phase !== "scanning") return;
    if (stepIndex >= steps.length - 1) {
      const t = setTimeout(() => setPhase("result"), steps[stepIndex]?.duration ?? 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), steps[stepIndex].duration);
    return () => clearTimeout(t);
  }, [open, phase, stepIndex, steps, reduced]);

  const current = steps[Math.min(stepIndex, steps.length - 1)];

  return (
    <Modal open={open} onClose={handleClose} className="overflow-hidden">
      <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-5 py-4 text-center">
        {effectivePhase === "result" && <GoldParticles count={14} burst />}

        <AnimatePresence mode="wait">
          {effectivePhase === "scanning" ? (
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <current.icon className="h-6 w-6 animate-pulse text-gold" />
              </div>
              <p className="text-base font-medium text-text-primary">{current.label}</p>
              <div className="flex gap-1.5">
                {steps.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-1 w-6 rounded-full transition-colors ${i <= stepIndex ? "bg-gold" : "bg-border"}`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <ResultIcon className="h-7 w-7 text-gold" />
              </div>
              {resultScore != null && (
                <span className="font-display text-5xl font-medium tracking-tight text-gold">
                  <CountUp value={resultScore} format={resultScoreFormat} duration={1} />
                </span>
              )}
              {resultScoreLabel && <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">{resultScoreLabel}</p>}
              <p className="mt-1 font-display text-xl font-medium text-text-primary">{resultHeadline}</p>
              <p className="max-w-xs text-sm leading-relaxed text-text-secondary">{resultSubtext}</p>
              <Button href={ctaHref} className="mt-3">
                {ctaLabel}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
