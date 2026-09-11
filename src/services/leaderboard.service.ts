import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardScope } from "@/types/database.types";

export async function getLeaderboard(
  scope: LeaderboardScope,
  scopeValue: string,
  limit = 50,
  offset = 0,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_scope: scope,
    p_scope_value: scope === "global" ? "" : scopeValue,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserRank(userId: string, scope: LeaderboardScope, scopeValue: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_rank", {
    p_user_id: userId,
    p_scope: scope,
    p_scope_value: scope === "global" ? "" : scopeValue,
  });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/** Rank movement since the most recent stored snapshot (nullable — no
 * movement is shown until a prior snapshot exists for this user/scope). */
export async function getRankMovement(
  userId: string,
  scope: LeaderboardScope,
  scopeValue: string,
  currentRank: number,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leaderboard_snapshots")
    .select("rank, snapshot_date")
    .eq("user_id", userId)
    .eq("scope", scope)
    .eq("scope_value", scope === "global" ? "" : scopeValue)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return data.rank - currentRank; // positive = moved up
}
