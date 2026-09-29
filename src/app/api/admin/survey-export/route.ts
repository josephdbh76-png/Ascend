import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/services/admin.service";
import { listSurveyResponses, surveyResponsesToCsv } from "@/services/survey.service";

export async function GET() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const csv = surveyResponsesToCsv(await listSurveyResponses());
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ascend-questionnaire-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
