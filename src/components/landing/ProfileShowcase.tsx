"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { CheckCircle2, Share2 } from "lucide-react";
import { formatCurrencyRange, formatPercent } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";

export function ProfileShowcase() {
  const reduced = useReducedMotionSafe();

  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal as="div" className="order-2 lg:order-1">
            <motion.div
              className="relative mx-auto max-w-sm"
              animate={reduced ? undefined : { y: [0, -7, 0] }}
              transition={reduced ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gold/10 blur-3xl motion-safe:animate-pulse"
              />
              <div className="rounded-lg border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(245,196,81,0.12)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card-elevated text-lg font-semibold text-gold">
                    AM
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Alex Martin</p>
                    <p className="text-xs text-text-muted">@alexmartin · 🇫🇷 France</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Revenus vérifiés
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Revenus</p>
                    <p className="font-medium tabular-nums text-text-primary">
                      {formatCurrencyRange(2000000, 3000000)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Croissance</p>
                    <p className="font-medium tabular-nums text-success">
                      <CountUp value={34.2} format={formatPercent} decimals={1} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Mondial</p>
                    <p className="font-medium tabular-nums text-gold">
                      #<CountUp value={47} format={(n) => `${n}`} />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">France</p>
                    <p className="font-medium tabular-nums text-text-primary">
                      #<CountUp value={8} format={(n) => `${n}`} />
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-xs text-text-secondary">
                  <Share2 className="h-3.5 w-3.5" /> ascend.app/profile/alexmartin
                </div>
              </div>
            </motion.div>
          </Reveal>
          <Reveal as="div" delay={0.1} className="order-1 lg:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Un profil public que tu auras envie de partager
            </h2>
            <p className="mt-4 text-sm text-text-secondary">
              Choisis exactement le niveau de détail à révéler — montant exact, fourchette, ou
              entièrement privé. Ton classement, tes accomplissements et ta vérification restent
              toujours visibles.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
