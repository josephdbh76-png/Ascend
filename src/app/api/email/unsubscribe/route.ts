import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/services/email-campaign.service";
import { getAppUrl } from "@/lib/utils";

/**
 * No session required on purpose — an email client never carries our
 * cookies, and every campaign email is legally required to offer a
 * one-click unsubscribe that works exactly like this.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const ok = token ? await unsubscribeByToken(token) : false;

  const appUrl = getAppUrl();
  const message = ok
    ? "Tu as bien été désinscrit des emails d'ASCEND."
    : "Ce lien de désinscription n'est plus valide.";

  return new NextResponse(
    `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>Désinscription — ASCEND</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#0a0b0d;color:#f4f1ea;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}
.card{max-width:420px;padding:32px;text-align:center;}
a{color:#d6a84f;}</style></head>
<body><div class="card"><p>${message}</p><p><a href="${appUrl}">Retour à ASCEND</a></p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
