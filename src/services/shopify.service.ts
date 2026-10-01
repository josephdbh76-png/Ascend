import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopifyAccessToken, fetchShopifyOrdersPage, isValidShopDomain, SHOPIFY_API_VERSION, type ShopifyOrder } from "@/lib/shopify";
import {
  refreshRevenueVerifiedFlag,
  syncWindowStart,
  addToMonth,
  writeSourceMonths,
  type MonthTotal,
} from "@/services/revenue.service";
import { euroConverter, minorUnitFactor } from "@/lib/fx";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { createNotificationForUser } from "@/services/notification.service";
import { afterRevenueSync } from "@/services/progress.service";

const MONTHS_OF_HISTORY = 6;

/** Reads a shop's stored client credentials — service role only, see the provider_credentials migration. */
async function getStoredShopifyCredentials(
  revenueSourceId: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("provider_credentials")
    .select("client_id, client_secret")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const clientSecret = decryptSecret(data?.client_secret);
  return data && clientSecret ? { clientId: data.client_id, clientSecret } : null;
}

/**
 * Shopify has no equivalent to Stripe Connect Standard, where a platform
 * calls any connected account using its own secret key — every shop's API
 * calls need their own credentials. It also has no OAuth path that lets an
 * arbitrary, unrelated merchant install a third-party app without either a
 * Shopify Plus organization or a reviewed App Store listing — neither fits
 * ASCEND's members, who each run their own independent, unrelated store.
 *
 * The practical, review-free path Shopify does support: each member
 * creates their own Dev Dashboard app, installs it on their own store (so
 * it belongs to the same Shopify organization as that store), and pastes
 * its client_id + client_secret into ASCEND — exactly like they'd create
 * their own Stripe account rather than sharing one. This function mints a
 * token from those credentials to confirm they actually work before
 * storing anything.
 */
export async function connectShopifyWithCredentials(userId: string, shop: string, clientId: string, clientSecret: string) {
  if (!isValidShopDomain(shop)) {
    throw new Error("Adresse de boutique invalide — elle doit ressembler à ma-boutique.myshopify.com.");
  }

  const token = await getShopifyAccessToken(shop, clientId, clientSecret);
  if (!token) {
    throw new Error(
      "Impossible d'obtenir un accès avec ces identifiants. Vérifie que l'app est bien installée sur cette boutique.",
    );
  }

  const supabase = createAdminClient();
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
    .upsert(
      { revenue_source_id: source.id, client_id: clientId, client_secret: encryptSecret(clientSecret) },
      { onConflict: "revenue_source_id" },
    );
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


// current_total_price already excludes refunded items, so a partially
// refunded order still counts for what was kept.
function isRevenueBearingOrder(order: ShopifyOrder): boolean {
  return (
    order.cancelled_at == null &&
    ["paid", "partially_paid", "partially_refunded"].includes(order.financial_status)
  );
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
  const supabase = createAdminClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const credentials = await getStoredShopifyCredentials(revenueSourceId);
  const accessToken = credentials ? await getShopifyAccessToken(shop, credentials.clientId, credentials.clientSecret) : null;
  if (!accessToken) {
    const message = "Impossible d'obtenir un accès Shopify. Reconnecte ta boutique depuis les réglages.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const sinceDate = syncWindowStart(MONTHS_OF_HISTORY);

  try {
    const sales: { amount: number; currency: string; at: string; customer: string | null }[] = [];
    let url: string | null =
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250&created_at_min=${sinceDate.toISOString()}`;

    while (url) {
      const { orders, nextUrl } = await fetchShopifyOrdersPage(url, accessToken);
      for (const order of orders) {
        if (!isRevenueBearingOrder(order)) continue;
        const money = order.current_total_price_set?.shop_money;
        const currency = money?.currency_code ?? order.currency ?? "EUR";
        const amount = Math.round(parseFloat(money?.amount ?? order.current_total_price) * minorUnitFactor(currency));
        sales.push({ amount, currency, at: order.created_at, customer: order.customer?.id != null ? String(order.customer.id) : null });
      }
      url = nextUrl;
    }

    const toEur = await euroConverter(
      sales.map((s) => s.currency),
      sinceDate,
    );
    const months = new Map<string, MonthTotal>();
    for (const sale of sales) {
      addToMonth(months, sale.at, toEur(sale.amount, sale.currency, sale.at), { countsAsSale: true, customerId: sale.customer });
    }
    const monthsWithRevenue = await writeSourceMonths(userId, revenueSourceId, months, sinceDate);

    const hasVerifiableRevenue = monthsWithRevenue > 0;

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

    await refreshRevenueVerifiedFlag(userId);

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

    const { currentRevenueCents, rank, milestoneCents } = await afterRevenueSync(userId);

    if (!wasAlreadyVerified) {
      await createNotificationForUser({
        userId,
        type: "verification_completed",
        title: "Revenus vérifiés",
        body: "Ton activité est désormais vérifiée sur ASCEND.",
      });
    }

    return {
      success: true as const,
      monthsSynced: monthsWithRevenue,
      isFirstVerification: !wasAlreadyVerified,
      currentRevenueCents,
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
  const supabase = createAdminClient();
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

  // These credentials mint live access against the member's real store —
  // drop them immediately on disconnect rather than leaving them dormant.
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
