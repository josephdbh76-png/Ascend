import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionInfo } from "@/types";
import type { SubscriptionTier } from "@/types/database.types";

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier, status, current_period_end, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return {
    tier: data?.tier ?? "free",
    status: data?.status ?? "active",
    currentPeriodEnd: data?.current_period_end ?? null,
    hasStripeCustomer: data?.stripe_customer_id != null,
  };
}

export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "elite";
}

export function hasEliteAccess(tier: SubscriptionTier): boolean {
  return tier === "elite";
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
