"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { Crown } from "lucide-react";
import { cn, formatCurrency, formatCurrencyRange, formatPercent, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { TitleBadge } from "@/components/titles/TitleBadge";
import type { LeaderboardRow } from "@/types/database.types";

const RANK_COLORS: Record<number, string> = {
  1: "text-rank-1",
  2: "text-rank-2",
  3: "text-rank-3",
};

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const reduced = useReducedMotionSafe();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center text-sm text-text-secondary">
        Aucun fondateur vérifié dans cette catégorie pour l&apos;instant. Sois le premier à te connecter et à
        prendre la tête du classement.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
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
          {rows.map((row, i) => (
            <motion.tr
              key={row.user_id}
              initial={reduced ? undefined : { opacity: 0, y: 8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.035, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "border-b border-border last:border-0 transition-colors",
                row.is_current_user
                  ? "bg-gold/5 shadow-[inset_0_0_0_1px_rgba(245,196,81,0.35)]"
                  : "hover:bg-card",
              )}
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  {row.rank <= 3 ? (
                    <Crown className={cn("h-4 w-4", RANK_COLORS[row.rank])} />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={cn("font-semibold tabular-nums", RANK_COLORS[row.rank] ?? "text-text-primary")}>
                    #{row.rank}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <Link href={`/profile/${row.username}`} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card-elevated text-xs font-semibold text-gold">
                    {initials(row.first_name, row.last_name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-medium text-text-primary">
                      {row.first_name} {row.last_name}
                      {row.active_title && <TitleBadge title={row.active_title} />}
                      {row.is_current_user && <Badge variant="gold">Toi</Badge>}
                      {row.is_demo && <Badge variant="demo">Démo</Badge>}
                    </span>
                    <span className="text-xs text-text-muted">@{row.username}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3.5 text-text-secondary">
                {row.business_name}
                <span className="ml-1.5 text-xs text-text-muted">· {categoryLabel(row.business_category)}</span>
              </td>
              <td className="px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                {row.revenue_visibility === "exact" && row.revenue_display_cents != null
                  ? formatCurrency(row.revenue_display_cents)
                  : row.revenue_visibility === "range" &&
                      row.revenue_range_min_cents != null &&
                      row.revenue_range_max_cents != null
                    ? formatCurrencyRange(row.revenue_range_min_cents, row.revenue_range_max_cents)
                    : "Privé"}
              </td>
              <td
                className={cn(
                  "px-4 py-3.5 text-right font-medium tabular-nums",
                  row.growth_percent == null
                    ? "text-text-muted"
                    : row.growth_percent >= 0
                      ? "text-success"
                      : "text-error",
                )}
              >
                {row.growth_percent != null ? formatPercent(row.growth_percent) : "—"}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
