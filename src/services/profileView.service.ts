import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a signed-in visit to someone else's public profile — at most one
 * row per (viewer, viewed profile, day) thanks to the unique constraint, so
 * repeated refreshes the same day don't inflate the count. Best-effort: a
 * failed write here should never break the profile page itself.
 */
export async function recordProfileView(viewedUserId: string, viewerId: string): Promise<void> {
  if (viewedUserId === viewerId) return;
  try {
    const supabase = await createClient();
    await supabase
      .from("profile_views")
      .upsert(
        { viewed_user_id: viewedUserId, viewer_id: viewerId },
        { onConflict: "viewed_user_id,viewer_id,viewed_on", ignoreDuplicates: true },
      );
  } catch (err) {
    console.error("recordProfileView failed:", err);
  }
}

export async function getProfileViewCount(userId: string, sinceDays: number): Promise<number> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("profile_views")
    .select("id", { count: "exact", head: true })
    .eq("viewed_user_id", userId)
    .gte("viewed_on", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
