import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdForTier, parseBillableTier, parseBillingInterval } from "@/lib/stripe";
import { getOrCreateStripeCustomerId, isTrialEligible } from "@/services/subscription.service";
import { getAppUrl } from "@/lib/utils";

const TRIAL_DAYS = 14;

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
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

  try {
    const customerId = await getOrCreateStripeCustomerId(user.id, user.email!);
    const stripe = getStripe();

    // Trial only ever applies to Elite, and only for members who have
    // never had a paid subscription — re-checked here regardless of what
    // the client asked for, since query params can't be trusted.
    const grantTrial = trialRequested && tier === "elite" && (await isTrialEligible(user.id));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForTier(tier, interval), quantity: 1 }],
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
