import { NextRequest, NextResponse } from "next/server";
import { finalizeBankConnection } from "@/services/bank.service";
import { getAppUrl } from "@/lib/utils";

/**
 * Where the member's browser lands after approving access with their own
 * bank. source_id is an unguessable UUID ASCEND generated itself before
 * redirecting them away (see initiateBankConnection) — not a
 * user-supplied value trusted for anything beyond "which pending
 * connection is this". code is Enable Banking's one-time authorization
 * code, exchanged for a session server-side. PSD2 bank redirects are
 * unreliable about carrying session cookies back (SameSite quirks on
 * some banks' own redirect chains), so this doesn't require
 * re-authenticating as the owning user.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const sourceId = request.nextUrl.searchParams.get("source_id");
  const code = request.nextUrl.searchParams.get("code");
  const settingsUrl = new URL("/app/settings", appUrl);
  settingsUrl.hash = "comptes-connectes";

  if (!sourceId || !code) {
    settingsUrl.searchParams.set("bank_error", "missing_params");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await finalizeBankConnection(sourceId, code);
    settingsUrl.searchParams.set("bank_connected", "1");
  } catch (err) {
    settingsUrl.searchParams.set("bank_error", err instanceof Error ? err.message : "unknown");
  }

  return NextResponse.redirect(settingsUrl);
}
