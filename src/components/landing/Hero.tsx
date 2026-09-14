"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { staggerContainer, fadeUp, easeOut } from "@/lib/motion";

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(245,196,81,0.08),transparent)]" />
      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={reduced ? undefined : "hidden"}
          animate={reduced ? undefined : "visible"}
          variants={staggerContainer(0.12)}
        >
          <motion.div variants={fadeUp}>
            <Badge variant="gold">Bêta privée</Badge>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="mt-6 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
          >
            Construis. Prouve. <span className="text-gold">Progresse.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 text-lg font-medium text-text-primary sm:text-xl">
            Le réseau de performance pour les entrepreneurs ambitieux.
          </motion.p>
          <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-xl text-base text-text-secondary">
            Connecte ton entreprise, vérifie tes performances, grimpe au classement et construis une
            réputation qui se mesure.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button href="/signup" size="lg" className="group">
              Rejoindre la bêta{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button href="#classement" variant="secondary" size="lg">
              Explorer le classement
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 text-xs text-text-muted">
            Gratuit pendant la bêta · Aucune carte bancaire
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto mt-16 max-w-4xl"
          initial={reduced ? undefined : { opacity: 0, y: 28 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: easeOut }}
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-xl border border-border-strong bg-card-elevated p-4 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Tableau de bord · Aperçu illustratif
        </span>
        <span className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Vérifié
        </span>
      </div>
      <p className="mb-3 text-sm text-text-secondary">Bonjour Alex 👋</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3.5 sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Revenus mensuels</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-gold sm:text-xl">
            <CountUp value={2482000} format={(n) => formatCurrency(n)} />
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3.5 sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Croissance</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-success sm:text-xl">
            {formatPercent(34.2)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3.5 sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Classement mondial</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-text-primary sm:text-xl">#47</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3.5 sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Classement France</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-text-primary sm:text-xl">#8</p>
        </div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1.5 rounded-lg border border-border bg-card p-4 sm:h-36">
        {[38, 44, 40, 52, 61, 58, 70, 66, 78, 84, 90, 100].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-gold-dark/60 to-gold"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <TrendingUp className="h-4 w-4 text-gold" /> Prochain palier : 25K €/mois · 92 % atteint
        </span>
        <span className="text-sm font-medium text-gold">10K mensuels</span>
      </div>
    </div>
  );
}
