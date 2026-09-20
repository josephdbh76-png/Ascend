import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Runs the `capture_leaderboard_snapshot` Postgres function (see
 * supabase/migrations/20260101000006_notifications.sql) once a day. That
 * function already computes rank movement and inserts "rank_increased"
 * notifications — it existed since the notifications system was built but
 * nothing ever called it, so rank-movement notifications and leaderboard
 * history were silently dead in production until this cron was wired up.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("capture_leaderboard_snapshot", {});
  if (error) {
    console.error("capture_leaderboard_snapshot failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
