import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/constants";
import { createNotification } from "@/services/notification.service";
import type { EarnedAchievement } from "@/types";

export async function getUserAchievements(userId: string): Promise<EarnedAchievement[]> {
  const supabase = await createClient();
  const { data: earned, error } = await supabase
    .from("user_achievements")
    .select("achievement_id, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!earned || earned.length === 0) return [];

  const { data: catalog } = await supabase
    .from("achievements")
    .select("*")
    .in("id", earned.map((e) => e.achievement_id));

  const byId = new Map((catalog ?? []).map((a) => [a.id, a]));

  return earned
    .filter((row) => byId.has(row.achievement_id))
    .map((row) => {
      const def = byId.get(row.achievement_id)!;
      return {
        id: def.id,
        earnedAt: row.earned_at,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
      };
    });
}

export async function getAllAchievementCatalog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("rarity", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Grants an achievement if not already earned. Returns true only when
 * this call is the one that newly unlocked it, so callers can notify
 * exactly once. */
async function grantAchievement(userId: string, achievementId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .maybeSingle();

  if (existing) return false;

  await supabase
    .from("user_achievements")
    .upsert({ user_id: userId, achievement_id: achievementId }, { onConflict: "user_id,achievement_id" });

  const { data: def } = await supabase
    .from("achievements")
    .select("name, description")
    .eq("id", achievementId)
    .maybeSingle();

  if (def) {
    await createNotification({
      userId,
      type: "achievement_unlocked",
      title: "Accomplissement débloqué",
      body: `Tu viens de débloquer « ${def.name} ».`,
      metadata: { achievement_id: achievementId },
    });
  }

  return true;
}

/**
 * Evaluates revenue-threshold and one-off achievements against the user's
 * current verified revenue. Safe to call repeatedly — grants are
 * idempotent via the (user_id, achievement_id) unique constraint.
 */
export async function evaluateRevenueAchievements(userId: string, currentRevenueCents: number) {
  const newlyEarned: string[] = [];

  if (await grantAchievement(userId, "first-verified-revenue")) newlyEarned.push("first-verified-revenue");

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!("threshold" in def) || !def.threshold) continue;
    if (currentRevenueCents >= def.threshold) {
      if (await grantAchievement(userId, def.id)) newlyEarned.push(def.id);
    }
  }

  return newlyEarned;
}

export async function evaluateRankAchievements(userId: string, globalRank: number) {
  const thresholds: [number, string][] = [
    [10, "top-10"],
    [50, "top-50"],
    [100, "top-100"],
  ];
  const newlyEarned: string[] = [];
  for (const [rank, id] of thresholds) {
    if (globalRank <= rank) {
      if (await grantAchievement(userId, id)) newlyEarned.push(id);
    }
  }
  return newlyEarned;
}

export async function evaluateFoundingMemberAchievement(userId: string, foundingMemberNumber: number | null) {
  if (foundingMemberNumber != null) {
    await grantAchievement(userId, "founding-member");
  }
}
