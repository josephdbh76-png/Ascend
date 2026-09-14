import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildStripeConnectUrl } from "@/services/stripe.service";
import { getAppUrl } from "@/lib/utils";

export async function GET() {
  const appUrl = getAppUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  try {
    const url = buildStripeConnectUrl(user.id, appUrl);
    return NextResponse.redirect(url);
  } catch {
    const dashboardUrl = new URL("/app/dashboard", appUrl);
    dashboardUrl.searchParams.set("stripe_error", "not_configured");
    return NextResponse.redirect(dashboardUrl);
  }
}
