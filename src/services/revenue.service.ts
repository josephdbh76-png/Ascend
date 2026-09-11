import "server-only";
import { createClient } from "@/lib/supabase/server";
import { calculateGrowth } from "@/lib/utils";
import type { RevenuePoint } from "@/types";
import type { VerificationStatus } from "@/types/database.types";

interface UpsertMonthlyRevenueInput {
  userId: string;
  revenueSourceId: string;
  period: string; // YYYY-MM-01
  amountCents: number;
  currency: string;
  isVerified: boolean;
}

export async function upsertMonthlyRevenue(input: UpsertMonthlyRevenueInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("revenue_snapshots").upsert(
    {
      user_id: input.userId,
      revenue_source_id: input.revenueSourceId,
      period: input.period,
      amount_cents: input.amountCents,
      currency: input.currency,
      is_verified: input.isVerified,
    },
    { onConflict: "user_id,period" },
  );
  if (error) throw new Error(error.message);
}

export async function getRevenueHistory(userId: string, months = 12): Promise<RevenuePoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_snapshots")
    .select("period, amount_cents, is_verified")
    .eq("user_id", userId)
    .order("period", { ascending: false })
    .limit(months);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => ({
      period: row.period,
      amountCents: row.amount_cents,
      isVerified: row.is_verified,
    }))
    .reverse();
}

export async function getCurrentRevenue(
  userId: string,
): Promise<{ current: RevenuePoint | null; previous: RevenuePoint | null }> {
  const history = await getRevenueHistory(userId, 2);
  const current = history.at(-1) ?? null;
  const previous = history.length > 1 ? history.at(-2)! : null;
  return { current, previous };
}

export function calculateMonthlyGrowth(current: number | null, previous: number | null) {
  if (current == null || previous == null) return null;
  return calculateGrowth(current, previous);
}

export async function getVerificationStatus(userId: string): Promise<VerificationStatus> {
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("revenue_sources")
    .select("id, status")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (!source) return "unverified";
  if (source.status === "disconnected") return "disconnected";

  const { data: verification } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", source.id)
    .maybeSingle();

  return verification?.status ?? "unverified";
}

export function nextRevenueMilestone(currentCents: number | null): {
  targetCents: number;
  progressPercent: number;
} {
  const milestones = [
    100000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000,
  ];
  const current = currentCents ?? 0;
  const target = milestones.find((m) => m > current) ?? milestones.at(-1)!;
  const previousMilestone = [...milestones].reverse().find((m) => m <= current) ?? 0;
  const span = target - previousMilestone;
  const progressPercent = span > 0 ? ((current - previousMilestone) / span) * 100 : 100;
  return { targetCents: target, progressPercent: Math.max(0, Math.min(100, progressPercent)) };
}
