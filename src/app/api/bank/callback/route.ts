import { NextRequest, NextResponse } from "next/server";
import { finalizeBankConnection } from "@/services/bank.service";
import { getAppUrl } from "@/lib/utils";

/**
 * Where the member's browser lands after authenticating with their own
 * bank. source_id is an unguessable UUID ASCEND generated itself before
 * redirecting them away (see initiateBankConnection) — not a
 * user-supplied value trusted for anything beyond "which pending
 * connection is this". PSD2 bank redirects are unreliable about carrying
 * session cookies back (SameSite quirks on some banks' own redirect
 * chains), so this doesn't require re-authenticating as the owning user;
 * finalizeBankConnection only ever acts on that one connection's own
 * accounts, fetched fresh from the aggregator with ASCEND's own
 * platform credentials.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const sourceId = request.nextUrl.searchParams.get("source_id");
  const settingsUrl = new URL("/app/settings", appUrl);
  settingsUrl.hash = "comptes-connectes";

  if (!sourceId) {
    settingsUrl.searchParams.set("bank_error", "missing_source");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await finalizeBankConnection(sourceId);
    settingsUrl.searchParams.set("bank_connected", "1");
  } catch (err) {
    settingsUrl.searchParams.set("bank_error", err instanceof Error ? err.message : "unknown");
  }

  return NextResponse.redirect(settingsUrl);
}
