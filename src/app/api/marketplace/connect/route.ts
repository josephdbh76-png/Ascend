import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startSellerOnboarding } from "@/services/marketplace.service";
import { getAppUrl } from "@/lib/utils";
import { getBetaMode } from "@/services/platform.service";
import { onboardingOrigin } from "@/lib/sellerPayouts";

export async function GET(request: Request) {
  const appUrl = getAppUrl();
  const from = new URL(request.url).searchParams.get("from");
  const origin = onboardingOrigin(from);
  // Beta: no sale goes through ASCEND, so there is no seller account to open.
  if ((await getBetaMode()).enabled) {
    const closed = new URL(origin, appUrl);
    closed.searchParams.set("beta", "paiements");
    return NextResponse.redirect(closed);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  try {
    const url = await startSellerOnboarding(user.id, user.email, from === "gains" ? "gains" : null);
    return NextResponse.redirect(url);
  } catch (err) {
    const titlesUrl = new URL(origin, appUrl);
    titlesUrl.searchParams.set("seller_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(titlesUrl);
  }
}
