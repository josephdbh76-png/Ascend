import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getGoCardlessAccessToken,
  listInstitutions,
  createRequisition,
  getRequisition,
  getAccountTransactions,
  type Institution,
} from "@/lib/gocardless";
import { setSourceRevenueForPeriod, refreshRevenueVerifiedFlag } from "@/services/revenue.service";
import { getAppUrl } from "@/lib/utils";

const CONSENT_VALID_DAYS = 90;

export async function listBankInstitutions(country: string): Promise<Institution[]> {
  const token = await getGoCardlessAccessToken();
  return listInstitutions(token, country);
}

/**
 * Starts a PSD2 consent flow for one bank. Returns the link the member's
 * browser must be redirected to (their own bank's login/consent screen) —
 * ASCEND never sees their banking credentials, only what the bank later
 * hands back through GoCardless once they've approved access.
 */
export async function initiateBankConnection(
  userId: string,
  institutionId: string,
  institutionName: string,
): Promise<{ link: string }> {
  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: "bank",
        status: "connected",
        external_account_id: institutionName,
        is_test_mode: false,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();
  if (error || !source) throw new Error(error?.message ?? "Impossible d'enregistrer la connexion bancaire.");

  const token = await getGoCardlessAccessToken();
  const redirectUrl = `${getAppUrl()}/api/bank/callback?source_id=${source.id}`;
  const requisition = await createRequisition(token, institutionId, redirectUrl, source.id);

  const { error: connectionError } = await supabase.from("bank_connections").upsert(
    {
      user_id: userId,
      revenue_source_id: source.id,
      requisition_id: requisition.id,
      institution_id: institutionId,
      institution_name: institutionName,
    },
    { onConflict: "revenue_source_id" },
  );
  if (connectionError) throw new Error(connectionError.message);

  await supabase.from("verifications").upsert(
    { revenue_source_id: source.id, status: "unverified", last_checked_at: new Date().toISOString() },
    { onConflict: "revenue_source_id" },
  );

  return { link: requisition.link };
}

/**
 * Called from the callback route once the member has finished
 * authenticating with their bank — picks up the now-authorized account
 * ids and pulls the first batch of transactions.
 */
export async function finalizeBankConnection(sourceId: string): Promise<{ userId: string }> {
  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("bank_connections")
    .select("id, requisition_id, user_id")
    .eq("revenue_source_id", sourceId)
    .maybeSingle();
  if (error || !connection) throw new Error("Connexion bancaire introuvable.");

  const token = await getGoCardlessAccessToken();
  const requisition = await getRequisition(token, connection.requisition_id);

  await admin
    .from("bank_connections")
    .update({
      account_ids: requisition.accounts,
      expires_at: new Date(Date.now() + CONSENT_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("revenue_source_id", sourceId);

  await admin.from("revenue_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", sourceId);

  if (requisition.accounts.length > 0) {
    await syncBankTransactions(connection.user_id, sourceId);
  }

  return { userId: connection.user_id };
}

function periodKeyFromDateString(dateStr: string): string {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/**
 * Pulls incoming (credit) transactions from every connected account.
 * Deliberately never touches is_revenue: the unique constraint on
 * (revenue_source_id, external_id) plus ignoreDuplicates means a resync
 * only ever adds transactions the member hasn't seen before — it can
 * never silently reset a tagging choice they already made.
 */
export async function syncBankTransactions(
  userId: string,
  revenueSourceId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("bank_connections")
    .select("account_ids")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  if (!connection || connection.account_ids.length === 0) {
    return { success: false, error: "Aucun compte bancaire connecté." };
  }

  try {
    const token = await getGoCardlessAccessToken();

    for (const accountId of connection.account_ids) {
      const transactions = await getAccountTransactions(token, accountId);
      const credits = transactions.filter((t) => parseFloat(t.transactionAmount.amount) > 0);
      if (credits.length === 0) continue;

      const rows = credits.map((t) => ({
        user_id: userId,
        revenue_source_id: revenueSourceId,
        external_id: t.transactionId ?? t.internalTransactionId ?? `${accountId}-${t.bookingDate}-${t.transactionAmount.amount}`,
        account_id: accountId,
        booking_date: t.bookingDate,
        amount_cents: Math.round(parseFloat(t.transactionAmount.amount) * 100),
        currency: t.transactionAmount.currency,
        counterparty: t.debtorName ?? t.creditorName ?? null,
        description: t.remittanceInformationUnstructured ?? null,
      }));

      const { error } = await admin
        .from("bank_transactions")
        .upsert(rows, { onConflict: "revenue_source_id,external_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }

    await admin.from("revenue_sources").update({ last_synced_at: new Date().toISOString(), status: "connected" }).eq("id", revenueSourceId);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    await admin
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false, error: message };
  }
}

export interface BankTransactionRow {
  id: string;
  bookingDate: string;
  amountCents: number;
  currency: string;
  counterparty: string | null;
  description: string | null;
  isRevenue: boolean;
}

export async function listBankTransactions(userId: string, revenueSourceId: string): Promise<BankTransactionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("id, booking_date, amount_cents, currency, counterparty, description, is_revenue")
    .eq("user_id", userId)
    .eq("revenue_source_id", revenueSourceId)
    .order("booking_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((t) => ({
    id: t.id,
    bookingDate: t.booking_date,
    amountCents: t.amount_cents,
    currency: t.currency,
    counterparty: t.counterparty,
    description: t.description,
    isRevenue: t.is_revenue,
  }));
}

/**
 * A member checking/unchecking one transaction as revenue recomputes
 * that whole month's total from every currently-tagged transaction in
 * it — never just adds or subtracts this one row — so the figure always
 * matches exactly what's checked, even after toggling several back and
 * forth.
 */
export async function setTransactionRevenueTag(userId: string, transactionId: string, isRevenue: boolean): Promise<void> {
  const supabase = await createClient();
  const { data: txn, error } = await supabase
    .from("bank_transactions")
    .update({ is_revenue: isRevenue })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("revenue_source_id, booking_date")
    .single();
  if (error || !txn) throw new Error(error?.message ?? "Transaction introuvable.");

  const period = periodKeyFromDateString(txn.booking_date);
  const periodStart = period;
  const periodEnd = new Date(new Date(period).setUTCMonth(new Date(period).getUTCMonth() + 1)).toISOString().slice(0, 10);

  const admin = createAdminClient();
  const { data: tagged } = await admin
    .from("bank_transactions")
    .select("amount_cents")
    .eq("revenue_source_id", txn.revenue_source_id)
    .eq("is_revenue", true)
    .gte("booking_date", periodStart)
    .lt("booking_date", periodEnd);

  const amountCents = (tagged ?? []).reduce((sum, t) => sum + t.amount_cents, 0);

  await setSourceRevenueForPeriod(userId, txn.revenue_source_id, period, amountCents, {
    transactionCount: tagged?.length ?? 0,
  });

  // This source's per-connection badge in Settings reflects whether ANY
  // period has tagged revenue at all, not just the one just edited.
  const { count } = await admin
    .from("revenue_source_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("revenue_source_id", txn.revenue_source_id);

  await admin
    .from("verifications")
    .update({
      status: (count ?? 0) > 0 ? "verified" : "unverified",
      verified_at: (count ?? 0) > 0 ? new Date().toISOString() : null,
      last_checked_at: new Date().toISOString(),
    })
    .eq("revenue_source_id", txn.revenue_source_id);

  await refreshRevenueVerifiedFlag(userId);
}

export async function disconnectBankSource(userId: string, revenueSourceId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.from("revenue_sources").update({ status: "disconnected" }).eq("id", revenueSourceId).eq("user_id", userId);
  await supabase
    .from("verifications")
    .update({ status: "disconnected", last_checked_at: new Date().toISOString() })
    .eq("revenue_source_id", revenueSourceId);
}
