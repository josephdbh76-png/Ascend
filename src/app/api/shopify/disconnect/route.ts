import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectShopifySource } from "@/services/shopify.service";

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
    .eq("provider", "shopify")
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "No Shopify connection found." }, { status: 404 });
  }

  await disconnectShopifySource(user.id, source.id);
  return NextResponse.json({ success: true });
}
