import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdForTier, parseBillableTier, parseBillingInterval } from "@/lib/stripe";
import { getOrCreateStripeCustomerId, isTrialEligible } from "@/services/subscription.service";
import { getAppUrl } from "@/lib/utils";
import { getBetaMode } from "@/services/platform.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/pricing";

const TRIAL_DAYS = 14;

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  // Beta: no payment goes through ASCEND; the page explains why.
  if ((await getBetaMode()).enabled) {
    const closed = new URL("/app/settings", appUrl);
    closed.searchParams.set("beta", "paiements");
    closed.hash = "abonnement";
    return NextResponse.redirect(closed);
  }
  const tier = parseBillableTier(request.nextUrl.searchParams.get("tier"));
  const interval = parseBillingInterval(request.nextUrl.searchParams.get("interval"));
  const trialRequested = request.nextUrl.searchParams.get("trial") === "1";
  const settingsUrl = new URL("/app/settings", appUrl);

  if (!tier) {
    settingsUrl.searchParams.set("checkout_error", "invalid_tier");
    return NextResponse.redirect(settingsUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set(
      "next",
      `/api/stripe/checkout?tier=${tier}&interval=${interval}${trialRequested ? "&trial=1" : ""}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  // A second Checkout would open a second, parallel subscription (double
  // billing). Plan changes on an existing one go through the billing portal.
  const { data: current } = await createAdminClient()
    .from("subscriptions")
    .select("tier, status, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (current?.stripe_subscription_id && current.tier !== "free" && current.status !== "canceled") {
    return NextResponse.redirect(new URL("/api/stripe/portal", appUrl));
  }

  try {
    const customerId = await getOrCreateStripeCustomerId(user.id, user.email!);
    const stripe = getStripe();

    // Trial only ever applies to Elite, and only for members who have
    // never had a paid subscription — re-checked here regardless of what
    // the client asked for, since query params can't be trusted.
    const grantTrial = trialRequested && tier === "elite" && (await isTrialEligible(user.id));

    // Never charge another amount than the one shown on the site: a Stripe
    // price left on an old amount stops the checkout instead.
    const priceId = priceIdForTier(tier, interval);
    const plan = PLANS.find((p) => p.tier === tier);
    const shownCents = interval === "year" ? plan?.annualCents : plan?.monthlyCents;
    const stripePrice = await stripe.prices.retrieve(priceId);
    if (shownCents == null || stripePrice.unit_amount !== shownCents || !stripePrice.active) {
      console.error(`Price mismatch for ${tier}/${interval}: Stripe ${stripePrice.unit_amount}, site ${shownCents}`);
      throw new Error("Ce tarif est en cours de mise à jour. Réessaie dans quelques minutes ou écris-nous.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      submit_type: "subscribe",
      custom_text: {
        submit: {
          message: "Résiliable à tout moment depuis ton espace ASCEND. Paiement sécurisé et chiffré par Stripe.",
        },
      },
      success_url: `${appUrl}/app/settings?checkout=success&tier=${tier}${grantTrial ? "&trial=1" : ""}`,
      cancel_url: `${appUrl}/app/settings?checkout=cancelled`,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { user_id: user.id, tier },
        ...(grantTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      metadata: { user_id: user.id, tier },
      locale: "fr",
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.redirect(session.url);
  } catch (err) {
    settingsUrl.searchParams.set(
      "checkout_error",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.redirect(settingsUrl);
  }
}
