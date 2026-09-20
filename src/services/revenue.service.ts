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
  transactionCount?: number | null;
  customerCount?: number | null;
}

/**
 * revenue_snapshots (read by the leaderboard, dashboard, challenges and
 * milestones) holds one blended row per user+period — the sum of every
 * connected source's contribution for that month. Each source writes its
 * own row into revenue_source_snapshots first (see upsertMonthlyRevenue /
 * recomputeManualSnapshot); this folds all of a period's source rows into
 * that single blended row, so a Stripe sync can never wipe out a manual
 * declaration's figure for the same month, or vice versa.
 */
async function recomputeBlendedSnapshot(userId: string, period: string) {
  const admin = createAdminClient();
  const { data: sourceRows, error } = await admin
    .from("revenue_source_snapshots")
    .select("revenue_source_id, amount_cents, transaction_count, customer_count")
    .eq("user_id", userId)
    .eq("period", period);
  if (error) throw new Error(error.message);

  if (!sourceRows || sourceRows.length === 0) {
    await admin.from("revenue_snapshots").delete().eq("user_id", userId).eq("period", period);
    return;
  }

  const amountCents = sourceRows.reduce((sum, r) => sum + r.amount_cents, 0);
  const transactionCounts = sourceRows.map((r) => r.transaction_count).filter((n): n is number => n != null);
  const customerCounts = sourceRows.map((r) => r.customer_count).filter((n): n is number => n != null);

  const { error: upsertError } = await admin.from("revenue_snapshots").upsert(
    {
      user_id: userId,
      // Any contributing source satisfies the not-null FK — this row is a
      // blend, not attributable to one source. Per-source figures live in
      // revenue_source_snapshots.
      revenue_source_id: sourceRows[0].revenue_source_id,
      period,
      amount_cents: amountCents,
      currency: "EUR",
      is_verified: true,
      transaction_count: transactionCounts.length > 0 ? transactionCounts.reduce((a, b) => a + b, 0) : null,
      customer_count: customerCounts.length > 0 ? customerCounts.reduce((a, b) => a + b, 0) : null,
    },
    { onConflict: "user_id,period" },
  );
  if (upsertError) throw new Error(upsertError.message);
}

/**
 * Sets profiles.revenue_verified from the one true source of verified
 * revenue (revenue_snapshots) instead of letting whichever
 * source synced most recently decide it unilaterally — a Stripe or
 * Shopify sync that legitimately finds zero charges must not erase a
 * verified status earned through a different source (an approved manual
 * declaration, or the other processor).
 */
export async function refreshRevenueVerifiedFlag(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("revenue_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const verified = (count ?? 0) > 0;
  await admin.from("profiles").update({ revenue_verified: verified }).eq("id", userId);
  return verified;
}

export async function upsertMonthlyRevenue(input: UpsertMonthlyRevenueInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("revenue_source_snapshots").upsert(
    {
      user_id: input.userId,
      revenue_source_id: input.revenueSourceId,
      period: input.period,
      amount_cents: input.amountCents,
      currency: input.currency,
      is_verified: input.isVerified,
      transaction_count: input.transactionCount ?? null,
      customer_count: input.customerCount ?? null,
    },
    { onConflict: "revenue_source_id,period" },
  );
  if (error) throw new Error(error.message);
  await recomputeBlendedSnapshot(input.userId, input.period);
}

/**
 * Self-reported revenue for members whose processor isn't supported yet
 * (or who have no processor at all). Each contract/client is its own row —
 * submitting a second one for the same month adds to it instead of
 * replacing it, and each is reviewed independently. Requires proof and
 * always starts "pending"; only recomputeManualSnapshot's sum of
 * *approved* declarations ever counts as real "Vérifié" revenue.
 */
export async function submitRevenueDeclaration(input: {
  userId: string;
  period: string; // YYYY-MM-01
  label?: string;
  amountCents: number;
  proofPath: string;
}) {
  const supabase = await createClient();

  await supabase.from("revenue_sources").upsert(
    {
      user_id: input.userId,
      provider: "manual",
      status: "connected",
      is_test_mode: false,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );

  const { error } = await supabase.from("revenue_declarations").insert({
    user_id: input.userId,
    period: input.period,
    label: input.label || null,
    amount_cents: input.amountCents,
    proof_path: input.proofPath,
    review_status: "pending",
  });
  if (error) throw new Error(error.message);
}

export interface RevenueDeclaration {
  id: string;
  period: string;
  label: string | null;
  amountCents: number;
  reviewStatus: RevenueReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export async function getRevenueDeclarations(userId: string, period: string): Promise<RevenueDeclaration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_declarations")
    .select("id, period, label, amount_cents, review_status, rejection_reason, created_at")
    .eq("user_id", userId)
    .eq("period", period)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((d) => ({
    id: d.id,
    period: d.period,
    label: d.label,
    amountCents: d.amount_cents,
    reviewStatus: d.review_status,
    rejectionReason: d.rejection_reason,
    createdAt: d.created_at,
  }));
}

/**
 * The one true "manual revenue" figure for a period: the sum of every
 * *approved* declaration. Recomputed after every submission or review so
 * revenue_snapshots (what the dashboard, milestones and challenges read)
 * never counts a pending or rejected claim.
 */
async function recomputeManualSnapshot(userId: string, period: string) {
  const admin = createAdminClient();

  const { data: source } = await admin
    .from("revenue_sources")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "manual")
    .maybeSingle();
  if (!source) return;

  const { data: approved } = await admin
    .from("revenue_declarations")
    .select("amount_cents")
    .eq("user_id", userId)
    .eq("period", period)
    .eq("review_status", "approved");
  const sum = (approved ?? []).reduce((total, d) => total + d.amount_cents, 0);

  if (sum > 0) {
    await admin.from("revenue_source_snapshots").upsert(
      {
        user_id: userId,
        revenue_source_id: source.id,
        period,
        amount_cents: sum,
        currency: "EUR",
        is_verified: true,
      },
      { onConflict: "revenue_source_id,period" },
    );
  } else {
    await admin.from("revenue_source_snapshots").delete().eq("revenue_source_id", source.id).eq("period", period);
  }

  await recomputeBlendedSnapshot(userId, period);
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

/** Checks one processor's connection + verification status, or null if that processor isn't connected at all. */
async function getProcessorVerificationStatus(
  userId: string,
  provider: "stripe" | "shopify",
): Promise<VerificationStatus | null> {
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("revenue_sources")
    .select("id, status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!source) return null;
  if (source.status === "disconnected") return "disconnected";

  const { data: verification } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", source.id)
    .maybeSingle();

  return verification?.status ?? "unverified";
}

/** The Shopify connection's own status, independent of any other source — used to render its row in Réglages accurately even when Stripe (checked first) is what drives the account's overall verification status. */
export async function getShopifyVerificationStatus(userId: string): Promise<VerificationStatus> {
  return (await getProcessorVerificationStatus(userId, "shopify")) ?? "unverified";
}

/** Null when manual revenue was never even attempted — mirrors getProcessorVerificationStatus's contract for the other two processors. */
async function getManualVerificationStatus(userId: string): Promise<VerificationStatus | null> {
  const supabase = await createClient();
  const manual = await getManualRevenueSource(userId);
  if (manual?.status !== "connected") return null;

  const { data: latestPeriodRow } = await supabase
    .from("revenue_declarations")
    .select("period")
    .eq("user_id", userId)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestPeriodRow) return "unverified";

  const { data: declarations } = await supabase
    .from("revenue_declarations")
    .select("review_status")
    .eq("user_id", userId)
    .eq("period", latestPeriodRow.period);

  const statuses = new Set((declarations ?? []).map((d) => d.review_status));
  if (statuses.has("approved")) return "verified";
  if (statuses.has("pending")) return "pending";
  if (statuses.has("rejected")) return "rejected";
  return "unverified";
}

/**
 * A member can connect Stripe, Shopify and manual declarations at the
 * same time — this used to stop at whichever of the three was checked
 * first and simply connected, so an empty (but connected) Stripe account
 * hid a genuinely verified manual declaration entirely. Now checks all
 * three and reports the best status found across them, since "verified"
 * from any one source makes the account verified overall.
 */
const STATUS_PRIORITY: VerificationStatus[] = ["verified", "pending", "rejected", "disconnected", "unverified"];

export async function getVerificationStatus(userId: string): Promise<VerificationStatus> {
  const [stripeStatus, shopifyStatus, manualStatus] = await Promise.all([
    getProcessorVerificationStatus(userId, "stripe"),
    getProcessorVerificationStatus(userId, "shopify"),
    getManualVerificationStatus(userId),
  ]);

  const statuses = [stripeStatus, shopifyStatus, manualStatus].filter(
    (s): s is VerificationStatus => s != null,
  );
  if (statuses.length === 0) return "unverified";

  return STATUS_PRIORITY.find((p) => statuses.includes(p)) ?? "unverified";
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
  declarationId: string;
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  period: string;
  label: string | null;
  amountCents: number;
  submittedAt: string;
  proofUrl: string | null;
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function getPendingRevenueReviews(): Promise<PendingRevenueReview[]> {
  const admin = createAdminClient();
  const { data: declarations, error } = await admin
    .from("revenue_declarations")
    .select("id, user_id, period, label, amount_cents, proof_path, created_at")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!declarations || declarations.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, first_name, last_name")
    .in("id", declarations.map((d) => d.user_id));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return Promise.all(
    declarations.map(async (d) => {
      const { data: signed } = await admin.storage.from("revenue-proofs").createSignedUrl(d.proof_path, 60 * 10);
      const profile = profileById.get(d.user_id);
      return {
        declarationId: d.id,
        userId: d.user_id,
        username: profile?.username ?? "",
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        period: d.period,
        label: d.label,
        amountCents: d.amount_cents,
        submittedAt: d.created_at,
        proofUrl: signed?.signedUrl ?? null,
      };
    }),
  );
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function approveRevenueDeclaration(declarationId: string, adminUserId: string) {
  const admin = createAdminClient();
  const { data: declaration, error } = await admin
    .from("revenue_declarations")
    .update({ review_status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUserId, rejection_reason: null })
    .eq("id", declarationId)
    .select("user_id, period, amount_cents, label")
    .single();
  if (error || !declaration) throw new Error(error?.message ?? "Déclaration introuvable.");

  await recomputeManualSnapshot(declaration.user_id, declaration.period);
  await refreshRevenueVerifiedFlag(declaration.user_id);

  await createNotificationForUser({
    userId: declaration.user_id,
    type: "revenue_review_completed",
    title: "Revenu déclaré vérifié",
    body: `Ta déclaration${declaration.label ? ` « ${declaration.label} »` : ""} de ${(declaration.amount_cents / 100).toLocaleString("fr-FR")} € a été validée et compte désormais comme un revenu vérifié.`,
    metadata: { period: declaration.period },
  });
}

/** Admin-only — callers must check isCurrentUserAdmin() first, this trusts them. */
export async function rejectRevenueDeclaration(declarationId: string, adminUserId: string, reason: string) {
  const admin = createAdminClient();
  const { data: declaration, error } = await admin
    .from("revenue_declarations")
    .update({ review_status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUserId, rejection_reason: reason })
    .eq("id", declarationId)
    .select("user_id, period, label")
    .single();
  if (error || !declaration) throw new Error(error?.message ?? "Déclaration introuvable.");

  await recomputeManualSnapshot(declaration.user_id, declaration.period);
  await refreshRevenueVerifiedFlag(declaration.user_id);

  await createNotificationForUser({
    userId: declaration.user_id,
    type: "revenue_review_completed",
    title: "Déclaration de revenu refusée",
    body: `Ta déclaration${declaration.label ? ` « ${declaration.label} »` : ""} n'a pas été validée : ${reason}`,
    metadata: { period: declaration.period },
  });
}
