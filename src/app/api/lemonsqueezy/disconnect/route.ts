import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectLemonSqueezySource } from "@/services/lemonsqueezy.service";

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
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "lemonsqueezy")
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "No Lemon Squeezy connection found." }, { status: 404 });
  }

  await disconnectLemonSqueezySource(user.id, source.id);
  return NextResponse.json({ success: true });
}
