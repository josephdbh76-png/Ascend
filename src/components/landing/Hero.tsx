"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { ArrowRight, CheckCircle2, ArrowUp, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FrameCorners } from "@/components/ui/FrameCorners";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { staggerContainer, fadeUp, easeOut } from "@/lib/motion";

export function Hero() {
  const reduced = useReducedMotionSafe();

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* A vertical editorial spine — the kind of detail that signals a
          designed page rather than a template. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-border lg:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-24 hidden origin-top-left -rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted lg:block"
      >
        Édition Nº 001 — Bêta privée
      </span>

      <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:pl-24 lg:pt-32">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "visible"}
            variants={staggerContainer(0.1)}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold" />
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">
                Le réseau des fondateurs qui livrent
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mt-7 font-display text-6xl font-medium leading-[0.98] tracking-tight text-text-primary sm:text-7xl"
            >
              Construis.
              <br />
              Prouve.
              <br />
              <em className="font-display italic text-gold">Progresse.</em>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-8 max-w-md text-lg leading-relaxed text-text-secondary">
              Le réseau de performance des entrepreneurs ambitieux.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
              Vérifie tes performances, découvre ta position et construis une réputation qui se mesure —
              pas une qui se raconte.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/signup" size="lg">
                Rejoindre ASCEND <ArrowRight className="h-4 w-4" />
              </Button>
              <a
                href="#classement"
                className="group inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Découvrir le classement
                <span className="h-px w-5 bg-text-muted transition-all duration-200 group-hover:w-8 group-hover:bg-gold" />
              </a>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-6 font-mono text-[11px] uppercase tracking-wide text-text-muted">
              Création gratuite · Aucune carte bancaire
            </motion.p>
          </motion.div>

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 20 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: easeOut }}
          >
            <FounderCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FounderCard() {
  const reduced = useReducedMotionSafe();

  return (
    <motion.div
      className="relative"
      animate={reduced ? undefined : { y: [0, -6, 0] }}
      transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative border border-border-strong bg-card p-7">
        <FrameCorners />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center border border-border-strong font-display text-sm font-medium text-gold">
            AM
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Alex Martin</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">Fondateur · SaaS</p>
          </div>
          <motion.span
            className="ml-auto flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-success"
            initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.4, ease: easeOut }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Vérifié
          </motion.span>
        </div>

        <div className="hairline mt-6" />

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Revenus mensuels</p>
            <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-text-primary">
              <CountUp value={2482000} format={formatCurrency} />
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Croissance</p>
            <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-success">
              <CountUp value={34.2} format={formatPercent} decimals={1} />
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">Mondial</p>
            <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-gold">
              #<CountUp value={47} format={(n) => `${n}`} />
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">France</p>
            <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-text-primary">
              #<CountUp value={8} format={(n) => `${n}`} />
            </p>
          </div>
        </div>
      </div>

      <motion.div
        className="mt-4 flex flex-wrap gap-2"
        initial={reduced ? undefined : "hidden"}
        animate={reduced ? undefined : "visible"}
        variants={reduced ? undefined : staggerContainer(0.12, 1.05)}
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[11px] text-text-secondary transition-colors duration-200 hover:border-gold/40"
        >
          <ArrowUp className="h-3.5 w-3.5 text-success" /> +12 places
        </motion.span>
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[11px] text-text-secondary transition-colors duration-200 hover:border-gold/40"
        >
          <TrendingUp className="h-3.5 w-3.5 text-gold" /> 25K mensuels
        </motion.span>
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[11px] text-text-secondary transition-colors duration-200 hover:border-gold/40"
        >
          <Award className="h-3.5 w-3.5 text-gold" /> Top 50
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
