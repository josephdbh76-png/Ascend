import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";
import { cn, formatCurrency, formatCurrencyRange, formatPercent, initials } from "@/lib/utils";
import { categoryLabel } from "@/lib/business";
import type { LeaderboardRow } from "@/types/database.types";

const RANK_COLORS: Record<number, string> = { 1: "text-rank-1", 2: "text-rank-2", 3: "text-rank-3" };

function revenueLabel(row: LeaderboardRow) {
  if (row.revenue_visibility === "exact" && row.revenue_display_cents != null) return formatCurrency(row.revenue_display_cents);
  if (row.revenue_visibility === "range" && row.revenue_range_min_cents != null && row.revenue_range_max_cents != null) {
    return formatCurrencyRange(row.revenue_range_min_cents, row.revenue_range_max_cents);
  }
  return "Privé";
}

/**
 * Server-rendered (no animation) so the whole list is in the HTML that
 * search engines read. Free places at the top are shown as such: they are
 * real, and they are the best argument to join.
 */
export function PublicLeaderboard({ rows, showCategory = true }: { rows: LeaderboardRow[]; showCategory?: boolean }) {
  const openSeats = rows.length < 10 ? Math.min(10 - rows.length, 3) : 0;
  const firstOpenRank = (rows.at(-1)?.rank ?? 0) + 1;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden grid-cols-[72px_1fr_180px_120px] gap-4 border-b border-border bg-bg-secondary px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted sm:grid">
        <span>Rang</span>
        <span>Entrepreneur</span>
        <span className="text-right">Revenus mensuels</span>
        <span className="text-right">Croissance</span>
      </div>
      <ol>
        {rows.map((row) => (
          <li key={row.user_id} className="border-b border-border last:border-0">
            <Link
              href={`/profile/${row.username}`}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-card sm:grid-cols-[72px_1fr_180px_120px] sm:gap-4"
            >
              <span className={cn("flex items-center gap-1.5 font-semibold tabular-nums", RANK_COLORS[row.rank] ?? "text-text-primary")}>
                {row.rank <= 3 && <Crown className="hidden h-4 w-4 sm:block" />}#{row.rank}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-xs font-semibold text-gold">
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    initials(row.first_name, row.last_name)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {row.first_name} {row.last_name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {row.business_name}
                    {showCategory && ` · ${categoryLabel(row.business_category)}`}
                  </span>
                </span>
              </span>
              <span className="text-right text-sm font-medium tabular-nums text-text-primary">{revenueLabel(row)}</span>
              <span
                className={cn(
                  "hidden text-right text-sm font-medium tabular-nums sm:block",
                  row.growth_percent == null ? "text-text-muted" : row.growth_percent >= 0 ? "text-success" : "text-error",
                )}
              >
                {row.growth_percent != null ? formatPercent(row.growth_percent) : "—"}
              </span>
            </Link>
          </li>
        ))}
        {Array.from({ length: openSeats }, (_, i) => (
          <li key={`open-${i}`} className="border-b border-dashed border-border last:border-0">
            <Link
              href="/signup"
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gold/5 sm:grid-cols-[72px_1fr_180px_120px] sm:gap-4"
            >
              <span className="font-semibold tabular-nums text-text-muted">#{firstOpenRank + i}</span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-xs text-text-muted">
                  ?
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-secondary">Place libre</span>
                  <span className="block truncate text-xs text-text-muted">Vérifie tes revenus pour la prendre</span>
                </span>
              </span>
              <span className="flex items-center justify-end gap-1 text-xs font-medium text-gold sm:col-span-2">
                Prendre cette place <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {rows.length === 0 && (
        <p className="border-t border-border px-4 py-4 text-center text-xs text-text-muted">
          Personne n&apos;est encore classé ici : la première place revient au premier revenu vérifié.
        </p>
      )}
    </div>
  );
}
