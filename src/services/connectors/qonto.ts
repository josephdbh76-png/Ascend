import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWindowStart, periodKey, type MonthTotal } from "@/services/revenue.service";
import { callApi, required, MAX_PAGES, type ConnectorImpl, type Fields } from "./shared";

// Qonto's own Business API, read with the member's login and secret key: no
// aggregator in between, so it costs nothing. A business account also
// receives money that isn't revenue (capital, loans, transfers between the
// member's accounts), so incoming transactions go to "Mes transactions" like
// a bank connection. Customer payments are ticked in advance, the member
// unticks what isn't revenue, and a resync never overrides their choice.

const API = "https://thirdparty.qonto.com/v2";

type QontoAccount = { id: string; iban?: string | null; currency?: string; status?: string };
type QontoOrganization = { slug?: string; legal_name?: string | null; bank_accounts?: QontoAccount[] };
type QontoTransaction = {
  id: string;
  transaction_id?: string;
  amount_cents: number;
  currency: string;
  side: string;
  status: string;
  operation_type: string;
  label?: string | null;
  reference?: string | null;
  note?: string | null;
  settled_at?: string | null;
  emitted_at?: string | null;
  transfer?: { counterparty_account_number?: string | null } | null;
};

// What a customer pays with. Capital deposits, financing, account interest,
// refunds of card payments (recall) and "other" stay unticked.
const CUSTOMER_PAYMENT_TYPES = new Set([
  "transfer",
  "swift_income",
  "income",
  "cheque",
  "direct_debit_collection",
  "card_acquirer_payout",
]);

// Payouts from processors that connect directly: ticking them as well would
// count the same sales twice.
const PROCESSOR_LABELS: Record<string, RegExp> = {
  stripe: /stripe/i,
  paypal: /paypal/i,
  shopify: /shopify/i,
  lemonsqueezy: /lemon\s*squeezy/i,
  mollie: /mollie/i,
  paddle: /paddle/i,
  gumroad: /gumroad/i,
  whop: /whop/i,
};

function auth(fields: Fields) {
  const login = required(fields, "login", "ton identifiant Qonto");
  const secret = required(fields, "secretKey", "ta clé secrète Qonto");
  return { Authorization: `${login}:${secret}` };
}

async function organization(fields: Fields): Promise<QontoOrganization> {
  const body = (await (await callApi("Qonto", `${API}/organization`, { headers: auth(fields) })).json()) as {
    organization?: QontoOrganization;
  };
  if (!body.organization) throw new Error("Qonto n'a renvoyé aucune société pour ces identifiants.");
  return body.organization;
}

const normalize = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const compactIban = (s: string | null | undefined) => (s ?? "").replace(/\s/g, "").toUpperCase();

export function looksLikeCustomerPayment(
  t: QontoTransaction,
  ctx: { ownIbans: Set<string>; legalName: string; connectedProcessors: string[] },
): boolean {
  if (!CUSTOMER_PAYMENT_TYPES.has(t.operation_type)) return false;
  const counterparty = compactIban(t.transfer?.counterparty_account_number);
  if (counterparty && ctx.ownIbans.has(counterparty)) return false;
  if (ctx.legalName && normalize(t.label) === ctx.legalName) return false;
  const text = `${t.label ?? ""} ${t.reference ?? ""}`;
  return !ctx.connectedProcessors.some((p) => PROCESSOR_LABELS[p]?.test(text));
}

export const qonto: ConnectorImpl = {
  async validate(fields) {
    const org = await organization(fields);
    return { accountLabel: org.legal_name ?? org.slug ?? null };
  },

  async fetchMonths(fields, since, ctx) {
    const org = await organization(fields);
    const accounts = (org.bank_accounts ?? []).filter((a) => a.status !== "closed");
    const admin = createAdminClient();
    const { data: otherSources } = await admin
      .from("revenue_sources")
      .select("provider")
      .eq("user_id", ctx.userId)
      .eq("status", "connected")
      .neq("id", ctx.revenueSourceId);
    const tagCtx = {
      ownIbans: new Set(accounts.map((a) => compactIban(a.iban)).filter(Boolean)),
      legalName: normalize(org.legal_name),
      connectedProcessors: (otherSources ?? []).map((s) => s.provider),
    };

    for (const account of accounts) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const params = new URLSearchParams({
          bank_account_id: account.id,
          side: "credit",
          "status[]": "completed",
          settled_at_from: since.toISOString(),
          sort_by: "settled_at:asc",
          per_page: "100",
          page: String(page),
        });
        const body = (await (await callApi("Qonto", `${API}/transactions?${params}`, { headers: auth(fields) })).json()) as {
          transactions?: QontoTransaction[];
          meta?: { next_page?: number | null };
        };
        const rows = (body.transactions ?? [])
          .filter((t) => t.side === "credit" && t.status === "completed" && t.amount_cents > 0)
          .map((t) => ({
            user_id: ctx.userId,
            revenue_source_id: ctx.revenueSourceId,
            external_id: t.id,
            account_id: account.id,
            booking_date: (t.settled_at ?? t.emitted_at ?? new Date().toISOString()).slice(0, 10),
            amount_cents: t.amount_cents,
            currency: t.currency,
            counterparty: t.label ?? null,
            description: [t.reference, t.note].filter(Boolean).join(" · ") || null,
            is_revenue: looksLikeCustomerPayment(t, tagCtx),
          }));
        if (rows.length > 0) {
          // Rows already synced keep the member's tick.
          const { error } = await admin
            .from("bank_transactions")
            .upsert(rows, { onConflict: "revenue_source_id,external_id", ignoreDuplicates: true });
          if (error) throw new Error(error.message);
        }
        if (!body.meta?.next_page) break;
      }
    }

    return taggedMonths(ctx.revenueSourceId, since);
  },
};

/** Months from the transactions the member counts as revenue. */
export async function taggedMonths(revenueSourceId: string, since: Date = syncWindowStart(6)): Promise<Map<string, MonthTotal>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .select("booking_date, amount_cents, counterparty")
    .eq("revenue_source_id", revenueSourceId)
    .eq("is_revenue", true)
    .gte("booking_date", periodKey(since));
  if (error) throw new Error(error.message);
  const months = new Map<string, MonthTotal & { payers: Set<string> }>();
  for (const t of data ?? []) {
    const key = periodKey(t.booking_date);
    const month = months.get(key) ?? { amountCents: 0, transactions: 0, customers: null, payers: new Set<string>() };
    month.amountCents += t.amount_cents;
    month.transactions += 1;
    if (t.counterparty) month.payers.add(normalize(t.counterparty));
    month.customers = month.payers.size || null;
    months.set(key, month);
  }
  return months;
}
