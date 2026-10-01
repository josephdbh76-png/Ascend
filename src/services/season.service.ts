import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { grantTitleToMember } from "@/services/progress.service";
import { placeSeasonScorers } from "@/services/league.service";
import { league as leagueDef, isLeagueId, type LeagueId } from "@/lib/leagues";
import type { SeasonRewardKind, SeasonStandingRow, SeasonActivityRow, PhysicalRewardStatus } from "@/types/database.types";

export interface Season {
  id: string;
  number: number;
  name: string;
  label: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  rewardsDistributedAt: string | null;
}

export interface SeasonReward {
  id: string;
  seasonId: string;
  rankFrom: number;
  rankTo: number;
  kind: SeasonRewardKind;
  titleId: string | null;
  trophyId: string | null;
  label: string;
  /** null: every league. */
  league: LeagueId | null;
}

function mapSeason(s: {
  id: string;
  number: number;
  name: string;
  label: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  rewards_distributed_at: string | null;
}): Season {
  return {
    id: s.id,
    number: s.number,
    name: s.name,
    label: s.label,
    description: s.description,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    isActive: s.is_active,
    rewardsDistributedAt: s.rewards_distributed_at,
  };
}

export const getActiveSeason = cache(async (): Promise<Season | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*").eq("is_active", true).maybeSingle();
  return data ? mapSeason(data) : null;
});

export async function listSeasons(): Promise<Season[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*").order("number", { ascending: false });
  return (data ?? []).map(mapSeason);
}

export async function getSeasonRewards(seasonId: string): Promise<SeasonReward[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("season_rewards")
    .select("*")
    .eq("season_id", seasonId)
    .order("rank_from", { ascending: true })
    .order("kind", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    seasonId: r.season_id,
    rankFrom: r.rank_from,
    rankTo: r.rank_to,
    kind: r.kind,
    titleId: r.title_id,
    trophyId: r.trophy_id,
    label: r.label,
    league: isLeagueId(r.league) ? r.league : null,
  }));
}

/** Rewards of one league's ranking. */
export function rewardsForLeague<T extends { league: string | null }>(rewards: T[], league: string): T[] {
  return rewards.filter((r) => r.league == null || r.league === league);
}

export async function getSeasonStandings(seasonId: string, limit = 50, league: LeagueId | null = null): Promise<SeasonStandingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_season_standings", { p_season_id: seasonId, p_limit: limit, p_league: league });
  if (error) return [];
  return data ?? [];
}

/** Latest challenges completed in a league, newest first. */
export async function getSeasonActivity(seasonId: string, league: LeagueId, limit = 12): Promise<SeasonActivityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_season_activity", { p_season_id: seasonId, p_league: league, p_limit: limit });
  if (error) return [];
  return data ?? [];
}

export async function getUserSeasonStanding(seasonId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_user_season_standing", { p_season_id: seasonId, p_user_id: userId });
  const row = data?.[0];
  return row
    ? { rank: Number(row.rank), points: Number(row.points), total: Number(row.total), league: isLeagueId(row.league) ? row.league : ("bronze" as LeagueId) }
    : null;
}

export interface SeasonResult {
  seasonId: string;
  seasonName: string;
  seasonLabel: string;
  rank: number;
  points: number;
  rewards: string[];
  league: LeagueId | null;
}

export async function getUserSeasonResults(userId: string): Promise<SeasonResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("season_results")
    .select("season_id, rank, points, rewards, league, seasons(name, label)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const season = r.seasons as unknown as { name: string; label: string } | null;
    return {
      seasonId: r.season_id,
      seasonName: season?.name ?? "Saison",
      seasonLabel: season?.label ?? "",
      rank: r.rank,
      points: r.points,
      rewards: r.rewards,
      league: isLeagueId(r.league) ? r.league : null,
    };
  });
}

// ---------------------------------------------------------------- admin

export interface AdminChallengeRow {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  points: number;
  isPublished: boolean;
  rewardTitleId: string | null;
  leagues: LeagueId[] | null;
  completedCount: number;
}

export async function listSeasonChallengesForAdmin(seasonId: string): Promise<AdminChallengeRow[]> {
  const admin = createAdminClient();
  const [{ data: challenges }, { data: done }] = await Promise.all([
    admin.from("challenges").select("*").eq("season_id", seasonId).order("points", { ascending: true }),
    admin.from("user_challenges").select("challenge_id").eq("status", "completed"),
  ]);
  const counts = new Map<string, number>();
  for (const d of done ?? []) counts.set(d.challenge_id, (counts.get(d.challenge_id) ?? 0) + 1);
  return (challenges ?? [])
    .filter((c) => c.type !== "coming_soon")
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      target: Number(c.target),
      points: c.points ?? 0,
      isPublished: c.is_published !== false,
      rewardTitleId: c.reward_title_id ?? null,
      leagues: c.leagues?.length ? (c.leagues.filter(isLeagueId) as LeagueId[]) : null,
      completedCount: counts.get(c.id) ?? 0,
    }));
}

export interface SeasonInput {
  id?: string;
  number: number;
  name: string;
  label: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
}

/** Admin-only — callers must check isCurrentUserAdmin() first. */
export async function saveSeason(input: SeasonInput): Promise<string> {
  const admin = createAdminClient();
  const row = {
    number: input.number,
    name: input.name,
    label: input.label,
    description: input.description,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };
  if (input.id) {
    const { error } = await admin.from("seasons").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
    // Season challenges follow the season's dates.
    await admin.from("challenges").update({ starts_at: input.startsAt, ends_at: input.endsAt }).eq("season_id", input.id);
    return input.id;
  }
  const { data, error } = await admin.from("seasons").insert({ ...row, is_active: false }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Saison non créée.");
  return data.id;
}

export async function activateSeason(seasonId: string) {
  const admin = createAdminClient();
  // One active season at a time (unique partial index).
  await admin.from("seasons").update({ is_active: false }).eq("is_active", true);
  const { error } = await admin.from("seasons").update({ is_active: true }).eq("id", seasonId);
  if (error) throw new Error(error.message);
}

export interface ChallengeInput {
  id?: string;
  seasonId: string;
  title: string;
  description: string;
  type: string;
  target: number;
  points: number;
  rewardTitleId: string | null;
  isPublished: boolean;
  /** null or empty: every league. */
  leagues: LeagueId[] | null;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function saveChallenge(input: ChallengeInput) {
  const admin = createAdminClient();
  const { data: season } = await admin.from("seasons").select("starts_at, ends_at").eq("id", input.seasonId).single();
  if (!season) throw new Error("Saison introuvable.");
  const row = {
    season_id: input.seasonId,
    title: input.title,
    description: input.description,
    type: input.type as never,
    target: input.target,
    points: input.points,
    reward_title_id: input.rewardTitleId,
    is_published: input.isPublished,
    leagues: input.leagues?.filter(isLeagueId).length ? input.leagues.filter(isLeagueId) : null,
    starts_at: season.starts_at,
    ends_at: season.ends_at,
  };
  if (input.id) {
    const { error } = await admin.from("challenges").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
    return;
  }
  const slug = `${slugify(input.title)}-${Date.now().toString(36)}`;
  const { error } = await admin.from("challenges").insert({ ...row, slug });
  if (error) throw new Error(error.message);
}

export async function deleteChallenge(challengeId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("challenges").delete().eq("id", challengeId);
  if (error) throw new Error(error.message);
}

export interface RewardInput {
  seasonId: string;
  rankFrom: number;
  rankTo: number;
  kind: SeasonRewardKind;
  titleId: string | null;
  trophyId: string | null;
  label: string;
  league: LeagueId | null;
}

export async function addSeasonReward(input: RewardInput) {
  const admin = createAdminClient();
  const { error } = await admin.from("season_rewards").insert({
    season_id: input.seasonId,
    rank_from: input.rankFrom,
    rank_to: input.rankTo,
    kind: input.kind,
    title_id: input.kind === "title" ? input.titleId : null,
    trophy_id: input.kind === "trophy" ? input.trophyId : null,
    label: input.label,
    league: input.league && isLeagueId(input.league) ? input.league : null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSeasonReward(rewardId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("season_rewards").delete().eq("id", rewardId);
  if (error) throw new Error(error.message);
}

export interface AdminStandingRow extends SeasonStandingRow {
  email: string | null;
  rewards: string[];
}

/** Final standings with the rewards each member would receive, for the admin preview before closing. */
export async function previewSeasonClosing(seasonId: string): Promise<AdminStandingRow[]> {
  const admin = createAdminClient();
  const [{ data: standings }, { data: rewards }] = await Promise.all([
    admin.rpc("get_season_standings", { p_season_id: seasonId, p_limit: 1000 }),
    admin.from("season_rewards").select("*").eq("season_id", seasonId),
  ]);
  const rows = standings ?? [];
  const emails = new Map<string, string>();
  await Promise.all(
    rows.slice(0, 50).map(async (r) => {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      if (data?.user?.email) emails.set(r.user_id, data.user.email);
    }),
  );
  return rows.map((r) => ({
    ...r,
    email: emails.get(r.user_id) ?? null,
    rewards: rewardsForLeague(rewards ?? [], r.league)
      .filter((w) => Number(r.rank) >= w.rank_from && Number(r.rank) <= w.rank_to)
      .map((w) => w.label),
  }));
}

/**
 * Freezes the final standings, hands out every reward tier and notifies the
 * winners. Refuses to run twice for the same season.
 */
export async function closeSeasonAndDistribute(seasonId: string): Promise<{ winners: number }> {
  const admin = createAdminClient();
  const { data: season } = await admin.from("seasons").select("*").eq("id", seasonId).single();
  if (!season) throw new Error("Saison introuvable.");
  if (season.rewards_distributed_at) throw new Error("Les récompenses de cette saison ont déjà été distribuées.");

  // Claim the distribution first so a double click can't run it twice.
  const { data: claimed } = await admin
    .from("seasons")
    .update({ rewards_distributed_at: new Date().toISOString(), is_active: false })
    .eq("id", seasonId)
    .is("rewards_distributed_at", null)
    .select("id");
  if (!claimed?.length) throw new Error("Les récompenses de cette saison ont déjà été distribuées.");

  // Final leagues, with every revenue month synced up to now.
  await placeSeasonScorers({ id: season.id, startsAt: season.starts_at, endsAt: season.ends_at });

  const [{ data: standings }, { data: rewards }] = await Promise.all([
    admin.rpc("get_season_standings", { p_season_id: seasonId, p_limit: 100000 }),
    admin.from("season_rewards").select("*").eq("season_id", seasonId),
  ]);

  let winners = 0;
  for (const row of standings ?? []) {
    const rank = Number(row.rank);
    const won = rewardsForLeague(rewards ?? [], row.league).filter((w) => rank >= w.rank_from && rank <= w.rank_to);
    const hasPhysical = won.some((w) => w.kind === "physical");

    await admin.from("season_results").upsert(
      {
        season_id: seasonId,
        user_id: row.user_id,
        rank,
        points: Number(row.points),
        rewards: won.map((w) => w.label),
        physical_status: hasPhysical ? "to_send" : "none",
        league: row.league,
      },
      { onConflict: "season_id,user_id" },
    );

    if (won.length === 0) continue;
    winners++;

    for (const w of won) {
      if (w.kind === "title" && w.title_id) {
        await grantTitleToMember(row.user_id, w.title_id, { notify: false });
      } else if (w.kind === "trophy" && w.trophy_id) {
        await admin.from("user_trophies").insert({ user_id: row.user_id, trophy_id: w.trophy_id, season_id: seasonId });
      }
    }

    await createNotificationForUser({
      userId: row.user_id,
      type: "season_reward",
      title: `${season.name} : tu termines #${rank} en ligue ${leagueDef(row.league).name}`,
      body: `Bravo ! Tu remportes : ${won.map((w) => w.label).join(", ")}.${
        hasPhysical ? " L'équipe ASCEND va te contacter par e-mail pour l'envoi de ta récompense physique." : ""
      }`,
      metadata: { season_id: seasonId, rank },
    });
  }

  return { winners };
}

export interface PhysicalRewardRow {
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  rank: number;
  rewards: string[];
  status: PhysicalRewardStatus;
  league: LeagueId | null;
}

export async function listPhysicalRewards(seasonId: string): Promise<PhysicalRewardRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("season_results")
    .select("user_id, rank, rewards, physical_status, league, profiles(username, first_name, last_name)")
    .eq("season_id", seasonId)
    .neq("physical_status", "none")
    .order("rank", { ascending: true });
  return Promise.all(
    (data ?? []).map(async (r) => {
      const p = r.profiles as unknown as { username: string; first_name: string | null; last_name: string | null } | null;
      const { data: u } = await admin.auth.admin.getUserById(r.user_id);
      return {
        userId: r.user_id,
        username: p?.username ?? "",
        firstName: p?.first_name ?? null,
        lastName: p?.last_name ?? null,
        email: u?.user?.email ?? null,
        rank: r.rank,
        rewards: r.rewards,
        status: r.physical_status,
        league: isLeagueId(r.league) ? r.league : null,
      };
    }),
  );
}

export async function setPhysicalRewardStatus(seasonId: string, userId: string, status: PhysicalRewardStatus) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("season_results")
    .update({ physical_status: status })
    .eq("season_id", seasonId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
