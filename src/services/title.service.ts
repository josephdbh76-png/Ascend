import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/services/notification.service";
import type { TitleRow, EarnedTitle } from "@/types";

export async function getTitleCatalog(): Promise<TitleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("titles").select("*").order("rarity");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserTitles(userId: string): Promise<EarnedTitle[]> {
  const supabase = await createClient();
  const { data: owned, error } = await supabase
    .from("user_titles")
    .select("title_id, acquired_at, acquisition_type, is_active")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!owned || owned.length === 0) return [];

  const { data: catalog } = await supabase
    .from("titles")
    .select("*")
    .in("id", owned.map((o) => o.title_id));

  const byId = new Map((catalog ?? []).map((t) => [t.id, t]));

  return owned
    .filter((o) => byId.has(o.title_id))
    .map((o) => {
      const def = byId.get(o.title_id)!;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        acquiredAt: o.acquired_at,
        acquisitionType: o.acquisition_type,
        isActive: o.is_active,
      };
    });
}

export async function getActiveTitle(userId: string): Promise<EarnedTitle | null> {
  const titles = await getUserTitles(userId);
  return titles.find((t) => t.isActive) ?? null;
}

export async function setActiveTitle(userId: string, titleId: string | null) {
  const supabase = await createClient();
  await supabase.from("user_titles").update({ is_active: false }).eq("user_id", userId);
  if (titleId) {
    await supabase
      .from("user_titles")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("title_id", titleId);
  }
}

async function grantEarnedTitle(userId: string, titleId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_titles")
    .select("id")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();
  if (existing) return false;

  const { data: def } = await supabase.from("titles").select("name").eq("id", titleId).maybeSingle();
  if (!def) return false;

  const { error } = await supabase
    .from("user_titles")
    .insert({ user_id: userId, title_id: titleId, acquisition_type: "earned" });
  if (error) return false;

  await createNotification({
    userId,
    type: "achievement_unlocked",
    title: "Nouveau titre débloqué",
    body: `Tu peux désormais afficher le titre « ${def.name} » sur ton profil.`,
    metadata: { title_id: titleId },
  });

  return true;
}

/**
 * Re-evaluates every "earned" title against the user's current standing.
 * Safe to call repeatedly — grants are idempotent. Mirrors the achievement
 * engine but for collectible profile titles.
 */
export async function evaluateEarnedTitles(
  userId: string,
  data: {
    revenueCents?: number;
    growthPercent?: number | null;
    globalRank?: number | null;
    foundingMemberNumber?: number | null;
    isVerified?: boolean;
  },
) {
  const newlyEarned: string[] = [];

  if (data.isVerified && (await grantEarnedTitle(userId, "the-builder"))) newlyEarned.push("the-builder");

  if (data.foundingMemberNumber != null && (await grantEarnedTitle(userId, "founding-member"))) {
    newlyEarned.push("founding-member");
  }

  if (data.globalRank != null) {
    const rankTitles: [number, string][] = [
      [10, "top-10"],
      [50, "top-50"],
      [100, "top-100"],
    ];
    for (const [rank, id] of rankTitles) {
      if (data.globalRank <= rank && (await grantEarnedTitle(userId, id))) newlyEarned.push(id);
    }
  }

  if (data.growthPercent != null && data.growthPercent >= 30 && (await grantEarnedTitle(userId, "growth-machine"))) {
    newlyEarned.push("growth-machine");
  }

  if (data.revenueCents != null && data.revenueCents >= 10000000 && (await grantEarnedTitle(userId, "100k-club"))) {
    newlyEarned.push("100k-club");
  }

  return newlyEarned;
}

export async function purchaseExclusiveTitle(titleId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_exclusive_title", { p_title_id: titleId });
  if (error) throw new Error(error.message);
  return data ?? false;
}
