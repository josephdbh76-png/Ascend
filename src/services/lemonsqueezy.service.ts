import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLemonSqueezyKey, fetchAllOrders, type LsOrder } from "@/lib/lemonsqueezy";
import {
  upsertMonthlyRevenue,
  getCurrentRevenue,
  calculateMonthlyGrowth,
  nextRevenueMilestone,
  refreshRevenueVerifiedFlag,
} from "@/services/revenue.service";
import { evaluateRevenueAchievements, evaluateRankAchievements } from "@/services/achievement.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { createNotification } from "@/services/notification.service";
import { getUserRank } from "@/services/leaderboard.service";
import { evaluateEarnedTitles } from "@/services/title.service";
import { getProfile } from "@/services/profile.service";

const MONTHS_OF_HISTORY = 6;

/** A single API key authenticates every request — no client_id needed, unlike Shopify/PayPal, so it's stored empty in the shared credentials table. */
async function getStoredLemonSqueezyKey(revenueSourceId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("provider_credentials").select("client_secret").eq("revenue_source_id", revenueSourceId).maybeSingle();
  return data?.client_secret ?? null;
}

export async function connectLemonSqueezyWithKey(userId: string, apiKey: string) {
  const valid = await verifyLemonSqueezyKey(apiKey);
  if (!valid) throw new Error("Clé API invalide — vérifie qu'elle vient bien de Settings → API sur Lemon Squeezy.");

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      { user_id: userId, provider: "lemonsqueezy", status: "connected", is_test_mode: false, connected_at: new Date().toISOString() },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();
  if (error || !source) throw new Error(error?.message ?? "Impossible d'enregistrer la connexion Lemon Squeezy.");

  const { error: credentialError } = await admin
    .from("provider_credentials")
    .upsert({ revenue_source_id: source.id, client_id: "", client_secret: apiKey }, { onConflict: "revenue_source_id" });
  if (credentialError) throw new Error(credentialError.message);

  await supabase.from("verifications").upsert(
    { revenue_source_id: source.id, status: "unverified", last_checked_at: new Date().toISOString() },
    { onConflict: "revenue_source_id" },
  );

  const syncResult = await syncLemonSqueezyRevenue(userId, source.id, apiKey);
  return { source, syncResult };
}

function periodKeyFromIsoDate(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function isRevenueBearingOrder(order: LsOrder): boolean {
  return order.attributes.status === "paid" && !order.attributes.refunded;
}

/** Mirrors syncShopifyRevenue's shape exactly — same downstream achievements/challenges/titles evaluation, fed from Lemon Squeezy's Orders API instead. */
export async function syncLemonSqueezyRevenue(userId: string, revenueSourceId: string, apiKeyOverride?: string) {
  const supabase = await createClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const apiKey = apiKeyOverride ?? (await getStoredLemonSqueezyKey(revenueSourceId));
  if (!apiKey) {
    const message = "Impossible d'obtenir un accès Lemon Squeezy — reconnecte ton compte depuis les réglages.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - MONTHS_OF_HISTORY);

  try {
    const orders = await fetchAllOrders(apiKey, sinceDate);

    const monthlyTotals = new Map<string, number>();
    const monthlyTransactionCounts = new Map<string, number>();

    for (const order of orders) {
      if (!isRevenueBearingOrder(order)) continue;
      const period = periodKeyFromIsoDate(order.attributes.created_at);
      monthlyTotals.set(period, (monthlyTotals.get(period) ?? 0) + order.attributes.total);
      monthlyTransactionCounts.set(period, (monthlyTransactionCounts.get(period) ?? 0) + 1);
    }

    for (const [period, amountCents] of monthlyTotals.entries()) {
      await upsertMonthlyRevenue({
        userId,
        revenueSourceId,
        period,
        amountCents,
        currency: "EUR",
        isVerified: true,
        transactionCount: monthlyTransactionCounts.get(period) ?? 0,
      });
    }

    const hasVerifiableRevenue = monthlyTotals.size > 0;

    await supabase
      .from("verifications")
      .update({
        status: hasVerifiableRevenue ? "verified" : "unverified",
        verified_at: hasVerifiableRevenue ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
        error_message: hasVerifiableRevenue ? null : "Aucune commande trouvée sur les 6 derniers mois.",
      })
      .eq("revenue_source_id", revenueSourceId);

    await supabase.from("revenue_sources").update({ last_synced_at: new Date().toISOString(), status: "connected" }).eq("id", revenueSourceId);
    await refreshRevenueVerifiedFlag(userId);

    if (!hasVerifiableRevenue) {
      return { success: true as const, monthsSynced: 0, isFirstVerification: false, currentRevenueCents: null, rank: null, milestoneCents: null };
    }

    const { current, previous } = await getCurrentRevenue(userId);
    let rank: number | null = null;
    let milestoneCents: number | null = null;

    if (current) {
      const growth = calculateMonthlyGrowth(current.amountCents, previous?.amountCents ?? null);
      await evaluateRevenueAchievements(userId, current.amountCents);
      await evaluateChallengeProgress(userId, current.amountCents, growth);

      const rankResult = await getUserRank(userId, "global", "");
      if (rankResult) {
        rank = rankResult.rank;
        await evaluateRankAchievements(userId, rankResult.rank);
      }
      milestoneCents = nextRevenueMilestone(current.amountCents).targetCents;

      const profile = await getProfile(userId);
      await evaluateEarnedTitles(userId, {
        revenueCents: current.amountCents,
        growthPercent: growth,
        globalRank: rank,
        foundingMemberNumber: profile?.foundingMemberNumber ?? null,
        isVerified: true,
      });
    }

    if (!wasAlreadyVerified) {
      await createNotification({ userId, type: "verification_completed", title: "Revenus vérifiés", body: "Ton activité est désormais vérifiée sur ASCEND." });
    }

    return {
      success: true as const,
      monthsSynced: monthlyTotals.size,
      isFirstVerification: !wasAlreadyVerified,
      currentRevenueCents: current?.amountCents ?? null,
      rank,
      milestoneCents,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Lemon Squeezy error.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectLemonSqueezySource(userId: string, revenueSourceId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  await supabase.from("revenue_sources").update({ status: "disconnected" }).eq("id", revenueSourceId).eq("user_id", userId);
  await supabase.from("verifications").update({ status: "disconnected", last_checked_at: new Date().toISOString() }).eq("revenue_source_id", revenueSourceId);
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
