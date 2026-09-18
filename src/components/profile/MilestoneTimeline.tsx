import { Check } from "lucide-react";
import { REVENUE_MILESTONE_LADDER } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { EarnedAchievement } from "@/types";

/**
 * Replays the revenue-threshold achievements a member already has (or is
 * working toward) as a dated sequence — "how did I get here", not just
 * "where am I now". Every date and figure shown is already public via the
 * achievement it's drawn from; this only re-tells it as a timeline.
 */
export function MilestoneTimeline({ achievements }: { achievements: EarnedAchievement[] }) {
  const earnedById = new Map(achievements.map((a) => [a.id, a.earnedAt]));
  const nextIndex = REVENUE_MILESTONE_LADDER.findIndex((m) => !earnedById.has(m.id));

  return (
    <ol className="flex flex-col">
      {REVENUE_MILESTONE_LADDER.map((milestone, i) => {
        const earnedAt = earnedById.get(milestone.id);
        const isNext = i === nextIndex;
        return (
          <li key={milestone.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  earnedAt
                    ? "bg-gold text-[#0a0a0a]"
                    : isNext
                      ? "border border-gold/50 text-gold"
                      : "border border-border-strong text-text-muted",
                )}
              >
                {earnedAt ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              {i < REVENUE_MILESTONE_LADDER.length - 1 && (
                <span className={cn("w-px flex-1", earnedAt ? "bg-gold/40" : "bg-border")} />
              )}
            </div>
            <div className={cn("flex-1 pb-8", !earnedAt && !isNext && "opacity-50")}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn("text-sm font-semibold", earnedAt ? "text-text-primary" : "text-text-secondary")}>
                  {formatCurrency(milestone.threshold)} / mois
                </span>
                {earnedAt ? (
                  <span className="text-[11px] text-text-muted">
                    {new Date(earnedAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                  </span>
                ) : isNext ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">Prochain palier</span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">À venir</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-text-muted">{milestone.name}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
