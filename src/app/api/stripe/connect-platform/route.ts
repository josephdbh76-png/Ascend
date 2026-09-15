import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { connectPlatformRevenueForCofounder } from "@/services/stripe.service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_cofounder")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_cofounder) {
    return NextResponse.json({ error: "Réservé aux cofondateurs d'ASCEND." }, { status: 403 });
  }

  try {
    const result = await connectPlatformRevenueForCofounder(user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, monthsSynced: result.monthsSynced });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}
