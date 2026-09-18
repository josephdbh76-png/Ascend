import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BenchmarkStatsRow } from "@/types/database.types";

/**
 * Below this many verified peers in a category, a percentile swings too
 * wildly to mean anything ("ahead of 100% of 1 other business") — the UI
 * falls back to the global figure instead rather than showing a hollow
 * number. Matches the "pertinent, not exhaustive" principle: better to
 * show one honest stat than several noisy ones.
 */
const MIN_CATEGORY_SAMPLE = 5;

export interface BenchmarkStats {
  category: string;
  categorySampleSize: number;
  categoryRevenuePercentile: number | null;
  categoryGrowthPercentile: number | null;
  categoryMedianRevenueCents: number | null;
  globalSampleSize: number;
  globalRevenuePercentile: number | null;
  globalGrowthPercentile: number | null;
  /** False when the category cohort is too small to trust — callers should lead with the global figure instead. */
  categoryDataReliable: boolean;
}

function mapRow(row: BenchmarkStatsRow): BenchmarkStats {
  return {
    category: row.category,
    categorySampleSize: row.category_sample_size,
    categoryRevenuePercentile: row.category_revenue_percentile,
    categoryGrowthPercentile: row.category_growth_percentile,
    categoryMedianRevenueCents: row.category_median_revenue_cents,
    globalSampleSize: row.global_sample_size,
    globalRevenuePercentile: row.global_revenue_percentile,
    globalGrowthPercentile: row.global_growth_percentile,
    categoryDataReliable: row.category_sample_size >= MIN_CATEGORY_SAMPLE,
  };
}

/**
 * Null means the member isn't verified yet, or has no business row —
 * there's nothing to benchmark against. Never returns fabricated figures:
 * every percentile here comes straight from get_benchmark_stats, computed
 * over real verified revenue.
 */
export async function getBenchmarkStats(userId: string): Promise<BenchmarkStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_benchmark_stats", { p_user_id: userId });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return mapRow(row);
}

/** Rounds a 0–1 percentile to a whole percentage, the unit every surface displays. */
export function percentileToWhole(percentile: number | null): number | null {
  if (percentile == null) return null;
  return Math.round(percentile * 100);
}
