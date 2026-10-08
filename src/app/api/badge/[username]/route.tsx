import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { BRAND_COLORS, MARK } from "@/components/brand/brandPaths";
import { brandMark } from "@/components/brand/brandImage";
import { loadShareFonts } from "@/lib/share/render";
import { BADGE_HEIGHT, BADGE_WIDTH } from "@/lib/badge";
import { league, leagueForRevenue } from "@/lib/leagues";

// The badge, drawn from what a logged-out visitor can see of the profile:
// the league only when the member shows the exact amount of their revenue.

const INK = "#0a0b0d";
const IVORY = "#f4f1ea";
const GOLD = "#d6a84f";

interface BadgeText {
  title: string;
  subtitle: string;
}

async function badgeText(username: string): Promise<BadgeText | null> {
  const { data } = await createPublicClient().rpc("get_public_profile", { p_username: username });
  const row = data?.[0];
  if (!row) return null;
  if (!row.revenue_verified) return { title: "Membre ASCEND", subtitle: `@${row.username}` };
  // Ranges are 10 000 € wide, too coarse to name a league: only an exact amount does.
  const cents = row.revenue_visibility === "exact" ? row.revenue_display_cents : null;
  const subtitle = cents != null ? `ASCEND · Ligue ${league(leagueForRevenue(Number(cents))).name}` : `ASCEND · @${row.username}`;
  return { title: "Revenus vérifiés", subtitle };
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function svgBadge({ title, subtitle }: BadgeText): string {
  // The mark is 30 × 32, set 16 px from the left edge and centred vertically.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" role="img" aria-label="${escapeXml(`${title} · ${subtitle}`)}">
<rect x="0.5" y="0.5" width="${BADGE_WIDTH - 1}" height="${BADGE_HEIGHT - 1}" rx="12" fill="${INK}" stroke="${GOLD}" stroke-opacity="0.4"/>
<svg x="16" y="16" width="30" height="32" viewBox="${MARK.viewBox}">
<path d="${MARK.high}" fill="${BRAND_COLORS.high}"/><path d="${MARK.mid}" fill="${BRAND_COLORS.mid}"/><path d="${MARK.low}" fill="${BRAND_COLORS.low}"/>
</svg>
<g font-family="Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<text x="60" y="30" font-size="15" font-weight="600" fill="${IVORY}">${escapeXml(title)}</text>
<text x="60" y="47" font-size="11" font-weight="500" letter-spacing="0.4" fill="${GOLD}">${escapeXml(subtitle)}</text>
</g>
</svg>`;
}

function pngBadge({ title, subtitle }: BadgeText) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 32px",
        background: INK,
        border: `2px solid ${GOLD}66`,
        borderRadius: 24,
        fontFamily: "Inter",
      }}
    >
      {brandMark(64)}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 600, color: IVORY, whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: 22, fontWeight: 500, color: GOLD, letterSpacing: 0.8, whiteSpace: "nowrap" }}>{subtitle}</span>
      </div>
    </div>
  );
}

const CACHE = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const username = (await params).username.toLowerCase().replace(/\.(svg|png)$/, "");
  const text = await badgeText(username);
  if (!text) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  if (request.nextUrl.searchParams.get("format") === "png") {
    // Twice the size, for sharp signatures on retina screens.
    return new ImageResponse(pngBadge(text), {
      width: BADGE_WIDTH * 2,
      height: BADGE_HEIGHT * 2,
      fonts: await loadShareFonts(),
      headers: { "Cache-Control": CACHE },
    });
  }
  return new Response(svgBadge(text), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": CACHE, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
