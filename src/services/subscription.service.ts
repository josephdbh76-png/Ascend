import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionInfo } from "@/types";
import type { SubscriptionTier } from "@/types/database.types";

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier, status, current_period_end, stripe_customer_id, billing_interval, trial_used, trial_ends_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("pro_credit_until").eq("id", userId).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const tier = data?.tier ?? "free";
  const hasActiveReferralCredit = !!profile?.pro_credit_until && new Date(profile.pro_credit_until) > new Date();

  return {
    // A referral credit only ever upgrades a free tier — it never
    // downgrades or otherwise interferes with a real Elite subscription.
    tier: tier === "free" && hasActiveReferralCredit ? "pro" : tier,
    status: data?.status ?? "active",
    currentPeriodEnd: data?.current_period_end ?? null,
    hasStripeCustomer: data?.stripe_customer_id != null,
    billingInterval: data?.billing_interval ?? null,
    trialUsed: data?.trial_used ?? false,
    trialEndsAt: data?.trial_ends_at ?? null,
  };
}

export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "elite";
}

export function hasEliteAccess(tier: SubscriptionTier): boolean {
  return tier === "elite";
}

/** Elite's 14-day trial is a one-time offer for members who have never had a paid subscription. */
export async function isTrialEligible(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("tier, trial_used")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return true;
  return data.tier === "free" && !data.trial_used;
}

/**
 * Finds or creates a Stripe Customer for this user, admin-side (bypasses
 * RLS since the checkout route needs to read/write across all users'
 * subscription rows via the service role, not just the caller's own).
 */
export async function getOrCreateStripeCustomerId(
  userId: string,
  email: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.stripe_customer_id) return data.stripe_customer_id;

  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });

  await admin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);

  return customer.id;
}

export interface AnnualPriceSyncResult {
  tier: "pro" | "elite";
  priceId: string;
  envVar: string;
  alreadyExisted: boolean;
}

const ANNUAL_AMOUNTS_CENTS: Record<"pro" | "elite", number> = {
  pro: 19000, // 19€ × 10 months — 2 months free
  elite: 44100, // 49€ × 9 months — 3 months free
};

/**
 * Admin-only, one-time setup: creates the annual Price for Pro and Elite
 * on the same Stripe Product as their existing monthly price, if one
 * doesn't already exist. Never touches the monthly price. Returns the IDs
 * so an admin can add them as STRIPE_PRICE_*_ANNUAL env vars — this app
 * has no way to write Vercel env vars itself.
 */
export async function syncAnnualPrices(): Promise<AnnualPriceSyncResult[]> {
  const { getStripe, priceIdForTier } = await import("@/lib/stripe");
  const stripe = getStripe();
  const results: AnnualPriceSyncResult[] = [];

  for (const tier of ["pro", "elite"] as const) {
    const envVar = tier === "pro" ? "STRIPE_PRICE_PRO_ANNUAL" : "STRIPE_PRICE_ELITE_ANNUAL";
    const existingAnnual = process.env[envVar];
    if (existingAnnual) {
      results.push({ tier, priceId: existingAnnual, envVar, alreadyExisted: true });
      continue;
    }

    const monthlyPriceId = priceIdForTier(tier, "month");
    const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
    const productId = typeof monthlyPrice.product === "string" ? monthlyPrice.product : monthlyPrice.product.id;

    const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    const annualMatch = existingPrices.data.find(
      (p) => p.recurring?.interval === "year" && p.unit_amount === ANNUAL_AMOUNTS_CENTS[tier],
    );
    if (annualMatch) {
      results.push({ tier, priceId: annualMatch.id, envVar, alreadyExisted: true });
      continue;
    }

    const created = await stripe.prices.create({
      product: productId,
      unit_amount: ANNUAL_AMOUNTS_CENTS[tier],
      currency: "eur",
      recurring: { interval: "year" },
    });
    results.push({ tier, priceId: created.id, envVar, alreadyExisted: false });
  }

  return results;
}

export interface ElitePriceUpdateResult {
  interval: "month" | "year";
  priceId: string;
  envVar: string;
  amountCents: number;
  alreadyExisted: boolean;
}

// Stripe prices are immutable in amount, so a pricing change always means
// a NEW Price object on the same Product — existing subscribers keep
// whatever price their subscription already references either way, this
// only affects what new checkouts use once the env vars below are set.
const NEW_ELITE_PRICES: Record<"month" | "year", { amountCents: number; envVar: string }> = {
  month: { amountCents: 3900, envVar: "STRIPE_PRICE_ELITE" },
  year: { amountCents: 35100, envVar: "STRIPE_PRICE_ELITE_ANNUAL" }, // 39€ × 9 months — 3 months free, same structure as before
};

/**
 * Admin-only, idempotent: creates (or finds, if already created) the new
 * Elite monthly + annual prices on the existing Elite product. Returns the
 * IDs so an admin can set them as STRIPE_PRICE_ELITE /
 * STRIPE_PRICE_ELITE_ANNUAL — this app has no way to write Vercel env
 * vars itself.
 */
export async function updateElitePricing(): Promise<ElitePriceUpdateResult[]> {
  const { getStripe, priceIdForTier } = await import("@/lib/stripe");
  const stripe = getStripe();

  const currentMonthlyPrice = await stripe.prices.retrieve(priceIdForTier("elite", "month"));
  const productId =
    typeof currentMonthlyPrice.product === "string" ? currentMonthlyPrice.product : currentMonthlyPrice.product.id;

  const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const results: ElitePriceUpdateResult[] = [];

  for (const interval of ["month", "year"] as const) {
    const { amountCents, envVar } = NEW_ELITE_PRICES[interval];
    const match = existingPrices.data.find((p) => p.recurring?.interval === interval && p.unit_amount === amountCents);
    if (match) {
      results.push({ interval, priceId: match.id, envVar, amountCents, alreadyExisted: true });
      continue;
    }

    const created = await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: "eur",
      recurring: { interval },
    });
    results.push({ interval, priceId: created.id, envVar, amountCents, alreadyExisted: false });
  }

  return results;
}
