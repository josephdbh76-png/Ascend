import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildStripeConnectUrl } from "@/services/stripe.service";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
