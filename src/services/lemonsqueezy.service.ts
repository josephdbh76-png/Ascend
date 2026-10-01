import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLemonSqueezyKey, fetchAllOrders, type LsOrder } from "@/lib/lemonsqueezy";
import {
  refreshRevenueVerifiedFlag,
  syncWindowStart,
  addToMonth,
  writeSourceMonths,
  type MonthTotal,
} from "@/services/revenue.service";
import { euroConverter } from "@/lib/fx";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { createNotificationForUser } from "@/services/notification.service";
import { afterRevenueSync } from "@/services/progress.service";

const MONTHS_OF_HISTORY = 6;

/** A single API key authenticates every request — no client_id needed, unlike Shopify/PayPal, so it's stored empty in the shared credentials table. */
async function getStoredLemonSqueezyKey(revenueSourceId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("provider_credentials").select("client_secret").eq("revenue_source_id", revenueSourceId).maybeSingle();
  return decryptSecret(data?.client_secret);
}

export async function connectLemonSqueezyWithKey(userId: string, apiKey: string) {
  const valid = await verifyLemonSqueezyKey(apiKey);
  if (!valid) throw new Error("Clé API invalide — vérifie qu'elle vient bien de Settings → API sur Lemon Squeezy.");

  const supabase = createAdminClient();
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
    .upsert({ revenue_source_id: source.id, client_id: "", client_secret: encryptSecret(apiKey) }, { onConflict: "revenue_source_id" });
  if (credentialError) throw new Error(credentialError.message);

  await supabase.from("verifications").upsert(
    { revenue_source_id: source.id, status: "unverified", last_checked_at: new Date().toISOString() },
    { onConflict: "revenue_source_id" },
  );

  const syncResult = await syncLemonSqueezyRevenue(userId, source.id, apiKey);
  return { source, syncResult };
}


// A partially refunded order still counts for what was kept.
function keptCents(order: LsOrder): number {
  const a = order.attributes;
  if (a.status !== "paid" && a.status !== "partial_refund") return 0;
  if (a.refunded && a.status !== "partial_refund") return 0;
  return Math.max(0, a.total - (a.refunded_amount ?? 0));
}

/** Mirrors syncShopifyRevenue's shape exactly — same downstream achievements/challenges/titles evaluation, fed from Lemon Squeezy's Orders API instead. */
export async function syncLemonSqueezyRevenue(userId: string, revenueSourceId: string, apiKeyOverride?: string) {
  const supabase = createAdminClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const apiKey = apiKeyOverride ?? (await getStoredLemonSqueezyKey(revenueSourceId));
  if (!apiKey) {
    const message = "Impossible d'obtenir un accès Lemon Squeezy. Reconnecte ton compte depuis les réglages.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const sinceDate = syncWindowStart(MONTHS_OF_HISTORY);

  try {
    const orders = (await fetchAllOrders(apiKey, sinceDate)).filter((o) => keptCents(o) > 0);
    const toEur = await euroConverter(
      orders.map((o) => o.attributes.currency),
      sinceDate,
    );
    const months = new Map<string, MonthTotal>();
    for (const order of orders) {
      const at = order.attributes.created_at;
      addToMonth(months, at, toEur(keptCents(order), order.attributes.currency, at), {
        countsAsSale: true,
        customerId: order.attributes.customer_id != null ? String(order.attributes.customer_id) : order.attributes.user_email,
      });
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

    await supabase.from("revenue_sources").update({ last_synced_at: new Date().toISOString(), status: "connected" }).eq("id", revenueSourceId);
    await refreshRevenueVerifiedFlag(userId);

    if (!hasVerifiableRevenue) {
      return { success: true as const, monthsSynced: 0, isFirstVerification: false, currentRevenueCents: null, rank: null, milestoneCents: null };
    }

    const { currentRevenueCents, rank, milestoneCents } = await afterRevenueSync(userId);

    if (!wasAlreadyVerified) {
      await createNotificationForUser({ userId, type: "verification_completed", title: "Revenus vérifiés", body: "Ton activité est désormais vérifiée sur ASCEND." });
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
    const message = err instanceof Error ? err.message : "Unknown Lemon Squeezy error.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectLemonSqueezySource(userId: string, revenueSourceId: string) {
  const supabase = createAdminClient();
  const admin = createAdminClient();

  await supabase.from("revenue_sources").update({ status: "disconnected" }).eq("id", revenueSourceId).eq("user_id", userId);
  await supabase.from("verifications").update({ status: "disconnected", last_checked_at: new Date().toISOString() }).eq("revenue_source_id", revenueSourceId);
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
