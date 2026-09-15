import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdForTier, parseBillableTier } from "@/lib/stripe";
import { getOrCreateStripeCustomerId } from "@/services/subscription.service";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const tier = parseBillableTier(request.nextUrl.searchParams.get("tier"));
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
    loginUrl.searchParams.set("next", `/api/stripe/checkout?tier=${tier}`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const customerId = await getOrCreateStripeCustomerId(user.id, user.email!);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
      success_url: `${appUrl}/app/settings?checkout=success`,
      cancel_url: `${appUrl}/app/settings?checkout=cancelled`,
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, tier } },
      metadata: { user_id: user.id, tier },
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
