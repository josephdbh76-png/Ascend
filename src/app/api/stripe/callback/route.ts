import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleStripeOAuthCallback } from "@/services/stripe.service";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const dashboardUrl = new URL("/dashboard", appUrl);

  if (oauthError) {
    dashboardUrl.searchParams.set("stripe_error", oauthError);
    return NextResponse.redirect(dashboardUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !code || !state || state !== user.id) {
    dashboardUrl.searchParams.set("stripe_error", "invalid_state");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    await handleStripeOAuthCallback(code, user.id);
    dashboardUrl.searchParams.set("stripe_connected", "1");
  } catch (err) {
    dashboardUrl.searchParams.set("stripe_error", err instanceof Error ? err.message : "unknown");
  }

  return NextResponse.redirect(dashboardUrl);
}
