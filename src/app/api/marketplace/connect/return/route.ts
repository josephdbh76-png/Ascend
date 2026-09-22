import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshSellerAccountStatus } from "@/services/marketplace.service";
import { getAppUrl } from "@/lib/utils";

export async function GET() {
  const appUrl = getAppUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const titlesUrl = new URL("/app/titles", appUrl);
  if (!user) return NextResponse.redirect(new URL("/login", appUrl));

  try {
    await refreshSellerAccountStatus(user.id);
    titlesUrl.searchParams.set("seller_onboarding", "done");
  } catch (err) {
    titlesUrl.searchParams.set("seller_error", err instanceof Error ? err.message : "unknown");
  }
  return NextResponse.redirect(titlesUrl);
}
