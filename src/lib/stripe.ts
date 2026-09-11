import "server-only";
import Stripe from "stripe";

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
