import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createListingCheckoutSession } from "@/services/marketplace.service";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const listingId = request.nextUrl.searchParams.get("listing");
  const titlesUrl = new URL("/app/titles", appUrl);

  if (!listingId) {
    titlesUrl.searchParams.set("marketplace_error", "invalid_listing");
    return NextResponse.redirect(titlesUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("next", `/api/marketplace/checkout?listing=${listingId}`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const url = await createListingCheckoutSession(user.id, user.email, listingId);
    return NextResponse.redirect(url);
  } catch (err) {
    titlesUrl.searchParams.set("marketplace_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(titlesUrl);
  }
}
