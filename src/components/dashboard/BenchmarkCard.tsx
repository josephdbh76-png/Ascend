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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
          <Target className="h-4 w-4 text-gold" />
        </div>
        <div>
          <p className="text-sm text-text-secondary">
            Tu es devant <span className="text-lg font-semibold text-gold">{revenuePercentile}%</span> des{" "}
            {useCategory ? `entreprises ${cohortLabel}` : cohortLabel} vérifiées
            {useCategory ? "" : " (toutes catégories)"}.
          </p>
          {growthPercentile != null && (
            <p className="mt-1 text-xs text-text-muted">Ta croissance dépasse {growthPercentile}% de tes pairs.</p>
          )}
        </div>
      </div>
      <Link
        href="/app/analytics"
        className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-gold hover:text-gold-light sm:self-center"
      >
        Voir l&apos;analyse complète <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}
