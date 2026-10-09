import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * True when this session still owes its second factor. Supabase is asked
 * for the factors (the token is passed, so it calls the server): the copy
 * of the user kept in the session cookie is unsigned, and a password change
 * rewrites it without the factors. Any doubt counts as "still owes it".
 */
export async function secondFactorPending(supabase: ServerClient): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);
  if (error || !data) return true;
  return data.currentLevel !== data.nextLevel;
}
