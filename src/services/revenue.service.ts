import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { calculateGrowth } from "@/lib/utils";
import type { RevenuePoint } from "@/types";
import type { VerificationStatus, RevenueReviewStatus } from "@/types/database.types";

interface UpsertMonthlyRevenueInput {
  userId: string;
  revenueSourceId: string;
  period: string; // YYYY-MM-01
  amountCents: number;
  currency: string;
  isVerified: boolean;
  proofPath?: string | null;
  transactionCount?: number | null;
  customerCount?: number | null;
  reviewStatus?: RevenueReviewStatus | null;
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
      proof_path: input.proofPath ?? null,
      transaction_count: input.transactionCount ?? null,
      customer_count: input.customerCount ?? null,
      review_status: input.reviewStatus ?? null,
      // A fresh submission clears any previous review outcome — it's a
      // new claim (new amount, new proof) and deserves a fresh look, not
      // to inherit a stale approval or rejection from last month's row.
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
    },
    { onConflict: "user_id,period" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Self-reported revenue for members whose processor isn't supported yet
 * (or who have no processor at all). Requires proof and always starts
 * "pending" — an admin has to approve it (see approveRevenueDeclaration)
 * before it counts as real "Vérifié" status anywhere, same trust bar as
 * a Stripe sync.
 */
export async function submitManualRevenue(input: {
  userId: string;
  period: string; // YYYY-MM-01
  amountCents: number;
  proofPath: string;
}) {
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("revenue_sources")
    .upsert(
      {
        user_id: input.userId,
        provider: "manual",
        status: "connected",
        is_test_mode: false,
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single();
  if (sourceError || !source) throw new Error(sourceError?.message ?? "Impossible d'enregistrer la source.");

  await upsertMonthlyRevenue({
    userId: input.userId,
    revenueSourceId: source.id,
    period: input.period,
    amountCents: input.amountCents,
    currency: "EUR",
    isVerified: false,
    proofPath: input.proofPath,
    reviewStatus: "pending",
  });
}

export async function getManualRevenueSource(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_sources")
    .select("id, status, last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "manual")
    .maybeSingle();
  return data;
}

export async function getRevenueHistory(userId: string, months = 12): Promise<RevenuePoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_snapshots")
    .select("period, amount_cents, is_verified, transaction_count, customer_count")
    .eq("user_id", userId)
    .order("period", { ascending: false })
    .limit(months);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => ({
      period: row.period,
      amountCents: row.amount_cents,
      isVerified: row.is_verified,
      transactionCount: row.transaction_count,
      customerCount: row.customer_count,
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

  if (!source) {
    const manual = await getManualRevenueSource(userId);
    if (manual?.status !== "connected") return "unverified";

    const { data: latestSnapshot } = await supabase
      .from("revenue_snapshots")
      .select("review_status")
      .eq("user_id", userId)
      .eq("revenue_source_id", manual.id)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSnapshot?.review_status === "approved") return "verified";
    if (latestSnapshot?.review_status === "rejected") return "rejected";
    if (latestSnapshot?.review_status === "pending") return "pending";
    return "unverified";
  }
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

/**
 * Naive linear projection ("at this pace, in N months") from the last
 * month-over-month absolute gain — not a real forecast, just a rough
 * trend indicator. Returns null whenever there isn't a positive, usable
 * trend to project from.
 */
export function estimateMonthsToMilestone(
  currentCents: number | null,
  previousCents: number | null,
  remainingCents: number,
): number | null {
  if (currentCents == null || previousCents == null || remainingCents <= 0) return null;
  const monthlyGain = currentCents - previousCents;
  if (monthlyGain <= 0) return null;
  return Math.ceil(remainingCents / monthlyGain);
}

export interface PendingRevenueReview {
  snapshotId: string;
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  period: string;
  amountCents: number;
  submittedAt: string;
  proofUrl: string | null;
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function getPendingRevenueReviews(): Promise<PendingRevenueReview[]> {
  const admin = createAdminClient();
  const { data: snapshots, error } = await admin
    .from("revenue_snapshots")
    .select("id, user_id, period, amount_cents, proof_path, created_at")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!snapshots || snapshots.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, first_name, last_name")
    .in("id", snapshots.map((s) => s.user_id));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return Promise.all(
    snapshots.map(async (s) => {
      let proofUrl: string | null = null;
      if (s.proof_path) {
        const { data: signed } = await admin.storage
          .from("revenue-proofs")
          .createSignedUrl(s.proof_path, 60 * 10);
        proofUrl = signed?.signedUrl ?? null;
      }
      const profile = profileById.get(s.user_id);
      return {
        snapshotId: s.id,
        userId: s.user_id,
        username: profile?.username ?? "",
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        period: s.period,
        amountCents: s.amount_cents,
        submittedAt: s.created_at,
        proofUrl,
      };
    }),
  );
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function approveRevenueDeclaration(snapshotId: string, adminUserId: string) {
  const admin = createAdminClient();
  const { data: snapshot, error } = await admin
    .from("revenue_snapshots")
    .update({
      is_verified: true,
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      rejection_reason: null,
    })
    .eq("id", snapshotId)
    .select("user_id, period, amount_cents")
    .single();
  if (error || !snapshot) throw new Error(error?.message ?? "Déclaration introuvable.");

  await admin.from("profiles").update({ revenue_verified: true }).eq("id", snapshot.user_id);

  await createNotificationForUser({
    userId: snapshot.user_id,
    type: "revenue_review_completed",
    title: "Revenu déclaré vérifié",
    body: `Ta déclaration de ${(snapshot.amount_cents / 100).toLocaleString("fr-FR")} € a été validée et compte désormais comme un revenu vérifié.`,
    metadata: { period: snapshot.period },
  });
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function rejectRevenueDeclaration(snapshotId: string, adminUserId: string, reason: string) {
  const admin = createAdminClient();
  const { data: snapshot, error } = await admin
    .from("revenue_snapshots")
    .update({
      is_verified: false,
      review_status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      rejection_reason: reason,
    })
    .eq("id", snapshotId)
    .select("user_id, period")
    .single();
  if (error || !snapshot) throw new Error(error?.message ?? "Déclaration introuvable.");

  await createNotificationForUser({
    userId: snapshot.user_id,
    type: "revenue_review_completed",
    title: "Déclaration de revenu refusée",
    body: `Ta déclaration de revenu n'a pas été validée : ${reason}`,
    metadata: { period: snapshot.period },
  });
}
