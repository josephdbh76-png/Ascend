"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { CheckCircle2, Share2 } from "lucide-react";
import { formatCurrencyRange, formatPercent } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { FrameCorners } from "@/components/ui/FrameCorners";

export function ProfileShowcase() {
  const reduced = useReducedMotionSafe();

  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <Reveal as="div" className="order-2 lg:order-1">
            <motion.div
              className="relative mx-auto max-w-sm"
              animate={reduced ? undefined : { y: [0, -6, 0] }}
              transition={reduced ? undefined : { duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <div className="relative border border-border-strong bg-card p-6">
                <FrameCorners />
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center border border-border-strong font-display text-lg font-medium text-gold">
                    AM
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Alex Martin</p>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">@alexmartin · 🇫🇷 France</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Revenus vérifiés
                </div>
                <div className="hairline mt-4" />
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Revenus</p>
                    <p className="mt-1 font-display font-medium tabular-nums text-text-primary">
                      {formatCurrencyRange(2000000, 3000000)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Croissance</p>
                    <p className="mt-1 font-display font-medium tabular-nums text-success">
                      <CountUp value={34.2} format={formatPercent} decimals={1} />
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Mondial</p>
                    <p className="mt-1 font-display font-medium tabular-nums text-gold">
                      #<CountUp value={47} format={(n) => `${n}`} />
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">France</p>
                    <p className="mt-1 font-display font-medium tabular-nums text-text-primary">
                      #<CountUp value={8} format={(n) => `${n}`} />
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 border border-border-strong px-3 py-2 font-mono text-[11px] text-text-secondary">
                  <Share2 className="h-3.5 w-3.5" /> ascend.app/profile/alexmartin
                </div>
              </div>
            </motion.div>
          </Reveal>
          <Reveal as="div" delay={0.1} className="order-1 lg:order-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le profil</span>
            <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
              Un profil public que tu auras envie de partager
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">
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
