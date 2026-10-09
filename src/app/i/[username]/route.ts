import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_COOKIE, INVITE_COOKIE_DAYS } from "@/services/invite.service";

// A member's invite link: remembers the inviter for 30 days (the signup and
// the league's join button read it), then shows the inviter's league, or
// the signup when they aren't in one.
export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const username = (await params).username.toLowerCase();
  const admin = createAdminClient();
  const { data: inviter } = await admin.from("profiles").select("id, username").eq("username", username).maybeSingle();
  const url = request.nextUrl.clone();
  url.search = "";
  if (!inviter) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  const { data: membership } = await admin.from("clan_members").select("clans(slug, is_active)").eq("user_id", inviter.id).maybeSingle();
  const clan = membership?.clans as unknown as { slug: string; is_active: boolean } | null;
  if (clan?.is_active) {
    url.pathname = `/ligues/${clan.slug}`;
    url.searchParams.set("invite", inviter.username);
  } else {
    url.pathname = "/signup";
  }
  const response = NextResponse.redirect(url);
  response.cookies.set(INVITE_COOKIE, inviter.id, {
    maxAge: INVITE_COOKIE_DAYS * 24 * 3600,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
