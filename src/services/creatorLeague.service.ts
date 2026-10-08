import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantTitleToMember } from "@/services/progress.service";
import { createNotificationForUser } from "@/services/notification.service";
import { WAR_TITLE_ID, warScore, warWinner, type WarScore } from "@/lib/creatorLeagues";

export interface LeagueCaptain {
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface CreatorLeague {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  isActive: boolean;
  influencerId: string | null;
  ownerId: string | null;
  captain: LeagueCaptain | null;
  memberCount: number;
}

export interface LeagueStanding {
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isDemo: boolean;
  revenueVerified: boolean;
  /** null when the member keeps their revenue private, or has a single verified month. */
  growthPercent: number | null;
  growthPrivate: boolean;
  /** Position in the internal ranking; only verified members with a visible growth are ranked. */
  rank: number | null;
}

export type WarStatus = "upcoming" | "live" | "ended" | "closed";

export interface LeagueWarSide {
  league: Pick<CreatorLeague, "id" | "slug" | "name" | "captain">;
  /** Live breakdown while the war runs; null once closed (only the total is kept). */
  score: WarScore | null;
  total: number | null;
}

export interface LeagueWar {
  id: string;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  status: WarStatus;
  a: LeagueWarSide;
  b: LeagueWarSide;
  winner: "a" | "b" | null;
}

type LeagueRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  is_active: boolean;
  influencer_id: string | null;
  owner_id: string | null;
};

async function hydrateLeagues(rows: LeagueRow[]): Promise<CreatorLeague[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const ownerIds = rows.map((r) => r.owner_id).filter((id): id is string => !!id);
  const [{ data: owners }, { data: members }] = await Promise.all([
    ownerIds.length
      ? admin.from("profiles").select("id, username, first_name, last_name, avatar_url").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] }),
    admin.from("creator_league_members").select("league_id").in("league_id", rows.map((r) => r.id)),
  ]);
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
  const counts = new Map<string, number>();
  for (const m of members ?? []) counts.set(m.league_id, (counts.get(m.league_id) ?? 0) + 1);
  return rows.map((r) => {
    const owner = r.owner_id ? ownerById.get(r.owner_id) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      isActive: r.is_active,
      influencerId: r.influencer_id,
      ownerId: r.owner_id,
      captain: owner
        ? { username: owner.username, firstName: owner.first_name, lastName: owner.last_name, avatarUrl: owner.avatar_url }
        : null,
      memberCount: counts.get(r.id) ?? 0,
    };
  });
}

const LEAGUE_COLUMNS = "id, slug, name, tagline, is_active, influencer_id, owner_id";

/** Active leagues, biggest first. `includeInactive` for the admin. */
export async function listCreatorLeagues(includeInactive = false): Promise<CreatorLeague[]> {
  let query = createAdminClient().from("creator_leagues").select(LEAGUE_COLUMNS).order("created_at");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  const leagues = await hydrateLeagues(data ?? []);
  return leagues.sort((a, b) => b.memberCount - a.memberCount);
}

export const getCreatorLeagueBySlug = cache(async (slug: string): Promise<CreatorLeague | null> => {
  const { data } = await createAdminClient().from("creator_leagues").select(LEAGUE_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  return (await hydrateLeagues([data]))[0];
});

export async function getCreatorLeagueForInfluencer(influencerId: string): Promise<CreatorLeague | null> {
  const { data } = await createAdminClient()
    .from("creator_leagues")
    .select(LEAGUE_COLUMNS)
    .eq("influencer_id", influencerId)
    .maybeSingle();
  if (!data) return null;
  return (await hydrateLeagues([data]))[0];
}

/** The creator league the member is in, if any. */
export const getMemberCreatorLeague = cache(async (userId: string): Promise<CreatorLeague | null> => {
  const admin = createAdminClient();
  const { data: membership } = await admin.from("creator_league_members").select("league_id").eq("user_id", userId).maybeSingle();
  if (!membership) return null;
  const { data } = await admin.from("creator_leagues").select(LEAGUE_COLUMNS).eq("id", membership.league_id).maybeSingle();
  if (!data) return null;
  return (await hydrateLeagues([data]))[0];
});

/**
 * The internal ranking: verified members by monthly growth (a beginner can
 * beat someone bigger), then those who keep their revenue private, then the
 * members still to verify.
 */
export async function getLeagueStandings(leagueId: string): Promise<LeagueStanding[]> {
  const { data } = await createAdminClient().rpc("creator_league_member_stats", { p_league_id: leagueId });
  const rows = (data ?? []).map((r) => {
    const growthPrivate = r.revenue_visibility === "private";
    return {
      userId: r.user_id,
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      avatarUrl: r.avatar_url,
      isDemo: r.is_demo,
      revenueVerified: r.revenue_verified,
      growthPercent: growthPrivate || r.growth_percent == null ? null : Number(r.growth_percent),
      growthPrivate,
      rank: null as number | null,
    };
  });
  const group = (s: LeagueStanding) => (!s.revenueVerified ? 3 : s.growthPrivate ? 2 : s.growthPercent == null ? 1 : 0);
  rows.sort((a, b) => group(a) - group(b) || (b.growthPercent ?? 0) - (a.growthPercent ?? 0) || a.username.localeCompare(b.username));
  let rank = 0;
  for (const r of rows) if (group(r) === 0) r.rank = ++rank;
  return rows;
}

export async function joinCreatorLeague(userId: string, leagueId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: league } = await admin.from("creator_leagues").select("id, is_active").eq("id", leagueId).maybeSingle();
  if (!league?.is_active) throw new Error("Cette ligue n'accepte pas de nouveaux membres.");
  // Switching leagues resets the arrival date: the member only counts for
  // the wars that start after they arrived.
  const { error } = await admin
    .from("creator_league_members")
    .upsert({ user_id: userId, league_id: leagueId, joined_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function leaveCreatorLeague(userId: string): Promise<void> {
  const { error } = await createAdminClient().from("creator_league_members").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// League wars
// ---------------------------------------------------------------------------

type WarRow = {
  id: string;
  league_a: string;
  league_b: string;
  starts_at: string;
  ends_at: string;
  score_a: number | null;
  score_b: number | null;
  winner_league_id: string | null;
  closed_at: string | null;
};

function warStatus(w: WarRow, now = Date.now()): WarStatus {
  if (w.closed_at) return "closed";
  if (now < new Date(w.starts_at).getTime()) return "upcoming";
  if (now < new Date(w.ends_at).getTime()) return "live";
  return "ended";
}

/** The members who were in the league when the war started, with their war numbers. */
async function warSideScore(leagueId: string, war: Pick<WarRow, "starts_at" | "ends_at">): Promise<WarScore> {
  const until = new Date(Math.min(Date.now(), new Date(war.ends_at).getTime())).toISOString();
  const { data, error } = await createAdminClient().rpc("creator_league_member_stats", {
    p_league_id: leagueId,
    p_since: war.starts_at,
    p_until: until,
  });
  if (error) throw new Error(error.message);
  const startsAt = new Date(war.starts_at).getTime();
  const members = (data ?? [])
    .filter((m) => new Date(m.joined_at).getTime() <= startsAt)
    .map((m) => ({
      revenueVerified: m.revenue_verified,
      growthPercent: m.growth_percent == null ? null : Number(m.growth_percent),
      challengesCompleted: Number(m.challenges_completed),
    }));
  return warScore(members);
}

async function hydrateWar(w: WarRow): Promise<LeagueWar> {
  const { data: rows } = await createAdminClient().from("creator_leagues").select(LEAGUE_COLUMNS).in("id", [w.league_a, w.league_b]);
  const leagues = await hydrateLeagues(rows ?? []);
  const side = (id: string) => {
    const l = leagues.find((x) => x.id === id);
    return { id, slug: l?.slug ?? "", name: l?.name ?? "Ligue supprimée", captain: l?.captain ?? null };
  };
  const status = warStatus(w);
  if (status === "closed") {
    return {
      id: w.id,
      startsAt: w.starts_at,
      endsAt: w.ends_at,
      closedAt: w.closed_at,
      status,
      a: { league: side(w.league_a), score: null, total: w.score_a == null ? null : Number(w.score_a) },
      b: { league: side(w.league_b), score: null, total: w.score_b == null ? null : Number(w.score_b) },
      winner: w.winner_league_id === w.league_a ? "a" : w.winner_league_id === w.league_b ? "b" : null,
    };
  }
  const [scoreA, scoreB] =
    status === "upcoming" ? [null, null] : await Promise.all([warSideScore(w.league_a, w), warSideScore(w.league_b, w)]);
  return {
    id: w.id,
    startsAt: w.starts_at,
    endsAt: w.ends_at,
    closedAt: null,
    status,
    a: { league: side(w.league_a), score: scoreA, total: scoreA?.total ?? null },
    b: { league: side(w.league_b), score: scoreB, total: scoreB?.total ?? null },
    winner: scoreA && scoreB ? warWinner(scoreA, scoreB) : null,
  };
}

const WAR_COLUMNS = "id, league_a, league_b, starts_at, ends_at, score_a, score_b, winner_league_id, closed_at";

export const getLeagueWar = cache(async (warId: string): Promise<LeagueWar | null> => {
  const { data } = await createAdminClient().from("league_wars").select(WAR_COLUMNS).eq("id", warId).maybeSingle();
  return data ? hydrateWar(data) : null;
});

/** The league's war in progress or coming up, else its last one. */
export async function getCurrentWarForLeague(leagueId: string): Promise<LeagueWar | null> {
  const { data } = await createAdminClient()
    .from("league_wars")
    .select(WAR_COLUMNS)
    .or(`league_a.eq.${leagueId},league_b.eq.${leagueId}`)
    .order("starts_at", { ascending: false })
    .limit(5);
  const rows = data ?? [];
  const current = rows.find((w) => !w.closed_at) ?? rows[0];
  return current ? hydrateWar(current) : null;
}

/** Every war, newest first, with live scores for the open ones (admin). */
export async function listLeagueWars(): Promise<LeagueWar[]> {
  const { data } = await createAdminClient().from("league_wars").select(WAR_COLUMNS).order("starts_at", { ascending: false }).limit(50);
  return Promise.all((data ?? []).map(hydrateWar));
}

export async function createLeagueWar(leagueA: string, leagueB: string, startsAt: string, endsAt: string): Promise<void> {
  if (leagueA === leagueB) throw new Error("Choisis deux ligues différentes.");
  if (new Date(endsAt) <= new Date(startsAt)) throw new Error("La fin doit être après le début.");
  const admin = createAdminClient();
  const { data: open } = await admin
    .from("league_wars")
    .select("id")
    .is("closed_at", null)
    .or(`league_a.in.(${leagueA},${leagueB}),league_b.in.(${leagueA},${leagueB})`)
    .limit(1);
  if (open?.length) throw new Error("Une de ces ligues a déjà une guerre en cours ou à venir.");
  const { error } = await admin.from("league_wars").insert({ league_a: leagueA, league_b: leagueB, starts_at: startsAt, ends_at: endsAt });
  if (error) throw new Error(error.message);
}

const frNumber = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * Final score, kept on the war. The verified members of the winning league
 * who were there from the start get the "Vainqueur · Guerre de ligues"
 * title; everyone who took part hears the result.
 */
export async function closeLeagueWar(warId: string): Promise<{ winner: string | null; titles: number }> {
  const admin = createAdminClient();
  const { data: war } = await admin.from("league_wars").select(WAR_COLUMNS).eq("id", warId).maybeSingle();
  if (!war) throw new Error("Guerre introuvable.");
  if (war.closed_at) throw new Error("Cette guerre est déjà close.");
  if (Date.now() < new Date(war.ends_at).getTime()) throw new Error("La guerre n'est pas encore terminée.");

  const [scoreA, scoreB] = await Promise.all([warSideScore(war.league_a, war), warSideScore(war.league_b, war)]);
  const side = warWinner(scoreA, scoreB);
  const winnerId = side === "a" ? war.league_a : side === "b" ? war.league_b : null;

  // Claim the war first, so two clicks never grant twice.
  const { data: claimed, error } = await admin
    .from("league_wars")
    .update({ score_a: scoreA.total, score_b: scoreB.total, winner_league_id: winnerId, closed_at: new Date().toISOString() })
    .eq("id", warId)
    .is("closed_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  if (!claimed?.length) throw new Error("Cette guerre est déjà close.");

  const { data: leagues } = await admin.from("creator_leagues").select("id, slug, name").in("id", [war.league_a, war.league_b]);
  const leagueById = new Map((leagues ?? []).map((l) => [l.id, l]));
  const startsAt = new Date(war.starts_at).getTime();
  let titles = 0;

  for (const leagueId of [war.league_a, war.league_b]) {
    const league = leagueById.get(leagueId);
    const { data: members } = await admin.rpc("creator_league_member_stats", { p_league_id: leagueId });
    const fighters = (members ?? []).filter((m) => new Date(m.joined_at).getTime() <= startsAt);
    const opponent = leagueById.get(leagueId === war.league_a ? war.league_b : war.league_a);
    const [own, other] = leagueId === war.league_a ? [scoreA, scoreB] : [scoreB, scoreA];
    const won = winnerId === leagueId;

    for (const m of fighters) {
      if (won && m.revenue_verified && (await grantTitleToMember(m.user_id, WAR_TITLE_ID, { notify: false }))) titles++;
      await createNotificationForUser({
        userId: m.user_id,
        type: "league_war",
        title: won
          ? `${league?.name} remporte la guerre contre ${opponent?.name}`
          : winnerId
            ? `${opponent?.name} remporte la guerre contre ${league?.name}`
            : `Pas de vainqueur entre ${league?.name} et ${opponent?.name}`,
        body: `Score final : ${frNumber(own.total)} à ${frNumber(other.total)}.${
          won && m.revenue_verified ? " Tu reçois le titre « Vainqueur · Guerre de ligues »." : ""
        }`,
        metadata: { war_id: warId, slug: league?.slug },
      });
    }
  }
  return { winner: winnerId ? (leagueById.get(winnerId)?.name ?? null) : null, titles };
}

// ---------------------------------------------------------------------------
// Admin: creating leagues
// ---------------------------------------------------------------------------

export async function createCreatorLeague(input: {
  name: string;
  slug: string;
  tagline: string | null;
  influencerId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: influencer } = await admin.from("influencers").select("id, user_id").eq("id", input.influencerId).maybeSingle();
  if (!influencer) throw new Error("Créateur introuvable.");
  if (!influencer.user_id) throw new Error("Relie d'abord ce créateur à son compte ASCEND : il sera le capitaine de la ligue.");
  const { data: league, error } = await admin
    .from("creator_leagues")
    .insert({ name: input.name, slug: input.slug, tagline: input.tagline, influencer_id: influencer.id, owner_id: influencer.user_id })
    .select("id")
    .single();
  if (error || !league) {
    throw new Error(error?.code === "23505" ? "Ce créateur a déjà une ligue, ou cette adresse est prise." : (error?.message ?? "Création impossible."));
  }
  // The captain plays in their own league.
  await admin.from("creator_league_members").upsert({ user_id: influencer.user_id, league_id: league.id }, { onConflict: "user_id" });
}

export async function setCreatorLeagueActive(leagueId: string, isActive: boolean): Promise<void> {
  const { error } = await createAdminClient().from("creator_leagues").update({ is_active: isActive }).eq("id", leagueId);
  if (error) throw new Error(error.message);
}
