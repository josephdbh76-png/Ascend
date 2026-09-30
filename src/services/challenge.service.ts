import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refreshMemberProgress } from "@/services/progress.service";
import type { ChallengeProgress } from "@/types";

export async function getActiveChallengesWithProgress(userId: string, seasonId?: string): Promise<ChallengeProgress[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("challenges")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("created_at", { ascending: true });
  if (seasonId) query = query.eq("season_id", seasonId);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  const challenges = (rows ?? [])
    .filter((c) => c.is_published !== false)
    .sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
  if (challenges.length === 0) return [];

  const { data: progressRows } = await supabase
    .from("user_challenges")
    .select("*")
    .eq("user_id", userId)
    .in("challenge_id", challenges.map((c) => c.id));

  const progressByChallenge = new Map((progressRows ?? []).map((p) => [p.challenge_id, p]));

  return challenges.map((c) => {
    const progress = progressByChallenge.get(c.id);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      type: c.type,
      target: Number(c.target),
      points: c.points ?? 0,
      progress: progress?.progress ?? 0,
      status: progress?.status ?? "in_progress",
      completedAt: progress?.completed_at ?? null,
      endsAt: c.ends_at,
      seasonId: c.season_id,
      rewardAchievementId: c.reward_achievement_id,
      rewardTitleId: c.reward_title_id ?? null,
    };
  });
}

/** Kept for existing callers: progress is now recomputed from server-side data only. */
export async function evaluateChallengeProgress(userId: string) {
  await refreshMemberProgress(userId);
}

/** % of (non-demo) members who have completed each challenge — a social-proof signal shown alongside progress. */
export async function getChallengeCompletionRates(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const [{ count: total }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_demo", false),
    supabase.from("user_challenges").select("challenge_id").eq("status", "completed"),
  ]);
  if (!total) return {};

  const tally = new Map<string, number>();
  for (const row of rows ?? []) tally.set(row.challenge_id, (tally.get(row.challenge_id) ?? 0) + 1);

  const rates: Record<string, number> = {};
  for (const [id, n] of tally) rates[id] = (n / total) * 100;
  return rates;
}
