import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidShopDomain, verifyShopifyHmac } from "@/lib/shopify";
import { handleShopifyOAuthCallback } from "@/services/shopify.service";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop")?.toLowerCase() ?? null;

  const settingsUrl = new URL("/app/settings", appUrl);
  settingsUrl.hash = "revenus";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !code || !state || !shop || state !== user.id || !isValidShopDomain(shop)) {
    settingsUrl.searchParams.set("shopify_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  if (!verifyShopifyHmac(searchParams)) {
    settingsUrl.searchParams.set("shopify_error", "invalid_signature");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const { syncResult } = await handleShopifyOAuthCallback(shop, code, user.id);

    if (!syncResult.success) {
      settingsUrl.searchParams.set("shopify_error", syncResult.error);
      return NextResponse.redirect(settingsUrl);
    }

    if (syncResult.isFirstVerification) {
      return NextResponse.redirect(new URL("/app/verification", appUrl));
    }

    settingsUrl.searchParams.set("shopify_connected", "1");
  } catch (err) {
    settingsUrl.searchParams.set("shopify_error", err instanceof Error ? err.message : "unknown");
  }

  return NextResponse.redirect(settingsUrl);
}
