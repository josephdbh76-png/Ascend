import { NextResponse, type NextRequest } from "next/server";
import { CREATOR_COOKIE, CREATOR_COOKIE_DAYS, getActiveCreatorByCode, recordCreatorLinkClick } from "@/services/creator.service";
import { getCreatorLeagueForInfluencer } from "@/services/creatorLeague.service";

// A creator's personal link: remembers who sent the visitor for 30 days
// (the signup reads it), then shows the creator's league, or the home page.
// ?to=signup goes straight to the signup (the league page's join button).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const creator = await getActiveCreatorByCode(code);
  const url = request.nextUrl.clone();
  url.search = "";
  if (!creator) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const toSignup = request.nextUrl.searchParams.get("to") === "signup";
  const league = toSignup ? null : await getCreatorLeagueForInfluencer(creator.id);
  url.pathname = toSignup ? "/signup" : league?.isActive ? `/ligues/${league.slug}` : "/";
  // Router prefetches and link previews aren't visits.
  const prefetch = request.headers.has("next-router-prefetch") || /prefetch/i.test(request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "");
  if (!toSignup && !prefetch) await recordCreatorLinkClick(creator.id);

  const response = NextResponse.redirect(url);
  response.cookies.set(CREATOR_COOKIE, creator.id, {
    maxAge: CREATOR_COOKIE_DAYS * 24 * 3600,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
