import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/onboarding"];

const AUTH_PREFIXES = ["/login", "/signup"];

/** Matches a path against a prefix at a segment boundary, so "/app" never
 * matches "/apple-icon" — a real bug this once caused, redirecting Next's
 * apple-icon route to the login page because it starts with the same four
 * characters as "/app". */
function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPrefix(path, p));
  const isAuthPage = AUTH_PREFIXES.some((p) => matchesPrefix(path, p));

  // A Server Action invocation POSTs to whatever page is currently open in
  // the browser (e.g. the signup wizard keeps calling actions on /signup
  // for steps 2-4, even after step 1 has already signed the user in).
  // Redirecting that request — as we do for a normal page navigation —
  // returns a redirect where the client expects an action result, which
  // the Server Actions runtime can't parse ("unexpected response from the
  // server"). Page-level redirects must never intercept these.
  const isServerAction = request.headers.has("next-action");

  if (!isServerAction) {
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      url.searchParams.set("reason", "auth");
      return NextResponse.redirect(url);
    }

    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
