import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/utils";

export async function GET() {
  const appUrl = getAppUrl();
  const settingsUrl = new URL("/app/settings", appUrl);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    settingsUrl.searchParams.set("checkout_error", "no_subscription");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: settingsUrl.toString(),
      locale: "fr",
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    settingsUrl.searchParams.set(
      "checkout_error",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.redirect(settingsUrl);
  }
}
