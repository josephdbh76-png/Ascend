import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { grantTitleToMember, grantAchievementToMember } from "@/services/progress.service";
import { requirementJson, type ConditionType } from "@/lib/conditions";
import type { AchievementRarity, TitleRarity } from "@/types/database.types";

/** Admin-only service — every caller must check isCurrentUserAdmin() first. */

export interface CatalogTitle {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: TitleRarity;
  type: "earned" | "purchasable";
  requirement: Record<string, unknown>;
  ownerCount: number;
}

export interface CatalogTrophy {
  id: string;
  name: string;
  description: string;
  icon: string;
  ownerCount: number;
}

export interface CatalogAchievement {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  criteria: Record<string, unknown>;
  ownerCount: number;
}

function tally(rows: { key: string }[] | null) {
  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
  return counts;
}

export async function getAdminCatalog(): Promise<{
  titles: CatalogTitle[];
  trophies: CatalogTrophy[];
  achievements: CatalogAchievement[];
}> {
  const admin = createAdminClient();
  const [{ data: titles }, { data: trophies }, { data: achievements }, { data: ut }, { data: utr }, { data: ua }] =
    await Promise.all([
      admin.from("titles").select("id, name, description, icon, rarity, type, requirement").order("created_at"),
      admin.from("trophies").select("id, name, description, icon").order("created_at"),
      admin.from("achievements").select("id, name, description, rarity, criteria").order("created_at"),
      admin.from("user_titles").select("title_id"),
      admin.from("user_trophies").select("trophy_id"),
      admin.from("user_achievements").select("achievement_id"),
    ]);
  const titleCounts = tally((ut ?? []).map((r) => ({ key: r.title_id })));
  const trophyCounts = tally((utr ?? []).map((r) => ({ key: r.trophy_id })));
  const achievementCounts = tally((ua ?? []).map((r) => ({ key: r.achievement_id })));
  return {
    titles: (titles ?? []).map((t) => ({ ...t, ownerCount: titleCounts.get(t.id) ?? 0 })),
    trophies: (trophies ?? []).map((t) => ({ ...t, ownerCount: trophyCounts.get(t.id) ?? 0 })),
    achievements: (achievements ?? []).map((a) => ({ ...a, ownerCount: achievementCounts.get(a.id) ?? 0 })),
  };
}

function slugId(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "item"
  ) + `-${Date.now().toString(36).slice(-4)}`;
}

export async function createTitle(input: {
  name: string;
  description: string;
  icon: string;
  rarity: TitleRarity;
  condition: ConditionType;
  target: number | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("titles").insert({
    id: slugId(input.name),
    name: input.name,
    description: input.description,
    icon: input.icon,
    rarity: input.rarity,
    type: "earned",
    requirement: requirementJson(input.condition, input.target),
    tradeable: false,
  });
  if (error) throw new Error(error.message);
}

export async function createTrophy(input: { name: string; description: string; icon: string }) {
  const admin = createAdminClient();
  const { error } = await admin.from("trophies").insert({ id: slugId(input.name), ...input });
  if (error) throw new Error(error.message);
}

export async function createAchievement(input: {
  name: string;
  description: string;
  rarity: AchievementRarity;
  condition: ConditionType;
  target: number | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("achievements").insert({
    id: slugId(input.name),
    name: input.name,
    description: input.description,
    icon: "award",
    rarity: input.rarity,
    criteria: requirementJson(input.condition, input.target),
  });
  if (error) throw new Error(error.message);
}

async function userIdForUsername(username: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username.trim().replace(/^@/, "").toLowerCase())
    .maybeSingle();
  if (!data) throw new Error("Aucun membre avec ce nom d'utilisateur.");
  return data.id;
}

export async function grantRewardToMember(input: { username: string; kind: "title" | "trophy" | "achievement"; id: string }) {
  const userId = await userIdForUsername(input.username);
  if (input.kind === "title") {
    if (!(await grantTitleToMember(userId, input.id, { body: "L'équipe ASCEND t'a attribué un nouveau titre." }))) {
      throw new Error("Ce membre possède déjà ce titre.");
    }
    return;
  }
  if (input.kind === "achievement") {
    if (!(await grantAchievementToMember(userId, input.id))) throw new Error("Ce membre a déjà cet accomplissement.");
    return;
  }
  const admin = createAdminClient();
  const { data: trophy } = await admin.from("trophies").select("name").eq("id", input.id).maybeSingle();
  if (!trophy) throw new Error("Trophée introuvable.");
  const { error } = await admin.from("user_trophies").insert({ user_id: userId, trophy_id: input.id });
  if (error) throw new Error(error.message);
  await createNotificationForUser({
    userId,
    type: "achievement_unlocked",
    title: "Nouveau trophée",
    body: `L'équipe ASCEND t'a remis le trophée « ${trophy.name} ».`,
    metadata: { trophy_id: input.id },
  });
}
