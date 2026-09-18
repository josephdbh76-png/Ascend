import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { percentileToWhole, type BenchmarkStats } from "@/services/benchmark.service";

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * The dashboard's one honest benchmark headline — real percentile, real
 * cohort, never a fabricated number. Falls back to the global figure
 * whenever the category cohort is still too small to be meaningful, and
 * disappears entirely rather than show a hollow stat if neither is usable.
 */
export function BenchmarkCard({ stats }: { stats: BenchmarkStats }) {
  const useCategory = stats.categoryDataReliable && stats.categoryRevenuePercentile != null;
  const revenuePercentile = percentileToWhole(
    useCategory ? stats.categoryRevenuePercentile : stats.globalRevenuePercentile,
  );
  if (revenuePercentile == null) return null;

  const growthPercentile = percentileToWhole(
    useCategory ? stats.categoryGrowthPercentile : stats.globalGrowthPercentile,
  );
  const cohortLabel = useCategory ? categoryLabel(stats.category) : "entrepreneurs";

  return (
    <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" elevated hover>
      <div className="flex items-start gap-3">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div>
          <p className="text-sm leading-relaxed text-text-secondary">
            Tu es devant{" "}
            <span className="font-display text-lg font-medium text-gold">{revenuePercentile}%</span> des{" "}
            {useCategory ? `entreprises ${cohortLabel}` : cohortLabel} vérifiées
            {useCategory ? "" : " (toutes catégories)"}.
          </p>
          {growthPercentile != null && (
            <p className="mt-1 font-mono text-xs text-text-muted">
              Ta croissance dépasse {growthPercentile}% de tes pairs.
            </p>
          )}
        </div>
      </div>
      <Link
        href="/app/analytics"
        className="group inline-flex shrink-0 items-center gap-2 self-start text-sm font-medium text-text-secondary hover:text-text-primary sm:self-center"
      >
        Voir l&apos;analyse complète
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </Card>
  );
}
