import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSellerDashboardLink } from "@/services/marketplace.service";
import { getAppUrl } from "@/lib/utils";

/** Opens the seller's Stripe Express space (balance, payouts, bank details). */
export async function GET() {
  const appUrl = getAppUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", appUrl));

  try {
    return NextResponse.redirect(await createSellerDashboardLink(user.id));
  } catch (err) {
    const titlesUrl = new URL("/app/titles", appUrl);
    titlesUrl.searchParams.set("seller_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(titlesUrl);
  }
}
