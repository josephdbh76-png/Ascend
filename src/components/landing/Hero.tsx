"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { ArrowRight, CheckCircle2, TrendingUp, ArrowUp, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { staggerContainer, fadeUp, easeOut } from "@/lib/motion";

export function Hero() {
  const reduced = useReducedMotionSafe();

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "visible"}
            variants={staggerContainer(0.1)}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="gold">Bêta privée</Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary sm:text-6xl"
            >
              Construis.
              <br />
              Prouve.
              <br />
              <span className="text-gold">Progresse.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-md text-lg text-text-secondary">
              Le réseau de performance des entrepreneurs ambitieux.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-3 max-w-md text-sm text-text-muted">
              Vérifie tes performances, découvre ta position et construis une réputation qui se mesure.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/signup" size="lg">
                Rejoindre ASCEND <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="#classement" variant="secondary" size="lg">
                Découvrir le classement
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-4 text-xs text-text-muted">
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
      animate={reduced ? undefined : { y: [0, -8, 0] }}
      transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gold/10 blur-3xl motion-safe:animate-pulse"
      />

      <div className="rounded-lg border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(245,196,81,0.12)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card-elevated text-sm font-semibold text-gold">
            AM
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Alex Martin</p>
            <p className="text-xs text-text-muted">Fondateur · SaaS</p>
          </div>
          <motion.span
            className="ml-auto flex items-center gap-1.5 text-xs text-success"
            initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.4, ease: easeOut }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Revenus vérifiés
          </motion.span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Revenus mensuels</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
              <CountUp value={2482000} format={formatCurrency} />
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Croissance</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              <CountUp value={34.2} format={formatPercent} decimals={1} />
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Mondial</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gold">
              #<CountUp value={47} format={(n) => `${n}`} />
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">France</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
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
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary transition-transform duration-200 hover:-translate-y-0.5"
        >
          <ArrowUp className="h-3.5 w-3.5 text-success" /> +12 places
        </motion.span>
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary transition-transform duration-200 hover:-translate-y-0.5"
        >
          <TrendingUp className="h-3.5 w-3.5 text-gold" /> 25K mensuels
        </motion.span>
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Award className="h-3.5 w-3.5 text-gold" /> Top 50
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
