import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPurchasableTitle } from "@/services/title.service";
import { getOrCreateStripeCustomerId } from "@/services/subscription.service";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const titleId = request.nextUrl.searchParams.get("title");
  const titlesUrl = new URL("/app/titles", appUrl);

  if (!titleId) {
    titlesUrl.searchParams.set("purchase_error", "invalid_title");
    return NextResponse.redirect(titlesUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("next", `/api/stripe/titles/checkout?title=${titleId}`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { data: alreadyOwned } = await supabase
      .from("user_titles")
      .select("title_id")
      .eq("user_id", user.id)
      .eq("title_id", titleId)
      .maybeSingle();
    if (alreadyOwned) {
      titlesUrl.searchParams.set("purchase_error", "already_owned");
      return NextResponse.redirect(titlesUrl);
    }

    const title = await getPurchasableTitle(titleId);
    if (!title || !title.stripePriceId) {
      titlesUrl.searchParams.set("purchase_error", "not_available");
      return NextResponse.redirect(titlesUrl);
    }
    if (title.remainingSupply != null && title.remainingSupply <= 0) {
      titlesUrl.searchParams.set("purchase_error", "sold_out");
      return NextResponse.redirect(titlesUrl);
    }

    const customerId = await getOrCreateStripeCustomerId(user.id, user.email!);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: title.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/app/titles?purchase=success`,
      cancel_url: `${appUrl}/app/titles?purchase=cancelled`,
      client_reference_id: user.id,
      metadata: { kind: "title_purchase", user_id: user.id, title_id: title.id },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.redirect(session.url);
  } catch (err) {
    titlesUrl.searchParams.set("purchase_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(titlesUrl);
  }
}
