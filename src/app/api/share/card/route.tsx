import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { loadShareCard } from "@/services/shareCard.service";
import { fetchAvatar, loadShareFonts, renderShareCard } from "@/lib/share/render";
import { isShareFormat, isShareKind, isShareStyle, shareCardSize } from "@/lib/share/params";
import { getAppUrl } from "@/lib/utils";

export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const kind = query.get("kind");
  const rawFormat = query.get("format");
  const rawStyle = query.get("style");
  const format = isShareFormat(rawFormat) ? rawFormat : "story";
  const style = isShareStyle(rawStyle) ? rawStyle : "prestige";
  const username = (query.get("u") ?? "").toLowerCase();

  if (!isShareKind(kind)) return new Response("Not found", { status: 404 });

  const data = await loadShareCard(kind, username, query.get("id"));
  if (!data) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  }

  try {
    const [fonts, avatar] = await Promise.all([loadShareFonts(), fetchAvatar(data.member.avatarUrl)]);
    const { width, height } = shareCardSize(format, style);
    return new ImageResponse(renderShareCard(data, format, style, { avatar, host: new URL(getAppUrl()).host }), {
      width,
      height,
      fonts,
      headers: {
        // Ranks move during the day; an hour at the edge is plenty.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Disposition": `inline; filename="ascend-${data.kind}-${username}.png"`,
      },
    });
  } catch (err) {
    console.error("Share card render failed:", err);
    return new Response("Render failed", { status: 500 });
  }
}
