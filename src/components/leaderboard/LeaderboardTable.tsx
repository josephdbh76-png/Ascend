import Link from "next/link";
import { Crown } from "lucide-react";
import { cn, formatCurrency, formatPercent, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { LeaderboardRow } from "@/types/database.types";

const RANK_COLORS: Record<number, string> = {
  1: "text-rank-1",
  2: "text-rank-2",
  3: "text-rank-3",
};

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center text-sm text-text-secondary">
        No verified founders in this category yet. Be the first to connect and claim the top spot.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-secondary text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="w-16 px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Founder</th>
            <th className="px-4 py-3 font-medium">Business</th>
            <th className="px-4 py-3 text-right font-medium">Monthly Revenue</th>
            <th className="px-4 py-3 text-right font-medium">Growth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.user_id}
              className={cn(
                "border-b border-border last:border-0 transition-colors",
                row.is_current_user ? "bg-gold/5" : "hover:bg-card",
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
                      {row.is_current_user && <Badge variant="gold">You</Badge>}
                      {row.is_demo && <Badge variant="demo">Demo</Badge>}
                    </span>
                    <span className="text-xs text-text-muted">@{row.username}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3.5 text-text-secondary">
                {row.business_name}
                <span className="ml-1.5 text-xs text-text-muted">
                  · {row.business_category.charAt(0).toUpperCase() + row.business_category.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                {row.revenue_visibility === "exact" && row.revenue_display_cents != null
                  ? formatCurrency(row.revenue_display_cents)
                  : row.revenue_visibility === "range"
                    ? "Verified"
                    : "Private"}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
