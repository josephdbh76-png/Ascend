import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/services/notification.service";
import type { ChallengeProgress } from "@/types";

export async function getActiveChallengesWithProgress(userId: string): Promise<ChallengeProgress[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!challenges || challenges.length === 0) return [];

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
      target: c.target,
      progress: progress?.progress ?? 0,
      status: progress?.status ?? "in_progress",
      endsAt: c.ends_at,
      rewardAchievementId: c.reward_achievement_id,
    };
  });
}

/**
 * Recomputes challenge progress from the user's latest verified revenue
 * and growth figures. Called after a revenue sync so challenges stay
 * live without a background job.
 */
export async function evaluateChallengeProgress(
  userId: string,
  currentRevenueCents: number,
  growthPercent: number | null,
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now);

  if (!challenges) return;

  for (const challenge of challenges) {
    let progress = 0;
    let completed = false;

    if (challenge.type === "revenue_threshold") {
      progress = Math.min(100, (currentRevenueCents / challenge.target) * 100);
      completed = currentRevenueCents >= challenge.target;
    } else if (challenge.type === "growth_threshold") {
      const growth = growthPercent ?? 0;
      progress = Math.min(100, (growth / challenge.target) * 100);
      completed = growth >= challenge.target;
    } else {
      continue; // consistency / coming_soon tracked elsewhere or not yet implemented
    }

    const { data: existingProgress } = await supabase
      .from("user_challenges")
      .select("status")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .maybeSingle();

    const wasAlreadyCompleted = existingProgress?.status === "completed";

    await supabase.from("user_challenges").upsert(
      {
        user_id: userId,
        challenge_id: challenge.id,
        progress,
        status: completed ? "completed" : "in_progress",
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,challenge_id" },
    );

    if (completed && !wasAlreadyCompleted) {
      if (challenge.reward_achievement_id) {
        await supabase
          .from("user_achievements")
          .upsert(
            { user_id: userId, achievement_id: challenge.reward_achievement_id },
            { onConflict: "user_id,achievement_id" },
          );
      }
      await createNotification({
        userId,
        type: "milestone_reached",
        title: "Défi terminé",
        body: `Tu as complété le défi « ${challenge.title} ».`,
        metadata: { challenge_id: challenge.id },
      });
    }
  }
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
