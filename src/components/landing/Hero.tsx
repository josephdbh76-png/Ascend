"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, TrendingUp, ArrowUp, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { staggerContainer, fadeUp, easeOut } from "@/lib/motion";

export function Hero() {
  const reduced = useReducedMotion();

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
  return (
    <div className="relative">
      <div className="rounded-lg border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card-elevated text-sm font-semibold text-gold">
            AM
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Alex Martin</p>
            <p className="text-xs text-text-muted">Fondateur · SaaS</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Revenus vérifiés
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Revenus mensuels</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
              {formatCurrency(2482000)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Croissance</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{formatPercent(34.2)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Mondial</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gold">#47</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-muted">France</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">#8</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary">
          <ArrowUp className="h-3.5 w-3.5 text-success" /> +12 places
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary">
          <TrendingUp className="h-3.5 w-3.5 text-gold" /> 25K mensuels
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-text-secondary">
          <Award className="h-3.5 w-3.5 text-gold" /> Top 50
        </span>
      </div>
    </div>
  );
}
