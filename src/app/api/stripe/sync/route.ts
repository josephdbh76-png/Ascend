import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncStripeRevenue } from "@/services/stripe.service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: source } = await supabase
    .from("revenue_sources")
    .select("id, external_account_id, status")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .maybeSingle();

  if (!source || !source.external_account_id || source.status !== "connected") {
    return NextResponse.json({ error: "No connected Stripe source." }, { status: 404 });
  }

  const result = await syncStripeRevenue(user.id, source.id, source.external_account_id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, monthsSynced: result.monthsSynced });
}
