import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncMemberSources } from "@/services/revenueSync.service";

export const maxDuration = 60;

/**
 * Keeps verified revenue (and so the leaderboard) current without the member
 * clicking "resync": the dashboard calls this when a source is stale.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const synced = await syncMemberSources(user.id);
  return NextResponse.json({ synced });
}
