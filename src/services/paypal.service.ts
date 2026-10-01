import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayPalAccessToken, fetchTransactionsSince, type PayPalTransaction } from "@/lib/paypal";
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

async function getStoredPayPalCredentials(revenueSourceId: string): Promise<{ clientId: string; clientSecret: string } | null> {
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
 * Each member creates their own PayPal REST app (in their own PayPal
 * developer account) with Transaction Search enabled, exactly like their
 * own Stripe/Shopify account — ASCEND isn't a reviewed PayPal platform
 * partner. Mirrors connectShopifyWithCredentials's shape exactly.
 */
export async function connectPayPalWithCredentials(userId: string, clientId: string, clientSecret: string) {
  const token = await getPayPalAccessToken(clientId, clientSecret);
  if (!token) {
    throw new Error("Impossible de s'authentifier avec ces identifiants — vérifie l'ID client et le secret.");
  }

  const supabase = createAdminClient();
  const admin = createAdminClient();

  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      { user_id: userId, provider: "paypal", status: "connected", is_test_mode: false, connected_at: new Date().toISOString() },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();
  if (error || !source) throw new Error(error?.message ?? "Impossible d'enregistrer la connexion PayPal.");

  const { error: credentialError } = await admin
    .from("provider_credentials")
    .upsert(
      { revenue_source_id: source.id, client_id: clientId, client_secret: encryptSecret(clientSecret) },
      { onConflict: "revenue_source_id" },
    );
  if (credentialError) throw new Error(credentialError.message);

  await supabase.from("verifications").upsert(
    { revenue_source_id: source.id, status: "unverified", last_checked_at: new Date().toISOString() },
    { onConflict: "revenue_source_id" },
  );

  const syncResult = await syncPayPalRevenue(userId, source.id, clientId, clientSecret);
  return { source, syncResult };
}


/**
 * Only money received for a sale counts: payments (T00xx) in, refunds and
 * reversals (T11xx) out. Bank top-ups, holds, currency conversions and
 * transfers between balances are movements, not revenue.
 */
function revenueMovement(t: PayPalTransaction): { amount: number; sale: boolean } | null {
  const info = t.transaction_info;
  if (info.transaction_status !== "S") return null;
  const code = info.transaction_event_code ?? "";
  const value = parseFloat(info.transaction_amount.value);
  if (!Number.isFinite(value) || value === 0) return null;
  if (code.startsWith("T00") && value > 0) return { amount: value, sale: true };
  if (code.startsWith("T11") && value < 0) return { amount: value, sale: false };
  return null;
}

/** Mirrors syncShopifyRevenue's shape exactly — same downstream achievements/challenges/titles evaluation, fed from PayPal's Transaction Search API instead. */
export async function syncPayPalRevenue(
  userId: string,
  revenueSourceId: string,
  clientIdOverride?: string,
  clientSecretOverride?: string,
) {
  const supabase = createAdminClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  let clientId = clientIdOverride;
  let clientSecret = clientSecretOverride;
  if (!clientId || !clientSecret) {
    const stored = await getStoredPayPalCredentials(revenueSourceId);
    clientId = stored?.clientId;
    clientSecret = stored?.clientSecret;
  }

  const accessToken = clientId && clientSecret ? await getPayPalAccessToken(clientId, clientSecret) : null;
  if (!accessToken) {
    const message = "Impossible d'obtenir un accès PayPal. Reconnecte ton compte depuis les réglages.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }

  const sinceDate = syncWindowStart(MONTHS_OF_HISTORY);

  try {
    const transactions = await fetchTransactionsSince(accessToken, sinceDate);
    const kept = transactions
      .map((t) => ({ t, movement: revenueMovement(t) }))
      .filter((x): x is { t: PayPalTransaction; movement: { amount: number; sale: boolean } } => x.movement !== null);

    const toEur = await euroConverter(
      kept.map((x) => x.t.transaction_info.transaction_amount.currency_code),
      sinceDate,
    );
    const months = new Map<string, MonthTotal>();
    for (const { t, movement } of kept) {
      const currency = t.transaction_info.transaction_amount.currency_code;
      const at = t.transaction_info.transaction_initiation_date;
      const minor = Math.round(movement.amount * minorUnitFactor(currency));
      addToMonth(months, at, toEur(minor, currency, at), {
        countsAsSale: movement.sale,
        customerId: movement.sale ? (t.payer_info?.account_id ?? t.payer_info?.email_address ?? null) : null,
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
        error_message: hasVerifiableRevenue ? null : "Aucune transaction trouvée sur les 6 derniers mois.",
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
    const message = err instanceof Error ? err.message : "Unknown PayPal error.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectPayPalSource(userId: string, revenueSourceId: string) {
  const supabase = createAdminClient();
  const admin = createAdminClient();

  await supabase.from("revenue_sources").update({ status: "disconnected" }).eq("id", revenueSourceId).eq("user_id", userId);
  await supabase.from("verifications").update({ status: "disconnected", last_checked_at: new Date().toISOString() }).eq("revenue_source_id", revenueSourceId);
  await admin.from("provider_credentials").delete().eq("revenue_source_id", revenueSourceId);
}
