import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/services/weeklyDigest.service";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Weekly digest cron failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
