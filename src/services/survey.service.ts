import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DISCOVERY_SOURCES,
  MAIN_GOALS,
  PAYMENT_PLATFORMS,
  REVENUE_RANGES,
  surveyLabel,
  type SurveyOption,
} from "@/lib/signupSurvey";

export interface SurveyResponseRow {
  createdAt: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  tier: string;
  revenueVerified: boolean;
  discoverySource: string;
  referrerName: string | null;
  paymentPlatforms: string[];
  monthlyRevenueRange: string;
  mainGoal: string;
}

export async function listSurveyResponses(): Promise<SurveyResponseRow[]> {
  const admin = createAdminClient();
  const { data: surveys, error } = await admin
    .from("signup_surveys")
    .select("user_id, discovery_source, referrer_name, payment_platforms, monthly_revenue_range, main_goal, created_at")
    .order("created_at", { ascending: false });
  // Table missing (migration not run yet) → behave as "no answers yet".
  if (error) return [];
  if (!surveys?.length) return [];

  const ids = surveys.map((s) => s.user_id);
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("id, username, first_name, last_name, revenue_verified").in("id", ids),
    admin.from("subscriptions").select("user_id, tier").in("user_id", ids),
  ]);

  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
    if (!data || data.users.length < 1000) break;
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const tierById = new Map((subs ?? []).map((s) => [s.user_id, s.tier]));

  return surveys.map((s) => {
    const p = profileById.get(s.user_id);
    return {
      createdAt: s.created_at,
      username: p?.username ?? "",
      firstName: p?.first_name ?? null,
      lastName: p?.last_name ?? null,
      email: emails.get(s.user_id) ?? null,
      tier: tierById.get(s.user_id) ?? "free",
      revenueVerified: p?.revenue_verified ?? false,
      discoverySource: s.discovery_source,
      referrerName: s.referrer_name,
      paymentPlatforms: s.payment_platforms,
      monthlyRevenueRange: s.monthly_revenue_range,
      mainGoal: s.main_goal,
    };
  });
}

export interface SurveyTally {
  question: string;
  total: number;
  rows: { label: string; count: number }[];
}

function tally(question: string, options: SurveyOption[], values: string[], total: number): SurveyTally {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return {
    question,
    total,
    rows: options
      .map((o) => ({ label: o.label, count: counts.get(o.value) ?? 0 }))
      .sort((a, b) => b.count - a.count),
  };
}

export function summarizeSurvey(rows: SurveyResponseRow[]): SurveyTally[] {
  const n = rows.length;
  return [
    tally("Découverte", DISCOVERY_SOURCES, rows.map((r) => r.discoverySource), n),
    tally("Plateformes de paiement", PAYMENT_PLATFORMS, rows.flatMap((r) => r.paymentPlatforms), n),
    tally("CA mensuel", REVENUE_RANGES, rows.map((r) => r.monthlyRevenueRange), n),
    tally("Objectif", MAIN_GOALS, rows.map((r) => r.mainGoal), n),
  ];
}

/** Top "par qui ?" answers, case-insensitive, to spot which creators actually bring members. */
export function topReferrers(rows: SurveyResponseRow[], limit = 10): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const r of rows) {
    const name = r.referrerName?.trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/^@/, "");
    const entry = counts.get(key) ?? { name, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function csvCell(value: string): string {
  // Neutralise spreadsheet formulas in user-typed text (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Semicolon-separated + UTF-8 BOM: opens cleanly in French-locale Excel with accents intact. */
export function surveyResponsesToCsv(rows: SurveyResponseRow[]): string {
  const header = [
    "Date",
    "Pseudo",
    "Prénom",
    "Nom",
    "E-mail",
    "Formule",
    "Revenus vérifiés",
    "Découverte",
    "Par qui",
    "Plateformes de paiement",
    "CA mensuel",
    "Objectif",
  ];
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
      r.username,
      r.firstName ?? "",
      r.lastName ?? "",
      r.email ?? "",
      r.tier,
      r.revenueVerified ? "Oui" : "Non",
      surveyLabel(DISCOVERY_SOURCES, r.discoverySource),
      r.referrerName ?? "",
      r.paymentPlatforms.map((p) => surveyLabel(PAYMENT_PLATFORMS, p)).join(", "),
      surveyLabel(REVENUE_RANGES, r.monthlyRevenueRange),
      surveyLabel(MAIN_GOALS, r.mainGoal),
    ]
      .map(csvCell)
      .join(";"),
  );
  return "﻿" + [header.map(csvCell).join(";"), ...lines].join("\r\n");
}
