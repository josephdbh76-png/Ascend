import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncLemonSqueezyRevenue } from "@/services/lemonsqueezy.service";

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
    .select("id, status")
    .eq("user_id", user.id)
    .eq("provider", "lemonsqueezy")
    .maybeSingle();

  if (!source || source.status !== "connected") {
    return NextResponse.json({ error: "No connected Lemon Squeezy source." }, { status: 404 });
  }

  const result = await syncLemonSqueezyRevenue(user.id, source.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, monthsSynced: result.monthsSynced, isFirstVerification: result.isFirstVerification });
}
