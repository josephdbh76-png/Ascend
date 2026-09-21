"use client";

import posthog from "posthog-js";

/**
 * Thin analytics facade around PostHog. Never blocks the app if
 * NEXT_PUBLIC_POSTHOG_KEY is unset — events just become no-ops. Never
 * pass revenue amounts, emails, or other sensitive fields as properties.
 *
 * Initialization is gated behind cookie consent (see CookieBanner /
 * lib/consent.ts) — no analytics cookie or request fires before the
 * visitor explicitly accepts.
 */
export type AnalyticsEvent =
  | "landing_view"
  | "hero_cta_click"
  | "signup_started"
  | "signup_completed"
  | "profile_completed"
  | "stripe_connection_started"
  | "stripe_connection_completed"
  | "leaderboard_viewed"
  | "profile_viewed"
  | "profile_shared"
  | "achievement_unlocked"
  | "challenge_started"
  | "challenge_completed";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    // EU by default — ASCEND targets French/European users, and PostHog's
    // EU region keeps analytics data in the EU rather than requiring an
    // international-transfer justification for a US region. Only
    // meaningful if the PostHog *project* was itself created under
    // eu.posthog.com — the API host can't move a project's data between
    // regions after the fact.
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // handled manually so client-side route changes are tracked too
  });
  initialized = true;
}

export function trackPageview(url: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url });
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
