import "server-only";
import Stripe from "stripe";
import type { SubscriptionTier } from "@/types/database.types";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function isStripeTestKey(key: string | undefined): boolean {
  return !!key && key.startsWith("sk_test_");
}

const BILLABLE_TIERS = ["pro", "elite"] as const;
type BillableTier = (typeof BILLABLE_TIERS)[number];

function isBillableTier(tier: string): tier is BillableTier {
  return (BILLABLE_TIERS as readonly string[]).includes(tier);
}

export function priceIdForTier(tier: BillableTier): string {
  const envVar = tier === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_ELITE";
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} is not configured.`);
  return priceId;
}

export function tierForPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ELITE) return "elite";
  return null;
}

export function parseBillableTier(value: string | null): BillableTier | null {
  return value && isBillableTier(value) ? value : null;
}
