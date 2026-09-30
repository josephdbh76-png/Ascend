import "server-only";
import crypto from "node:crypto";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, tierForPriceId, intervalForPriceId } from "@/lib/stripe";

/** Admin-only — callers must check isCurrentUserAdmin() or a metrics token first. */

export interface MonthlyMetrics {
  month: string; // YYYY-MM
  signups: number;
  newPro: number;
  newElite: number;
  cancellations: number;
}

export interface BusinessMetrics {
  generatedAt: string;
  members: { total: number; last7Days: number; last30Days: number; verified: number };
  subscriptions: {
    pro: number;
    elite: number;
    proMonthly: number;
    proAnnual: number;
    eliteMonthly: number;
    eliteAnnual: number;
    trialing: number;
    pastDue: number;
    payingCustomers: number;
    mrrCents: number;
    canceledLast30Days: number;
  };
  marketplace: { sales: number; commissionCents: number };
  rates: { verification: number | null; paid: number | null };
  monthly: MonthlyMetrics[];
  stripeError: string | null;
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1))));
}

/** Monthly amount a subscription brings in, after a recurring discount. */
function monthlyValueCents(sub: Stripe.Subscription): number {
  let total = 0;
  for (const item of sub.items.data) {
    const amount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
    total += item.price.recurring?.interval === "year" ? amount / 12 : amount;
  }
  for (const d of sub.discounts ?? []) {
    if (typeof d === "string") continue;
    const discount = d as unknown as { coupon?: Stripe.Coupon; source?: { coupon?: Stripe.Coupon | string } };
    const coupon = discount.coupon ?? (typeof discount.source?.coupon === "object" ? discount.source.coupon : undefined);
    if (!coupon || coupon.duration === "once") continue;
    if (coupon.percent_off) total *= 1 - coupon.percent_off / 100;
    else if (coupon.amount_off) total = Math.max(0, total - coupon.amount_off);
  }
  return Math.round(total);
}

export async function computeBusinessMetrics(): Promise<BusinessMetrics> {
  const admin = createAdminClient();
  const months = lastMonths(12);
  const monthly = new Map<string, MonthlyMetrics>(
    months.map((m) => [m, { month: m, signups: 0, newPro: 0, newElite: 0, cancellations: 0 }]),
  );
  const now = Date.now();
  const DAY = 86_400_000;

  const [{ data: profiles }, { data: sold }] = await Promise.all([
    admin.from("profiles").select("created_at, revenue_verified").eq("is_demo", false),
    admin.from("title_listings").select("commission_cents").eq("status", "sold"),
  ]);

  const members = { total: 0, last7Days: 0, last30Days: 0, verified: 0 };
  for (const p of profiles ?? []) {
    members.total++;
    const created = new Date(p.created_at).getTime();
    if (now - created <= 7 * DAY) members.last7Days++;
    if (now - created <= 30 * DAY) members.last30Days++;
    if (p.revenue_verified) members.verified++;
    const row = monthly.get(monthKey(new Date(p.created_at)));
    if (row) row.signups++;
  }

  const subscriptions = {
    pro: 0,
    elite: 0,
    proMonthly: 0,
    proAnnual: 0,
    eliteMonthly: 0,
    eliteAnnual: 0,
    trialing: 0,
    pastDue: 0,
    payingCustomers: 0,
    mrrCents: 0,
    canceledLast30Days: 0,
  };
  let stripeError: string | null = null;

  try {
    const stripe = getStripe();
    const payingCustomers = new Set<string>();
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.discounts"] })) {
      const price = sub.items.data[0]?.price;
      const tier = price ? tierForPriceId(price.id) : null;
      if (tier !== "pro" && tier !== "elite") continue;
      const interval = price ? intervalForPriceId(price.id) : null;

      const createdRow = monthly.get(monthKey(new Date(sub.created * 1000)));
      if (createdRow) {
        if (tier === "pro") createdRow.newPro++;
        else createdRow.newElite++;
      }
      if (sub.canceled_at) {
        const canceledRow = monthly.get(monthKey(new Date(sub.canceled_at * 1000)));
        if (canceledRow) canceledRow.cancellations++;
        if (now - sub.canceled_at * 1000 <= 30 * DAY) subscriptions.canceledLast30Days++;
      }

      if (sub.status === "trialing") {
        subscriptions.trialing++;
        continue;
      }
      if (sub.status !== "active" && sub.status !== "past_due") continue;
      if (sub.status === "past_due") subscriptions.pastDue++;

      subscriptions[tier]++;
      const annual = interval === "year";
      if (tier === "pro") {
        if (annual) subscriptions.proAnnual++;
        else subscriptions.proMonthly++;
      } else if (annual) {
        subscriptions.eliteAnnual++;
      } else {
        subscriptions.eliteMonthly++;
      }
      subscriptions.mrrCents += monthlyValueCents(sub);
      payingCustomers.add(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
    }
    subscriptions.payingCustomers = payingCustomers.size;
  } catch (err) {
    stripeError = err instanceof Error ? err.message : "Stripe indisponible.";
  }

  return {
    generatedAt: new Date().toISOString(),
    members,
    subscriptions,
    marketplace: {
      sales: sold?.length ?? 0,
      commissionCents: (sold ?? []).reduce((sum, s) => sum + (s.commission_cents ?? 0), 0),
    },
    rates: {
      verification: members.total > 0 ? members.verified / members.total : null,
      paid: members.total > 0 ? subscriptions.payingCustomers / members.total : null,
    },
    monthly: months.map((m) => monthly.get(m)!),
    stripeError,
  };
}

// ---------------------------------------------------------------- CSV feed

export type FeedFormat = "excel" | "sheets";

function csv(rows: (string | number)[][], format: FeedFormat) {
  const sep = format === "excel" ? ";" : ",";
  const cell = (v: string | number) => {
    if (typeof v === "number") {
      const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
      return format === "excel" ? s.replace(".", ",") : s;
    }
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const body = rows.map((r) => r.map(cell).join(sep)).join("\r\n");
  return format === "excel" ? "﻿" + body : body;
}

export function metricsSummaryCsv(m: BusinessMetrics, format: FeedFormat) {
  const eur = (cents: number) => Math.round(cents) / 100;
  const pct = (v: number | null) => (v == null ? "" : Math.round(v * 1000) / 10);
  return csv(
    [
      ["Indicateur", "Valeur"],
      ["Mis à jour le", new Date(m.generatedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
      ["Inscrits (total)", m.members.total],
      ["Inscrits (7 derniers jours)", m.members.last7Days],
      ["Inscrits (30 derniers jours)", m.members.last30Days],
      ["Membres vérifiés", m.members.verified],
      ["Taux de vérification (%)", pct(m.rates.verification)],
      ["Abonnés Pro", m.subscriptions.pro],
      ["Abonnés Pro mensuels", m.subscriptions.proMonthly],
      ["Abonnés Pro annuels", m.subscriptions.proAnnual],
      ["Abonnés Elite", m.subscriptions.elite],
      ["Abonnés Elite mensuels", m.subscriptions.eliteMonthly],
      ["Abonnés Elite annuels", m.subscriptions.eliteAnnual],
      ["Essais Elite en cours", m.subscriptions.trialing],
      ["Paiements en échec", m.subscriptions.pastDue],
      ["Clients payants", m.subscriptions.payingCustomers],
      ["Taux de conversion inscrit → payant (%)", pct(m.rates.paid)],
      ["Revenu mensuel récurrent MRR (€)", eur(m.subscriptions.mrrCents)],
      ["Revenu annuel récurrent ARR (€)", eur(m.subscriptions.mrrCents * 12)],
      ["Résiliations (30 derniers jours)", m.subscriptions.canceledLast30Days],
      ["Ventes sur le Marché", m.marketplace.sales],
      ["Commissions du Marché (€)", eur(m.marketplace.commissionCents)],
    ],
    format,
  );
}

export function metricsMonthlyCsv(m: BusinessMetrics, format: FeedFormat) {
  return csv(
    [
      ["Mois", "Inscrits", "Nouveaux Pro", "Nouveaux Elite", "Résiliations"],
      ...m.monthly.map((r) => [r.month, r.signups, r.newPro, r.newElite, r.cancellations]),
    ],
    format,
  );
}

// ---------------------------------------------------------------- tokens

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token once; only its hash is stored. */
export async function createMetricsToken(adminUserId: string): Promise<string> {
  const admin = createAdminClient();
  const token = crypto.randomBytes(24).toString("base64url");
  const { error } = await admin.from("metrics_access_tokens").insert({ token_hash: hashToken(token), created_by: adminUserId });
  if (error) throw new Error(error.message);
  return token;
}

export async function revokeMetricsTokens() {
  const admin = createAdminClient();
  const { error } = await admin
    .from("metrics_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}

export async function verifyMetricsToken(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("metrics_access_tokens")
    .select("id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return false;
  await admin.from("metrics_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

export async function getMetricsTokenStatus(): Promise<{ active: number; lastUsedAt: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("metrics_access_tokens")
    .select("last_used_at")
    .is("revoked_at", null)
    .order("last_used_at", { ascending: false, nullsFirst: false });
  return { active: data?.length ?? 0, lastUsedAt: data?.[0]?.last_used_at ?? null };
}
