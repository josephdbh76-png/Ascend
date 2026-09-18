"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Crown, ArrowUp, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Tabs } from "@/components/ui/Tabs";
import { formatCurrency, formatPercent } from "@/lib/utils";

const TABS = [
  { value: "global", label: "Mondial" },
  { value: "france", label: "France" },
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "croissance", label: "Croissance" },
];

const DATASETS: Record<string, { rank: number; name: string; business: string; revenue: number; growth: number; isYou?: boolean }[]> = {
  global: [
    { rank: 1, name: "Thomas Dubois", business: "SaaS", revenue: 18254000, growth: 12.5 },
    { rank: 2, name: "Lucas Martin", business: "E-commerce", revenue: 14123000, growth: 28.4 },
    { rank: 3, name: "Emma Laurent", business: "SaaS", revenue: 12689000, growth: 9.7 },
    { rank: 4, name: "Julien Moreau", business: "Agence", revenue: 9820000, growth: 15.1 },
    { rank: 47, name: "Toi", business: "SaaS", revenue: 2482000, growth: 34.2, isYou: true },
  ],
  france: [
    { rank: 1, name: "Thomas Dubois", business: "SaaS", revenue: 18254000, growth: 12.5 },
    { rank: 2, name: "Lucas Martin", business: "E-commerce", revenue: 14123000, growth: 28.4 },
    { rank: 3, name: "Emma Laurent", business: "SaaS", revenue: 12689000, growth: 9.7 },
    { rank: 8, name: "Toi", business: "SaaS", revenue: 2482000, growth: 34.2, isYou: true },
  ],
  saas: [
    { rank: 1, name: "Thomas Dubois", business: "SaaS", revenue: 18254000, growth: 12.5 },
    { rank: 2, name: "Emma Laurent", business: "SaaS", revenue: 12689000, growth: 9.7 },
    { rank: 3, name: "Sofia Rossi", business: "SaaS", revenue: 8410000, growth: 22.3 },
    { rank: 19, name: "Toi", business: "SaaS", revenue: 2482000, growth: 34.2, isYou: true },
  ],
  ecommerce: [
    { rank: 1, name: "Lucas Martin", business: "E-commerce", revenue: 14123000, growth: 28.4 },
    { rank: 2, name: "Julien Moreau", business: "E-commerce", revenue: 9820000, growth: 15.1 },
    { rank: 3, name: "Sofia Rossi", business: "E-commerce", revenue: 8410000, growth: 22.3 },
  ],
  croissance: [
    { rank: 1, name: "Lucas Martin", business: "E-commerce", revenue: 14123000, growth: 28.4 },
    { rank: 2, name: "Toi", business: "SaaS", revenue: 2482000, growth: 34.2, isYou: true },
    { rank: 3, name: "Sofia Rossi", business: "Conseil", revenue: 8410000, growth: 22.3 },
  ],
};

const RANK_COLORS: Record<number, string> = { 1: "text-rank-1", 2: "text-rank-2", 3: "text-rank-3" };

export function LeaderboardPreview() {
  const [tab, setTab] = useState("global");
  const rows = DATASETS[tab];
  const reduced = useReducedMotionSafe();

  return (
    <section id="classement" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold" />
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le classement</span>
            </div>
            <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
              Sais-tu où tu te situes ?
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-text-secondary">
              Compare ta progression à celle des entrepreneurs qui construisent comme toi.
            </p>
          </div>
          <a
            href="/signup"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Voir le classement complet
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </Reveal>

        <Reveal as="div" delay={0.1} className="mt-10">
          <Tabs items={TABS} defaultValue="global" onChange={setTab} />
        </Reveal>

        <Reveal as="div" delay={0.15} className="mt-6 overflow-x-auto border-y border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">
                <th className="w-16 px-4 py-3 font-medium">Rang</th>
                <th className="px-4 py-3 font-medium">Entrepreneur</th>
                <th className="px-4 py-3 font-medium">Activité</th>
                <th className="px-4 py-3 text-right font-medium">Revenus mensuels</th>
                <th className="px-4 py-3 text-right font-medium">Croissance</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout" initial={false}>
                {rows.map((row, i) => (
                <motion.tr
                  key={`${tab}-${row.rank}`}
                  layout={!reduced}
                  initial={reduced ? undefined : { opacity: 0, y: 10 }}
                  animate={reduced ? undefined : { opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className={
                    row.isYou
                      ? "border-b border-border bg-gold/5 shadow-[inset_2px_0_0_0_var(--color-gold)] last:border-0"
                      : "border-b border-border transition-colors last:border-0 hover:bg-bg-secondary"
                  }
                >
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5">
                      {row.rank <= 3 && <Crown className={`h-4 w-4 ${RANK_COLORS[row.rank]}`} />}
                      <span className={`font-display text-base font-medium tabular-nums ${RANK_COLORS[row.rank] ?? "text-text-primary"}`}>
                        #{row.rank}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-text-primary">
                    <span className="flex items-center gap-2">
                      {row.name}
                      {row.isYou && (
                        <span className="flex items-center gap-1 border border-gold/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-gold">
                          <ArrowUp className="h-3 w-3" /> 12 places
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">{row.business}</td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums text-text-primary">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums text-success">
                    {formatPercent(row.growth)}
                  </td>
                </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 font-mono text-[11px] text-text-muted">
          Données d&apos;exemple à but illustratif — pas un classement réel.
        </p>
      </div>
    </section>
  );
}
