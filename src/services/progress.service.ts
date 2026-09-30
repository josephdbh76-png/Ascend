import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { nextRevenueMilestone } from "@/services/revenue.service";
import { normalizeRequirement, conditionDef, type ConditionType } from "@/lib/conditions";
import { calculateGrowth } from "@/lib/utils";

/**
 * The progress engine: computes a member's metrics from server-side data
 * only, then updates challenges, titles and achievements. Every write goes
 * through the service role, members can no longer write these rows
 * themselves (see migration 059), so progress can't be forged.
 */

export interface MemberMetrics {
  revenueCents: number;
  growthPercent: number | null;
  customers: number;
  transactions: number;
  followers: number;
  globalRank: number | null;
  verified: boolean;
  verifiedDays: number;
  /** 0-100: photo, bio, skills, activity description. */
  profileCompleteness: number;
  foundingNumber: number | null;
}

export async function getMemberMetrics(userId: string): Promise<MemberMetrics> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: business }, { data: snapshots }, { data: followRows }, { data: rankRows }, { data: firstSnapshot }] =
    await Promise.all([
      admin.from("profiles").select("bio, avatar_url, skills, revenue_verified, founding_member_number").eq("id", userId).maybeSingle(),
      admin.from("businesses").select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("revenue_snapshots")
        .select("amount_cents, transaction_count, customer_count")
        .eq("user_id", userId)
        .eq("is_verified", true)
        .order("period", { ascending: false })
        .limit(2),
      admin.from("follows").select("follower_id").eq("followee_id", userId),
      admin.rpc("get_user_rank", { p_user_id: userId, p_scope: "global", p_scope_value: "" }),
      admin.from("revenue_snapshots").select("created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(1),
    ]);

  // Demo/test accounts following someone don't count.
  const followerIds = (followRows ?? []).map((f) => f.follower_id);
  let followers = 0;
  if (followerIds.length > 0) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("id", followerIds)
      .eq("is_demo", false);
    followers = count ?? 0;
  }

  const current = snapshots?.[0];
  const previous = snapshots?.[1];
  const verified = profile?.revenue_verified ?? false;
  const firstVerifiedAt = firstSnapshot?.[0]?.created_at;
  const verifiedDays =
    verified && firstVerifiedAt ? Math.floor((Date.now() - new Date(firstVerifiedAt).getTime()) / 86_400_000) : 0;

  const completenessItems = [
    !!profile?.avatar_url,
    !!profile?.bio?.trim(),
    (profile?.skills?.length ?? 0) > 0,
    !!(business as { description?: string | null } | null)?.description?.trim(),
  ];

  return {
    revenueCents: current?.amount_cents ?? 0,
    growthPercent: current && previous ? calculateGrowth(current.amount_cents, previous.amount_cents) : null,
    customers: current?.customer_count ?? 0,
    transactions: current?.transaction_count ?? 0,
    followers,
    globalRank: rankRows?.[0]?.rank ?? null,
    verified,
    verifiedDays,
    profileCompleteness: Math.round((completenessItems.filter(Boolean).length / completenessItems.length) * 100),
    foundingNumber: profile?.founding_member_number ?? null,
  };
}

export function evaluateCondition(type: string, target: number, m: MemberMetrics): { progress: number; done: boolean } {
  const ratio = (value: number) => (target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 100);
  switch (type as ConditionType) {
    case "revenue_threshold":
      return { progress: ratio(m.revenueCents), done: m.verified && m.revenueCents >= target };
    case "growth_threshold": {
      const g = m.growthPercent ?? 0;
      return { progress: ratio(g), done: m.growthPercent != null && m.growthPercent >= target };
    }
    case "customer_threshold":
      return { progress: ratio(m.customers), done: m.customers >= target };
    case "transaction_threshold":
      return { progress: ratio(m.transactions), done: m.transactions >= target };
    case "follower_threshold":
      return { progress: ratio(m.followers), done: m.followers >= target };
    case "rank_threshold": {
      if (m.globalRank == null) return { progress: 0, done: false };
      const done = m.globalRank <= target;
      return { progress: done ? 100 : Math.min(99, (target / m.globalRank) * 100), done };
    }
    case "consistency":
      return { progress: ratio(m.verifiedDays), done: m.verifiedDays >= target };
    case "verification":
      return { progress: m.verified ? 100 : 0, done: m.verified };
    case "profile_complete":
      return { progress: m.profileCompleteness, done: m.profileCompleteness >= 100 };
    case "founding_member":
      // Unlocked at the first verification, as promised on the dashboard.
      return { progress: m.foundingNumber != null ? (m.verified ? 100 : 50) : 0, done: m.foundingNumber != null && m.verified };
    default:
      return { progress: 0, done: false };
  }
}

export interface ProgressChanges {
  completedChallenges: string[];
  newTitles: string[];
  newAchievements: string[];
}

export async function grantTitleToMember(
  userId: string,
  titleId: string,
  opts: {
    notify?: boolean;
    body?: string;
    /** Pass it when granting several titles in one render: identical reads are memoized per request. */
    hasActiveTitle?: boolean;
  } = {},
) {
  const admin = createAdminClient();
  const [{ data: owned }, { data: def }, activeResult] = await Promise.all([
    admin.from("user_titles").select("id").eq("user_id", userId).eq("title_id", titleId).maybeSingle(),
    admin.from("titles").select("name").eq("id", titleId).maybeSingle(),
    opts.hasActiveTitle === undefined
      ? admin.from("user_titles").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle()
      : Promise.resolve({ data: opts.hasActiveTitle ? { id: "" } : null }),
  ]);
  if (owned || !def) return false;

  // Auto-display a member's first title: most people never go flip that switch.
  const { error } = await admin
    .from("user_titles")
    .insert({ user_id: userId, title_id: titleId, acquisition_type: "earned", is_active: !activeResult.data });
  if (error) {
    console.error(`Title grant ${titleId} failed:`, error.message);
    return false;
  }

  if (opts.notify !== false) {
    await createNotificationForUser({
      userId,
      type: "achievement_unlocked",
      title: "Nouveau titre débloqué",
      body: opts.body ?? `Tu peux désormais afficher le titre « ${def.name} » sur ton profil.`,
      metadata: { title_id: titleId },
    });
  }
  return true;
}

export async function grantAchievementToMember(userId: string, achievementId: string, opts: { notify?: boolean } = {}) {
  const admin = createAdminClient();
  const [{ data: owned }, { data: def }] = await Promise.all([
    admin.from("user_achievements").select("id").eq("user_id", userId).eq("achievement_id", achievementId).maybeSingle(),
    admin.from("achievements").select("name").eq("id", achievementId).maybeSingle(),
  ]);
  if (owned || !def) return false;

  const { error } = await admin.from("user_achievements").insert({ user_id: userId, achievement_id: achievementId });
  if (error) return false;

  if (opts.notify !== false) {
    await createNotificationForUser({
      userId,
      type: "achievement_unlocked",
      title: "Accomplissement débloqué",
      body: `Tu viens de débloquer « ${def.name} ».`,
      metadata: { achievement_id: achievementId },
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Grouped notifications: a member connecting a long revenue history can
// unlock a dozen things in one sync. Up to two stay individual; from three
// on, one summary per kind.
// ---------------------------------------------------------------------------

const GROUP_FROM = 3;
const RARITY_ORDER = ["legendary", "epic", "rare", "common"];

function listNames(names: string[]): string {
  const quoted = names.map((n) => `« ${n} »`);
  if (quoted.length <= 3) return quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} et ${quoted.at(-1)}`;
  return `${quoted.slice(0, 3).join(", ")} et ${quoted.length - 3} autre${quoted.length - 3 > 1 ? "s" : ""}`;
}

async function notifyChallenges(userId: string, list: { id: string; title: string; points: number }[]) {
  if (list.length < GROUP_FROM) {
    for (const c of list) {
      await createNotificationForUser({
        userId,
        type: "milestone_reached",
        title: c.points > 0 ? `Défi réussi : +${c.points} points` : "Défi réussi",
        body: `Tu as réussi le défi « ${c.title} ».`,
        metadata: { challenge_id: c.id },
      });
    }
    return;
  }
  const points = list.reduce((sum, c) => sum + c.points, 0);
  await createNotificationForUser({
    userId,
    type: "milestone_reached",
    title: points > 0 ? `${list.length} défis réussis : +${points} points` : `${list.length} défis réussis`,
    body: `${listNames(list.map((c) => c.title))}. Regarde où ça te place dans la saison.`,
    metadata: { challenge_ids: list.map((c) => c.id) },
  });
}

async function notifyTitles(userId: string, list: { id: string; name: string }[]) {
  if (list.length < GROUP_FROM) {
    for (const t of list) {
      await createNotificationForUser({
        userId,
        type: "achievement_unlocked",
        title: "Nouveau titre débloqué",
        body: `Tu peux désormais afficher le titre « ${t.name} » sur ton profil.`,
        metadata: { title_id: t.id },
      });
    }
    return;
  }
  await createNotificationForUser({
    userId,
    type: "achievement_unlocked",
    title: `${list.length} nouveaux titres débloqués`,
    body: `${listNames(list.map((t) => t.name))}. Choisis celui à afficher sur ton profil.`,
    metadata: { title_ids: list.map((t) => t.id) },
  });
}

async function notifyAchievements(userId: string, list: { id: string; name: string; rarity: string }[]) {
  if (list.length < GROUP_FROM) {
    for (const a of list) {
      await createNotificationForUser({
        userId,
        type: "achievement_unlocked",
        title: "Accomplissement débloqué",
        body: `Tu viens de débloquer « ${a.name} ».`,
        metadata: { achievement_id: a.id },
      });
    }
    return;
  }
  // The dashboard celebrates the achievement in metadata: the rarest one.
  const rarest = [...list].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))[0];
  await createNotificationForUser({
    userId,
    type: "achievement_unlocked",
    title: `${list.length} accomplissements débloqués`,
    body: `${listNames(list.map((a) => a.name))}.`,
    metadata: { achievement_id: rarest.id, achievement_ids: list.map((a) => a.id) },
  });
}

export async function refreshMemberProgress(userId: string, metrics?: MemberMetrics): Promise<ProgressChanges> {
  const admin = createAdminClient();
  const m = metrics ?? (await getMemberMetrics(userId));
  const now = new Date().toISOString();
  const changes: ProgressChanges = { completedChallenges: [], newTitles: [], newAchievements: [] };

  const [
    { data: challenges },
    { data: progressRows },
    { data: titles },
    { data: ownedTitles },
    { data: achievements },
    { data: ownedAchievements },
    { data: activeSeasons },
  ] =
    await Promise.all([
      // select("*"): also works before the season columns exist (migration 060).
      admin.from("challenges").select("*").lte("starts_at", now).gte("ends_at", now),
      admin.from("user_challenges").select("challenge_id, status, progress").eq("user_id", userId),
      admin.from("titles").select("id, name, requirement").eq("type", "earned"),
      admin.from("user_titles").select("title_id, is_active").eq("user_id", userId),
      admin.from("achievements").select("id, name, rarity, criteria"),
      admin.from("user_achievements").select("achievement_id").eq("user_id", userId),
      admin.from("seasons").select("id").eq("is_active", true),
    ]);
  // A season being prepared (not active yet) never hands out points early.
  const activeSeasonIds = new Set((activeSeasons ?? []).map((s) => s.id));

  const progressByChallenge = new Map((progressRows ?? []).map((p) => [p.challenge_id, p]));
  let hasActiveTitle = (ownedTitles ?? []).some((t) => t.is_active);
  const grantTitle = async (titleId: string, notify = true) => {
    const granted = await grantTitleToMember(userId, titleId, { hasActiveTitle, notify });
    if (granted) hasActiveTitle = true;
    return granted;
  };
  const doneChallenges: { id: string; title: string; points: number }[] = [];
  const earnedTitles: { id: string; name: string }[] = [];
  const earnedAchievements: { id: string; name: string; rarity: string }[] = [];
  const titleNames = new Map((titles ?? []).map((t) => [t.id, t.name]));
  const achievementDefs = new Map((achievements ?? []).map((a) => [a.id, a]));

  for (const raw of challenges ?? []) {
    const c = { ...raw, points: raw.points ?? 0, reward_title_id: raw.reward_title_id ?? null };
    if (c.type === "coming_soon" || raw.is_published === false) continue;
    if (c.season_id && !activeSeasonIds.has(c.season_id)) continue;
    const existing = progressByChallenge.get(c.id);
    // A completed challenge stays completed: its season points are earned.
    if (existing?.status === "completed") continue;

    const { progress, done } = evaluateCondition(c.type, Number(c.target), m);
    if (!done && existing && Math.abs(Number(existing.progress) - progress) < 0.5) continue;

    const { error } = await admin.from("user_challenges").upsert(
      {
        user_id: userId,
        challenge_id: c.id,
        progress,
        status: done ? "completed" : "in_progress",
        completed_at: done ? now : null,
      },
      { onConflict: "user_id,challenge_id" },
    );
    if (error || !done) continue;

    changes.completedChallenges.push(c.id);
    doneChallenges.push({ id: c.id, title: c.title, points: c.points });
    if (c.reward_achievement_id && (await grantAchievementToMember(userId, c.reward_achievement_id, { notify: false }))) {
      changes.newAchievements.push(c.reward_achievement_id);
      const def = achievementDefs.get(c.reward_achievement_id);
      earnedAchievements.push({ id: c.reward_achievement_id, name: def?.name ?? "Accomplissement", rarity: def?.rarity ?? "common" });
    }
    if (c.reward_title_id && (await grantTitle(c.reward_title_id, false))) {
      changes.newTitles.push(c.reward_title_id);
      earnedTitles.push({ id: c.reward_title_id, name: titleNames.get(c.reward_title_id) ?? "Titre" });
    }
  }

  const ownedTitleIds = new Set((ownedTitles ?? []).map((t) => t.title_id));
  for (const t of titles ?? []) {
    if (ownedTitleIds.has(t.id)) continue;
    const condition = normalizeRequirement(t.requirement);
    if (!condition || !conditionDef(condition.type)?.automatic) continue;
    if (evaluateCondition(condition.type, condition.target, m).done && (await grantTitle(t.id, false))) {
      changes.newTitles.push(t.id);
      earnedTitles.push({ id: t.id, name: t.name });
    }
  }

  const ownedAchievementIds = new Set((ownedAchievements ?? []).map((a) => a.achievement_id));
  for (const a of achievements ?? []) {
    if (ownedAchievementIds.has(a.id) || changes.newAchievements.includes(a.id)) continue;
    const condition = normalizeRequirement(a.criteria);
    if (!condition || !conditionDef(condition.type)?.automatic) continue;
    if (evaluateCondition(condition.type, condition.target, m).done && (await grantAchievementToMember(userId, a.id, { notify: false }))) {
      changes.newAchievements.push(a.id);
      earnedAchievements.push({ id: a.id, name: a.name, rarity: a.rarity });
    }
  }

  await notifyChallenges(userId, doneChallenges);
  await notifyTitles(userId, earnedTitles);
  await notifyAchievements(userId, earnedAchievements);
  return changes;
}

/** Called by every revenue connector after a successful sync. */
export async function afterRevenueSync(userId: string) {
  const metrics = await getMemberMetrics(userId);
  await refreshMemberProgress(userId, metrics);
  return {
    currentRevenueCents: metrics.revenueCents > 0 ? metrics.revenueCents : null,
    rank: metrics.globalRank,
    milestoneCents: metrics.revenueCents > 0 ? nextRevenueMilestone(metrics.revenueCents).targetCents : null,
  };
}
