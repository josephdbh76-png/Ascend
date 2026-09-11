"use client";

/**
 * Thin analytics facade. Wired for PostHog but never blocks the app if
 * NEXT_PUBLIC_POSTHOG_KEY is unset — events just become no-ops. Never
 * pass revenue amounts, emails, or other sensitive fields as properties.
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

type PostHogGlobal = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHogGlobal;
  }
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.posthog?.capture(event, properties);
}
