import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/services/admin.service";
import {
  computeBusinessMetrics,
  metricsMonthlyCsv,
  metricsSummaryCsv,
  verifyMetricsToken,
  type FeedFormat,
} from "@/services/metrics.service";

export const maxDuration = 60;

/**
 * Live business metrics as CSV, for Excel (Données → À partir du Web) or
 * Google Sheets (IMPORTDATA). Access: an admin session, or a secret link
 * generated from the admin overview.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token");
  const allowed = token ? await verifyMetricsToken(token) : await isCurrentUserAdmin();
  if (!allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const format: FeedFormat = params.get("format") === "sheets" ? "sheets" : "excel";
  const view = params.get("view") === "monthly" ? "monthly" : "summary";
  const metrics = await computeBusinessMetrics();
  const body = view === "monthly" ? metricsMonthlyCsv(metrics, format) : metricsSummaryCsv(metrics, format);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="ascend-${view}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
