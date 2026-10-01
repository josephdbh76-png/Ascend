import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodKey } from "@/services/revenue.service";
import {
  LEAGUES,
  LEAGUE_REWARD_TIERS,
  SEASON_CHALLENGE_TEMPLATES,
  leagueForRevenue,
  isLeagueId,
  type LeagueId,
} from "@/lib/leagues";

export interface LeaguePlacement {
  league: LeagueId;
  /** Reference month of the season, the base of the growth challenges. */
  baseCents: number;
  basePeriod: string | null;
  /** True while it rests on a month still in progress (or no data yet). */
  provisional: boolean;
}

interface SeasonDates {
  id: string;
  startsAt: string;
  endsAt: string;
}

function addMonths(period: string, months: number): string {
  const d = new Date(`${period}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)).toISOString().slice(0, 10);
}

/**
 * Best verified month over the 3 months before the season; otherwise the
 * first complete month during the season; otherwise the month in progress
 * (provisional). No verified revenue at all: Bronze, provisional.
 */
export async function computePlacement(userId: string, season: SeasonDates): Promise<LeaguePlacement> {
  const admin = createAdminClient();
  const startMonth = periodKey(season.startsAt);
  const { data } = await admin
    .from("revenue_snapshots")
    .select("period, amount_cents")
    .eq("user_id", userId)
    .eq("is_verified", true)
    .gte("period", addMonths(startMonth, -3))
    .lte("period", periodKey(season.endsAt))
    .order("period", { ascending: true });
  const rows = (data ?? []).filter((r) => r.amount_cents > 0);
  const currentMonth = periodKey(new Date());

  const before = rows.filter((r) => r.period < startMonth);
  if (before.length > 0) {
    const best = before.reduce((a, b) => (b.amount_cents > a.amount_cents ? b : a));
    return { league: leagueForRevenue(best.amount_cents), baseCents: best.amount_cents, basePeriod: best.period, provisional: false };
  }
  const firstComplete = rows.find((r) => r.period >= startMonth && r.period < currentMonth);
  if (firstComplete) {
    return {
      league: leagueForRevenue(firstComplete.amount_cents),
      baseCents: firstComplete.amount_cents,
      basePeriod: firstComplete.period,
      provisional: false,
    };
  }
  const inProgress = rows.find((r) => r.period === currentMonth);
  if (inProgress) {
    return { league: leagueForRevenue(inProgress.amount_cents), baseCents: inProgress.amount_cents, basePeriod: inProgress.period, provisional: true };
  }
  return { league: "bronze", baseCents: 0, basePeriod: null, provisional: true };
}

/** Computes the member's league and stores it when it changed. */
export async function placeMemberInSeason(userId: string, season: SeasonDates): Promise<LeaguePlacement> {
  const placement = await computePlacement(userId, season);
  const admin = createAdminClient();
  const { data: current, error } = await admin
    .from("season_participants")
    .select("league, base_revenue_cents, base_period, provisional")
    .eq("season_id", season.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return placement; // table not there yet (migration 063)
  const unchanged =
    current &&
    current.league === placement.league &&
    Number(current.base_revenue_cents) === placement.baseCents &&
    current.base_period === placement.basePeriod &&
    current.provisional === placement.provisional;
  if (!unchanged) {
    await admin.from("season_participants").upsert(
      {
        season_id: season.id,
        user_id: userId,
        league: placement.league,
        base_revenue_cents: placement.baseCents,
        base_period: placement.basePeriod,
        provisional: placement.provisional,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "season_id,user_id" },
    );
  }
  return placement;
}

/** The stored league, placing the member first if they have none yet. */
export async function getSeasonLeague(userId: string, season: SeasonDates): Promise<LeaguePlacement> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("season_participants")
    .select("league, base_revenue_cents, base_period, provisional")
    .eq("season_id", season.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (data && isLeagueId(data.league)) {
    return { league: data.league, baseCents: Number(data.base_revenue_cents), basePeriod: data.base_period, provisional: data.provisional };
  }
  return placeMemberInSeason(userId, season);
}

/** Re-places everyone who scored during the season, right before the final ranking. */
export async function placeSeasonScorers(season: SeasonDates) {
  const admin = createAdminClient();
  const { data: challenges } = await admin.from("challenges").select("id").eq("season_id", season.id);
  const ids = (challenges ?? []).map((c) => c.id);
  if (ids.length === 0) return 0;
  const { data: done } = await admin.from("user_challenges").select("user_id").eq("status", "completed").in("challenge_id", ids);
  const users = [...new Set((done ?? []).map((d) => d.user_id))];
  for (const userId of users) await placeMemberInSeason(userId, season);
  return users.length;
}

export interface LeagueCount {
  league: LeagueId;
  members: number;
}

export async function countSeasonParticipants(seasonId: string): Promise<LeagueCount[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("season_participants").select("league").eq("season_id", seasonId);
  return LEAGUES.map((l) => ({ league: l.id, members: (data ?? []).filter((r) => r.league === l.id).length }));
}

// ---------------------------------------------------------------------------
// Generator: the calibrated challenges and rewards of every league.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Creates (or brings up to date) each league's challenges and rewards for a
 * season. Existing challenges with the same condition are reused, so points
 * already earned stay earned; challenges that fit no league are hidden.
 */
export async function generateLeagueSeason(seasonId: string) {
  const admin = createAdminClient();
  const { data: season } = await admin.from("seasons").select("id, number, starts_at, ends_at, rewards_distributed_at").eq("id", seasonId).single();
  if (!season) throw new Error("Saison introuvable.");
  if (season.rewards_distributed_at) throw new Error("Cette saison est déjà clôturée.");

  const { data: existing } = await admin.from("challenges").select("*").eq("season_id", seasonId);
  const pool = [...(existing ?? [])].filter((c) => c.type !== "coming_soon");
  const used = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const t of SEASON_CHALLENGE_TEMPLATES) {
    const slug = `s${pad(season.number)}-${t.key}`;
    const match =
      pool.find((c) => !used.has(c.id) && c.slug === slug) ??
      pool.find((c) => !used.has(c.id) && c.type === t.type && Number(c.target) === t.target);
    const row = {
      season_id: seasonId,
      title: t.title,
      description: t.description,
      type: t.type as never,
      target: t.target,
      points: t.points,
      leagues: t.leagues,
      is_published: true,
      starts_at: season.starts_at,
      ends_at: season.ends_at,
    };
    if (match) {
      used.add(match.id);
      const { error } = await admin.from("challenges").update(row).eq("id", match.id);
      if (error) throw new Error(error.message);
      updated++;
    } else {
      const { error } = await admin.from("challenges").insert({ ...row, slug });
      if (error) throw new Error(error.message);
      created++;
    }
  }

  const leftovers = pool.filter((c) => !used.has(c.id) && c.is_published !== false);
  if (leftovers.length > 0) {
    await admin
      .from("challenges")
      .update({ is_published: false })
      .in(
        "id",
        leftovers.map((c) => c.id),
      );
  }

  // Titles and trophies of each league, then the season's rewards.
  const seasonNumber = pad(season.number);
  const titles = LEAGUES.flatMap((l) =>
    LEAGUE_REWARD_TIERS.map((tier) => ({
      id: `season-${tier.key}-${seasonNumber}-${l.id}`,
      name: `${tier.titleName} ${l.name} · Saison ${seasonNumber}`,
      description:
        tier.key === "champion"
          ? `Premier de la ligue ${l.name} de la Saison ${seasonNumber}.`
          : tier.key === "podium"
            ? `Sur le podium de la ligue ${l.name} de la Saison ${seasonNumber}.`
            : `Dans le top 10 de la ligue ${l.name} de la Saison ${seasonNumber}.`,
      icon: tier.icon,
      rarity: tier.rarity,
      type: "earned" as const,
      requirement: { type: "season_reward" },
      tradeable: false,
    })),
  );
  const { error: titleError } = await admin.from("titles").upsert(titles, { onConflict: "id" });
  if (titleError) throw new Error(titleError.message);

  const trophies = LEAGUES.flatMap((l) =>
    LEAGUE_REWARD_TIERS.filter((tier) => tier.trophy).map((tier) => ({
      id: `season-${tier.key}-${l.id}`,
      name: `${tier.key === "champion" ? "Champion" : "Podium"} de saison · ${l.name}`,
      description:
        tier.key === "champion" ? `Premier de la ligue ${l.name} d'une saison ASCEND.` : `Sur le podium de la ligue ${l.name} d'une saison ASCEND.`,
      icon: tier.icon,
    })),
  );
  const { error: trophyError } = await admin.from("trophies").upsert(trophies, { onConflict: "id" });
  if (trophyError) throw new Error(trophyError.message);

  // Physical rewards set by hand are kept.
  await admin.from("season_rewards").delete().eq("season_id", seasonId).in("kind", ["title", "trophy"]);
  const rewards = LEAGUES.flatMap((l) =>
    LEAGUE_REWARD_TIERS.flatMap((tier) => {
      const title = titles.find((t) => t.id === `season-${tier.key}-${seasonNumber}-${l.id}`)!;
      const rows: {
        season_id: string;
        league: LeagueId;
        rank_from: number;
        rank_to: number;
        kind: "title" | "trophy";
        title_id: string | null;
        trophy_id: string | null;
        label: string;
      }[] = [
        {
          season_id: seasonId,
          league: l.id,
          rank_from: tier.rankFrom,
          rank_to: tier.rankTo,
          kind: "title",
          title_id: title.id,
          trophy_id: null,
          label: `Titre « ${title.name} »`,
        },
      ];
      if (tier.trophy) {
        const trophy = trophies.find((t) => t.id === `season-${tier.key}-${l.id}`)!;
        rows.push({
          season_id: seasonId,
          league: l.id,
          rank_from: tier.rankFrom,
          rank_to: tier.rankTo,
          kind: "trophy",
          title_id: null,
          trophy_id: trophy.id,
          label: `Trophée « ${trophy.name} »`,
        });
      }
      return rows;
    }),
  );
  const { error: rewardError } = await admin.from("season_rewards").insert(rewards);
  if (rewardError) throw new Error(rewardError.message);

  return { created, updated, hidden: leftovers.length, rewards: rewards.length };
}
