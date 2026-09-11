import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/constants";
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

async function grantAchievement(userId: string, achievementId: string) {
  const supabase = await createClient();
  await supabase
    .from("user_achievements")
    .upsert({ user_id: userId, achievement_id: achievementId }, { onConflict: "user_id,achievement_id" });
}

/**
 * Evaluates revenue-threshold and one-off achievements against the user's
 * current verified revenue. Safe to call repeatedly — grants are
 * idempotent via the (user_id, achievement_id) unique constraint.
 */
export async function evaluateRevenueAchievements(userId: string, currentRevenueCents: number) {
  const supabase = await createClient();
  const newlyEarned: string[] = [];

  await grantAchievement(userId, "first-verified-revenue");

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!("threshold" in def) || !def.threshold) continue;
    if (currentRevenueCents >= def.threshold) {
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_id", def.id)
        .maybeSingle();
      if (!existing) {
        await grantAchievement(userId, def.id);
        newlyEarned.push(def.id);
      }
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
      await grantAchievement(userId, id);
      newlyEarned.push(id);
    }
  }
  return newlyEarned;
}

export async function evaluateFoundingMemberAchievement(userId: string, foundingMemberNumber: number | null) {
  if (foundingMemberNumber != null) {
    await grantAchievement(userId, "founding-member");
  }
}
