import "server-only";
import Stripe from "stripe";
import type { SubscriptionTier, BillingInterval } from "@/types/database.types";

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

const PRICE_ENV_VARS: Record<BillableTier, Record<BillingInterval, string>> = {
  pro: { month: "STRIPE_PRICE_PRO", year: "STRIPE_PRICE_PRO_ANNUAL" },
  elite: { month: "STRIPE_PRICE_ELITE", year: "STRIPE_PRICE_ELITE_ANNUAL" },
};

export function priceIdForTier(tier: BillableTier, interval: BillingInterval = "month"): string {
  const envVar = PRICE_ENV_VARS[tier][interval];
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} is not configured.`);
  return priceId;
}

const PRICE_ID_LOOKUP: Record<string, { tier: SubscriptionTier; interval: BillingInterval } | undefined> = {};
function buildPriceIdLookup() {
  for (const tier of BILLABLE_TIERS) {
    for (const interval of ["month", "year"] as const) {
      const id = process.env[PRICE_ENV_VARS[tier][interval]];
      if (id) PRICE_ID_LOOKUP[id] = { tier, interval };
    }
  }
}

export function tierForPriceId(priceId: string): SubscriptionTier | null {
  if (Object.keys(PRICE_ID_LOOKUP).length === 0) buildPriceIdLookup();
  return PRICE_ID_LOOKUP[priceId]?.tier ?? null;
}

export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (Object.keys(PRICE_ID_LOOKUP).length === 0) buildPriceIdLookup();
  return PRICE_ID_LOOKUP[priceId]?.interval ?? null;
}

export function parseBillableTier(value: string | null): BillableTier | null {
  return value && isBillableTier(value) ? value : null;
}

export function parseBillingInterval(value: string | null): BillingInterval {
  return value === "year" ? "year" : "month";
}
