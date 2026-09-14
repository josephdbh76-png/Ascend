"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const reduced = useReducedMotion();

  return (
    <section id="classement" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Sais-tu où tu te situes ?
            </h2>
            <p className="mt-3 max-w-lg text-sm text-text-secondary">
              Compare ta progression à celle des entrepreneurs qui construisent comme toi.
            </p>
          </div>
          <Button href="/signup" variant="secondary">
            Voir le classement complet
          </Button>
        </Reveal>

        <Reveal as="div" delay={0.1} className="mt-8">
          <Tabs items={TABS} defaultValue="global" onChange={setTab} />
        </Reveal>

        <Reveal as="div" delay={0.15} className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary text-left text-xs uppercase tracking-wide text-text-muted">
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
                      ? "border-b border-border bg-gold/5 shadow-[inset_0_0_0_1px_rgba(245,196,81,0.4)] last:border-0"
                      : "border-b border-border transition-colors last:border-0 hover:bg-bg-secondary"
                  }
                >
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5">
                      {row.rank <= 3 && <Crown className={`h-4 w-4 ${RANK_COLORS[row.rank]}`} />}
                      <span className={`font-semibold tabular-nums ${RANK_COLORS[row.rank] ?? "text-text-primary"}`}>
                        #{row.rank}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-text-primary">
                    <span className="flex items-center gap-2">
                      {row.name}
                      {row.isYou && (
                        <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold">
                          <ArrowUp className="h-3 w-3" /> 12 places
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-text-secondary">{row.business}</td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums text-success">
                    {formatPercent(row.growth)}
                  </td>
                </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 text-xs text-text-muted">
          Données d&apos;exemple à but illustratif — pas un classement réel.
        </p>
      </div>
    </section>
  );
}
