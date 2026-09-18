import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildShopifyAuthorizeUrl,
  exchangeShopifyCode,
  fetchShopifyOrdersPage,
  SHOPIFY_API_VERSION,
  type ShopifyOrder,
} from "@/lib/shopify";
import { upsertMonthlyRevenue, getCurrentRevenue, calculateMonthlyGrowth, nextRevenueMilestone } from "@/services/revenue.service";
import { evaluateRevenueAchievements, evaluateRankAchievements } from "@/services/achievement.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { createNotification } from "@/services/notification.service";
import { getUserRank } from "@/services/leaderboard.service";
import { evaluateEarnedTitles } from "@/services/title.service";
import { getProfile } from "@/services/profile.service";

const MONTHS_OF_HISTORY = 6;

export function buildShopifyConnectUrl(shop: string, userId: string, appUrl: string): string {
  return buildShopifyAuthorizeUrl(shop, userId, appUrl);
}

/** Reads a shop's stored access token — service role only, see the provider_credentials migration. */
async function getShopifyAccessToken(revenueSourceId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("provider_credentials")
    .select("access_token")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  return data?.access_token ?? null;
}

export async function handleShopifyOAuthCallback(shop: string, code: string, userId: string) {
  const accessToken = await exchangeShopifyCode(shop, code);

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: "shopify",
        status: "connected",
        external_account_id: shop,
        is_test_mode: false,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();

  if (error || !source) {
    throw new Error(error?.message ?? "Could not save the Shopify connection.");
  }

  const { error: credentialError } = await admin
    .from("provider_credentials")
    .upsert({ revenue_source_id: source.id, access_token: accessToken }, { onConflict: "revenue_source_id" });
  if (credentialError) throw new Error(credentialError.message);

  await supabase.from("verifications").upsert(
    {
      revenue_source_id: source.id,
      status: "unverified",
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: "revenue_source_id" },
  );

  const syncResult = await syncShopifyRevenue(userId, source.id, shop);

  return { source, syncResult };
}

function periodKeyFromIsoDate(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function isRevenueBearingOrder(order: ShopifyOrder): boolean {
  return order.cancelled_at == null && (order.financial_status === "paid" || order.financial_status === "partially_paid");
}

/**
 * Pulls orders for the shop, aggregates them into normalized monthly
 * revenue snapshots, and marks the source verified only once real data was
 * actually retrieved successfully. Mirrors syncStripeRevenue's shape
 * exactly — same downstream achievements/challenges/titles evaluation —
 * just fed from Shopify's orders API and cursor-based pagination instead
 * of Stripe's charges.
 */
export async function syncShopifyRevenue(userId: string, revenueSourceId: string, shop: string) {
  const supabase = await createClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const accessToken = await getShopifyAccessToken(revenueSourceId);
  if (!accessToken) {
    const message = "No stored Shopify access token for this connection.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - MONTHS_OF_HISTORY);

  try {
    const monthlyTotals = new Map<string, number>();
    const monthlyTransactionCounts = new Map<string, number>();
    const monthlyCustomers = new Map<string, Set<number>>();

    let url: string | null =
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250&created_at_min=${sinceDate.toISOString()}`;

    while (url) {
      const { orders, nextUrl } = await fetchShopifyOrdersPage(url, accessToken);
      for (const order of orders) {
        if (!isRevenueBearingOrder(order)) continue;
        const period = periodKeyFromIsoDate(order.created_at);
        // Shopify prices are decimal strings ("129.99"), everywhere else in
        // ASCEND revenue is integer cents — convert once, at the boundary.
        const amountCents = Math.round(parseFloat(order.current_total_price) * 100);
        monthlyTotals.set(period, (monthlyTotals.get(period) ?? 0) + amountCents);
        monthlyTransactionCounts.set(period, (monthlyTransactionCounts.get(period) ?? 0) + 1);

        if (order.customer?.id != null) {
          if (!monthlyCustomers.has(period)) monthlyCustomers.set(period, new Set());
          monthlyCustomers.get(period)!.add(order.customer.id);
        }
      }
      url = nextUrl;
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
        customerCount: monthlyCustomers.get(period)?.size ?? 0,
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

    await supabase
      .from("revenue_sources")
      .update({ last_synced_at: new Date().toISOString(), status: "connected" })
      .eq("id", revenueSourceId);

    await supabase.from("profiles").update({ revenue_verified: hasVerifiableRevenue }).eq("id", userId);

    if (!hasVerifiableRevenue) {
      return {
        success: true as const,
        monthsSynced: 0,
        isFirstVerification: false,
        currentRevenueCents: null,
        rank: null,
        milestoneCents: null,
      };
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
      await createNotification({
        userId,
        type: "verification_completed",
        title: "Revenus vérifiés",
        body: "Ton activité est désormais vérifiée sur ASCEND.",
      });
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
    const message = err instanceof Error ? err.message : "Unknown Shopify error.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectShopifySource(userId: string, revenueSourceId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  await supabase
    .from("revenue_sources")
    .update({ status: "disconnected" })
    .eq("id", revenueSourceId)
    .eq("user_id", userId);

  await supabase
    .from("verifications")
    .update({ status: "disconnected", last_checked_at: new Date().toISOString() })
    .eq("revenue_source_id", revenueSourceId);

  // The access token is a live credential against the member's real store —
  // drop it immediately on disconnect rather than leaving it dormant.
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
