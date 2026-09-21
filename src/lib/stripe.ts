import "server-only";
import Stripe from "stripe";
import type { SubscriptionTier, BillingInterval } from "@/types/database.types";
import { getAppUrl } from "@/lib/utils";

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

// A distinctive marker rather than a stored id — cheaper than adding a
// column or an env var just to remember one Stripe object, and it makes
// this self-healing: editing the settings below and redeploying updates
// the existing configuration in place instead of creating duplicates.
const PORTAL_HEADLINE = "Gère ton abonnement ASCEND en toute simplicité.";

export async function getOrCreatePortalConfigurationId(): Promise<string> {
  const stripe = getStripe();
  const appUrl = getAppUrl();

  const params: Stripe.BillingPortal.ConfigurationUpdateParams = {
    business_profile: {
      headline: PORTAL_HEADLINE,
      privacy_policy_url: `${appUrl}/legal/privacy`,
      terms_of_service_url: `${appUrl}/legal/terms`,
    },
    default_return_url: `${appUrl}/app/settings`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["address", "tax_id"] },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "customer_service",
            "too_complex",
            "other",
          ],
        },
      },
      subscription_update: { enabled: false },
    },
  };

  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const match = existing.data.find((c) => c.business_profile?.headline === PORTAL_HEADLINE);
  if (match) {
    await stripe.billingPortal.configurations.update(match.id, params);
    return match.id;
  }

  const created = await stripe.billingPortal.configurations.create(
    params as Stripe.BillingPortal.ConfigurationCreateParams,
  );
  return created.id;
}
