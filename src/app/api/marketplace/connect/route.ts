import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startSellerOnboarding } from "@/services/marketplace.service";
import { getAppUrl } from "@/lib/utils";

export async function GET() {
  const appUrl = getAppUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  try {
    const url = await startSellerOnboarding(user.id, user.email);
    return NextResponse.redirect(url);
  } catch (err) {
    const titlesUrl = new URL("/app/titles", appUrl);
    titlesUrl.searchParams.set("seller_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(titlesUrl);
  }
}
