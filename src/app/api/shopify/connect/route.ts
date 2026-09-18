import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidShopDomain } from "@/lib/shopify";
import { buildShopifyConnectUrl } from "@/services/shopify.service";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const shop = request.nextUrl.searchParams.get("shop")?.trim().toLowerCase() ?? "";
  const dashboardUrl = new URL("/app/settings", appUrl);

  if (!isValidShopDomain(shop)) {
    dashboardUrl.searchParams.set("shopify_error", "invalid_shop");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const url = buildShopifyConnectUrl(shop, user.id, appUrl);
    return NextResponse.redirect(url);
  } catch {
    dashboardUrl.searchParams.set("shopify_error", "not_configured");
    return NextResponse.redirect(dashboardUrl);
  }
}
