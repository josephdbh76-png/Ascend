import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrainingForViewer, recordTrainingEvent } from "@/services/training.service";
import { getAppUrl } from "@/lib/utils";

/** Outbound link to a training: counts the click, then sends the visitor to the creator's page. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const training = await getTrainingForViewer(id, { userId: user?.id ?? null, tier: null });
  if (!training || training.status !== "published" || !/^https?:\/\//i.test(training.externalUrl)) {
    return NextResponse.redirect(new URL("/formations", getAppUrl()), 302);
  }

  const visitor = {
    userId: user?.id ?? null,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
  after(() => recordTrainingEvent(training, "click", visitor));

  const response = NextResponse.redirect(training.externalUrl, 302);
  response.headers.set("Referrer-Policy", "origin");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
