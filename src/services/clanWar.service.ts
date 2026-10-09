import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { grantTitleToMember } from "@/services/progress.service";
import { getClanById, listClans, toPerson, type ClanSummary, type Person } from "@/services/clan.service";
import { membersWithAutoSync, syncMemberSources } from "@/services/revenueSync.service";
import {
  WAR_DAYS,
  WAR_DECLINE_COOLDOWN_DAYS,
  WAR_MIN_VERIFIED,
  WAR_REMATCH_DAYS,
  WAR_RESPONSE_HOURS,
  WAR_TITLES,
  WAR_TROPHIES,
  clanWarScore,
  clanWarWinner,
  formatPoints,
  warStartAfter,
  type ClanWarScore,
} from "@/lib/clans";
import type { ClanWarStatus } from "@/types/database.types";

// League wars. A leader (or co-leader) declares, the other side has 48 h
// to accept; 24 h of preparation, then 7 days. Rosters freeze when the war
// starts, with each fighter's usual pace (their previous month, per week)
// and their month-to-date revenue. The score then follows the revenue
// snapshots the sources keep up to date (the nightly job syncs everyone
// at war), so it can be computed again at any time without state.

const DAY_MS = 864e5;

export type WarPhase = "proposed" | "declined" | "expired" | "canceled" | "preparing" | "starting" | "live" | "ending" | "closed";

export interface WarClan {
  id: string;
  slug: string;
  name: string;
  emblem: string;
  color: string;
  trophies: number;
}

export interface FighterView extends Person {
  points: number | null;
  verified: boolean;
  challenges: number;
  revenueEligible: boolean;
  /** Revenue during the war vs usual pace (1 = usual). Only ever filled in for the viewer. */
  pace: number | null;
  result: "won" | "lost" | "draw" | null;
}

export interface WarSideView {
  clan: WarClan;
  total: number | null;
  /** Live breakdown; null before the start and once closed (the totals are kept). */
  score: ClanWarScore | null;
  /** Started with at least 5 verified fighters. */
  canWin: boolean;
  fighters: FighterView[];
  trophiesDelta: number | null;
}

export interface WarView {
  id: string;
  phase: WarPhase;
  respondBy: string;
  startsAt: string | null;
  endsAt: string | null;
  declaredBy: Person | null;
  a: WarSideView;
  b: WarSideView;
  /** Leading side while live, winner once closed. */
  winner: "a" | "b" | null;
  days: { day: string; a: number; b: number }[];
}

type WarRow = {
  id: string;
  clan_a: string;
  clan_b: string;
  status: ClanWarStatus;
  declared_by: string | null;
  respond_by: string;
  starts_at: string | null;
  ends_at: string | null;
  started_at: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_clan_id: string | null;
  trophies_a: number | null;
  trophies_b: number | null;
  closed_at: string | null;
};

const WAR_COLUMNS =
  "id, clan_a, clan_b, status, declared_by, respond_by, starts_at, ends_at, started_at, score_a, score_b, winner_clan_id, trophies_a, trophies_b, closed_at";

type ProfileLite = { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null };

export function warPhase(w: WarRow, now = Date.now()): WarPhase {
  if (w.status === "proposed") return new Date(w.respond_by).getTime() < now ? "expired" : "proposed";
  if (w.status !== "scheduled") return w.status;
  if (!w.starts_at || now < new Date(w.starts_at).getTime()) return "preparing";
  if (!w.started_at) return "starting";
  return now < new Date(w.ends_at!).getTime() ? "live" : "ending";
}

const toWarClan = (c: ClanSummary | null, id: string): WarClan =>
  c
    ? { id: c.id, slug: c.slug, name: c.name, emblem: c.emblem, color: c.color, trophies: c.trophies }
    : { id, slug: "", name: "Ligue fermée", emblem: "shield", color: "slate", trophies: 0 };

function monthStart(d: Date, offset = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
}
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

type SideComputed = { score: ClanWarScore; canWin: boolean; fighters: FighterView[] };

/** Both sides' scores from the frozen rosters and today's revenue snapshots. */
async function computeSides(w: WarRow): Promise<{ a: SideComputed; b: SideComputed }> {
  const admin = createAdminClient();
  const { data: fighters } = await admin.from("clan_war_fighters").select("*").eq("war_id", w.id);
  const rows = fighters ?? [];
  const ids = rows.map((f) => f.user_id);
  const starts = new Date(w.starts_at!);
  const until = new Date(Math.min(Date.now(), new Date(w.ends_at!).getTime()));
  const firstPeriod = rows.reduce<string | null>((min, f) => (f.start_period && (!min || f.start_period < min) ? f.start_period : min), null);

  const [{ data: profiles }, { data: snapshots }, { data: done }] = await Promise.all([
    ids.length
      ? admin.from("profiles").select("id, username, first_name, last_name, avatar_url, revenue_verified").in("id", ids)
      : Promise.resolve({ data: [] as (ProfileLite & { revenue_verified: boolean })[] }),
    ids.length && firstPeriod
      ? admin.from("revenue_snapshots").select("user_id, period, amount_cents").in("user_id", ids).eq("is_verified", true).gte("period", firstPeriod)
      : Promise.resolve({ data: [] as { user_id: string; period: string; amount_cents: number }[] }),
    ids.length
      ? admin
          .from("user_challenges")
          .select("user_id")
          .in("user_id", ids)
          .eq("status", "completed")
          .gte("completed_at", starts.toISOString())
          .lt("completed_at", until.toISOString())
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const challengesBy = new Map<string, number>();
  for (const c of done ?? []) challengesBy.set(c.user_id, (challengesBy.get(c.user_id) ?? 0) + 1);
  const elapsedDays = Math.min(WAR_DAYS, Math.max(1, Math.floor((until.getTime() - starts.getTime()) / DAY_MS)));

  const side = (clanId: string): SideComputed => {
    const mine = rows.filter((f) => f.clan_id === clanId);
    const inputs = mine.map((f) => {
      const earned = (snapshots ?? [])
        .filter((s) => s.user_id === f.user_id && f.start_period && s.period >= f.start_period)
        .reduce((sum, s) => sum + Number(s.amount_cents), 0);
      const warRevenue = Math.max(0, earned - Number(f.start_mtd_cents));
      const expected = (Number(f.baseline_weekly_cents) * elapsedDays) / WAR_DAYS;
      return {
        revenueEligible: f.revenue_eligible,
        ratio: f.revenue_eligible && expected > 0 ? warRevenue / expected : null,
        challenges: challengesBy.get(f.user_id) ?? 0,
        verified: !!profileById.get(f.user_id)?.revenue_verified,
      };
    });
    const score = clanWarScore(inputs);
    return {
      score,
      canWin: mine.filter((f) => f.verified_at_start).length >= WAR_MIN_VERIFIED,
      fighters: mine
        .map((f, i) => {
          const p = profileById.get(f.user_id);
          return {
            userId: f.user_id,
            username: p?.username ?? "membre",
            firstName: p?.first_name ?? null,
            lastName: p?.last_name ?? null,
            avatarUrl: p?.avatar_url ?? null,
            points: score.perFighter[i],
            verified: inputs[i].verified,
            challenges: inputs[i].challenges,
            revenueEligible: f.revenue_eligible,
            pace: inputs[i].ratio == null ? null : Math.round(inputs[i].ratio! * 100) / 100,
            result: f.result,
          };
        })
        .sort((x, y) => (y.points ?? 0) - (x.points ?? 0)),
    };
  };
  return { a: side(w.clan_a), b: side(w.clan_b) };
}

/** Current members, for a war that hasn't started (no points yet). */
async function rosterPreview(clanId: string): Promise<FighterView[]> {
  const { data } = await createAdminClient()
    .from("clan_members")
    .select("user_id, profiles!clan_members_user_id_fkey(id, username, first_name, last_name, avatar_url, revenue_verified)")
    .eq("clan_id", clanId);
  return (data ?? []).flatMap((m) => {
    const p = m.profiles as unknown as (ProfileLite & { revenue_verified: boolean }) | null;
    return p
      ? [{ ...toPerson(p), points: null, verified: p.revenue_verified, challenges: 0, revenueEligible: false, pace: null, result: null }]
      : [];
  });
}

async function storedFighters(warId: string, clanId: string): Promise<FighterView[]> {
  const { data } = await createAdminClient()
    .from("clan_war_fighters")
    .select("user_id, points, result, verified_at_start, revenue_eligible, profiles(id, username, first_name, last_name, avatar_url)")
    .eq("war_id", warId)
    .eq("clan_id", clanId);
  return (data ?? [])
    .flatMap((f) => {
      const p = f.profiles as unknown as ProfileLite | null;
      return p
        ? [{ ...toPerson(p), points: f.points == null ? null : Number(f.points), verified: f.verified_at_start, challenges: 0, revenueEligible: f.revenue_eligible, pace: null, result: f.result }]
        : [];
    })
    .sort((x, y) => (y.points ?? 0) - (x.points ?? 0));
}

async function buildView(w: WarRow, viewerId?: string | null): Promise<WarView> {
  const admin = createAdminClient();
  const phase = warPhase(w);
  const [clanA, clanB, declarer, { data: days }] = await Promise.all([
    getClanById(w.clan_a),
    getClanById(w.clan_b),
    w.declared_by
      ? admin.from("profiles").select("id, username, first_name, last_name, avatar_url").eq("id", w.declared_by).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("clan_war_days").select("day, score_a, score_b").eq("war_id", w.id).order("day"),
  ]);
  const base = (clan: ClanSummary | null, id: string): WarSideView => ({
    clan: toWarClan(clan, id),
    total: null,
    score: null,
    canWin: (clan?.verifiedCount ?? 0) >= WAR_MIN_VERIFIED,
    fighters: [],
    trophiesDelta: null,
  });
  const a = base(clanA, w.clan_a);
  const b = base(clanB, w.clan_b);
  let winner: "a" | "b" | null = null;

  if (phase === "live" || phase === "ending") {
    const sides = await computeSides(w);
    for (const [view, s] of [[a, sides.a], [b, sides.b]] as const) {
      view.score = s.score;
      view.total = s.score.total;
      view.canWin = s.canWin;
      view.fighters = s.fighters;
    }
    winner = clanWarWinner({ total: a.total!, canWin: a.canWin }, { total: b.total!, canWin: b.canWin });
  } else if (phase === "closed") {
    a.total = w.score_a == null ? null : Number(w.score_a);
    b.total = w.score_b == null ? null : Number(w.score_b);
    a.trophiesDelta = w.trophies_a;
    b.trophiesDelta = w.trophies_b;
    [a.fighters, b.fighters] = await Promise.all([storedFighters(w.id, w.clan_a), storedFighters(w.id, w.clan_b)]);
    winner = w.winner_clan_id === w.clan_a ? "a" : w.winner_clan_id === w.clan_b ? "b" : null;
  } else if (phase === "proposed" || phase === "preparing" || phase === "starting") {
    [a.fighters, b.fighters] = await Promise.all([rosterPreview(w.clan_a), rosterPreview(w.clan_b)]);
  }

  // A member's pace says how their sales compare to their usual: theirs only.
  for (const f of [...a.fighters, ...b.fighters]) if (f.userId !== viewerId) f.pace = null;

  return {
    id: w.id,
    phase,
    respondBy: w.respond_by,
    startsAt: w.starts_at,
    endsAt: w.ends_at,
    declaredBy: declarer.data ? toPerson(declarer.data) : null,
    a,
    b,
    winner,
    days: (days ?? []).map((d) => ({ day: d.day, a: Number(d.score_a), b: Number(d.score_b) })),
  };
}

export const getWarView = cache(async (warId: string, viewerId?: string | null): Promise<WarView | null> => {
  const { data } = await createAdminClient().from("clan_wars").select(WAR_COLUMNS).eq("id", warId).maybeSingle();
  return data ? buildView(data, viewerId) : null;
});

export interface ClanWarState {
  /** Accepted, in preparation, live or waiting for its result. */
  current: WarView | null;
  /** Declarations this league received and can answer. */
  incoming: WarView[];
  /** The declaration this league sent, waiting for an answer. */
  outgoing: WarView | null;
  /** The last finished war, to show its result for a few days. */
  lastResult: WarView | null;
}

export async function getClanWarState(clanId: string, viewerId?: string | null): Promise<ClanWarState> {
  const { data } = await createAdminClient()
    .from("clan_wars")
    .select(WAR_COLUMNS)
    .or(`clan_a.eq.${clanId},clan_b.eq.${clanId}`)
    .in("status", ["proposed", "scheduled", "closed"])
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = data ?? [];
  const now = Date.now();
  const current = rows.find((w) => w.status === "scheduled");
  const proposals = rows.filter((w) => warPhase(w, now) === "proposed");
  const closed = rows.find((w) => w.status === "closed" && w.closed_at && now - new Date(w.closed_at).getTime() < 3 * DAY_MS);
  const [currentView, incoming, outgoing, lastResult] = await Promise.all([
    current ? buildView(current, viewerId) : Promise.resolve(null),
    Promise.all(proposals.filter((w) => w.clan_b === clanId).map((w) => buildView(w, viewerId))),
    proposals.find((w) => w.clan_a === clanId) ? buildView(proposals.find((w) => w.clan_a === clanId)!, viewerId) : Promise.resolve(null),
    !current && closed ? buildView(closed, viewerId) : Promise.resolve(null),
  ]);
  return { current: currentView, incoming, outgoing, lastResult };
}

export interface WarHistoryRow {
  id: string;
  opponent: WarClan;
  own: number | null;
  other: number | null;
  result: "won" | "lost" | "draw";
  trophies: number | null;
  closedAt: string;
}

export async function listClanWarHistory(clanId: string, limit = 10): Promise<WarHistoryRow[]> {
  const { data } = await createAdminClient()
    .from("clan_wars")
    .select(WAR_COLUMNS)
    .or(`clan_a.eq.${clanId},clan_b.eq.${clanId}`)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(limit);
  return Promise.all(
    (data ?? []).map(async (w) => {
      const mineA = w.clan_a === clanId;
      const opponentId = mineA ? w.clan_b : w.clan_a;
      return {
        id: w.id,
        opponent: toWarClan(await getClanById(opponentId), opponentId),
        own: mineA ? w.score_a : w.score_b,
        other: mineA ? w.score_b : w.score_a,
        result: !w.winner_clan_id ? "draw" : w.winner_clan_id === clanId ? "won" : "lost",
        trophies: mineA ? w.trophies_a : w.trophies_b,
        closedAt: w.closed_at!,
      } as WarHistoryRow;
    }),
  );
}

/** Every war, newest first (admin). */
export async function listAllWars(limit = 50): Promise<WarView[]> {
  const { data } = await createAdminClient().from("clan_wars").select(WAR_COLUMNS).order("created_at", { ascending: false }).limit(limit);
  return Promise.all((data ?? []).map((w) => buildView(w)));
}

// ---------------------------------------------------------------------------
// Declaring and answering
// ---------------------------------------------------------------------------

async function officerClan(userId: string): Promise<{ clanId: string; role: string } | null> {
  const { data } = await createAdminClient().from("clan_members").select("clan_id, role").eq("user_id", userId).maybeSingle();
  return data && (data.role === "leader" || data.role === "coleader") ? { clanId: data.clan_id, role: data.role } : null;
}

async function notifyOfficers(clanId: string, title: string, body: string) {
  const { data } = await createAdminClient().from("clan_members").select("user_id").eq("clan_id", clanId).in("role", ["leader", "coleader"]);
  for (const r of data ?? []) await createNotificationForUser({ userId: r.user_id, type: "league_war", title, body, metadata: { clan_id: clanId } });
}

async function openWarFor(clanId: string): Promise<WarRow | null> {
  const { data } = await createAdminClient()
    .from("clan_wars")
    .select(WAR_COLUMNS)
    .or(`clan_a.eq.${clanId},clan_b.eq.${clanId}`)
    .in("status", ["proposed", "scheduled"]);
  return (data ?? []).find((w) => w.status === "scheduled" || warPhase(w) === "proposed") ?? null;
}

/** Why `ownId` can't declare war on `targetId` right now, or null. */
async function blockingReason(own: ClanSummary, target: ClanSummary): Promise<string | null> {
  if (!target.isActive) return "Ligue fermée";
  if (target.verifiedCount < WAR_MIN_VERIFIED) return `Moins de ${WAR_MIN_VERIFIED} membres vérifiés`;
  if (await openWarFor(target.id)) return "Déjà en guerre";
  const { data: past } = await createAdminClient()
    .from("clan_wars")
    .select("status, closed_at, declined_at")
    .or(`and(clan_a.eq.${own.id},clan_b.eq.${target.id}),and(clan_a.eq.${target.id},clan_b.eq.${own.id})`)
    .in("status", ["closed", "declined"])
    .order("created_at", { ascending: false })
    .limit(1);
  const last = past?.[0];
  if (last?.status === "closed" && last.closed_at) {
    const again = new Date(last.closed_at).getTime() + WAR_REMATCH_DAYS * DAY_MS;
    if (again > Date.now()) return `Revanche possible le ${new Date(again).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  }
  if (last?.status === "declined" && last.declined_at && new Date(last.declined_at).getTime() + WAR_DECLINE_COOLDOWN_DAYS * DAY_MS > Date.now()) {
    return "A refusé récemment";
  }
  return null;
}

export interface Opponent extends ClanSummary {
  blockedBy: string | null;
}

/** Every other active league, with why it can't be challenged right now (if so). */
export async function listWarOpponents(clanId: string): Promise<Opponent[]> {
  const own = await getClanById(clanId);
  if (!own) return [];
  const clans = (await listClans()).filter((c) => c.id !== clanId);
  const withReasons = await Promise.all(clans.map(async (c) => ({ ...c, blockedBy: await blockingReason(own, c) })));
  return withReasons.sort((x, y) => Number(!!x.blockedBy) - Number(!!y.blockedBy) || Math.abs(x.trophies - own.trophies) - Math.abs(y.trophies - own.trophies));
}

export async function declareWar(actorId: string, targetClanId: string): Promise<void> {
  const officer = await officerClan(actorId);
  if (!officer) throw new Error("Seuls le chef et les adjoints peuvent déclarer une guerre.");
  if (officer.clanId === targetClanId) throw new Error("Choisis une autre ligue.");
  const [own, target] = await Promise.all([getClanById(officer.clanId), getClanById(targetClanId)]);
  if (!own || !target) throw new Error("Ligue introuvable.");
  if (own.verifiedCount < WAR_MIN_VERIFIED) throw new Error(`Il faut ${WAR_MIN_VERIFIED} membres vérifiés dans ta ligue pour déclarer une guerre.`);
  if (await openWarFor(own.id)) throw new Error("Ta ligue a déjà une guerre en cours ou une déclaration en attente.");
  const reason = await blockingReason(own, target);
  if (reason) throw new Error(`Impossible de défier ${target.name} : ${reason.toLowerCase()}.`);

  const { error } = await createAdminClient().from("clan_wars").insert({
    clan_a: own.id,
    clan_b: target.id,
    status: "proposed",
    declared_by: actorId,
    respond_by: new Date(Date.now() + WAR_RESPONSE_HOURS * 3600e3).toISOString(),
  });
  if (error) throw new Error(error.message);
  await notifyOfficers(target.id, `${own.name} vous déclare la guerre !`, `Tu as ${WAR_RESPONSE_HOURS} h pour accepter ou refuser, depuis l'onglet Guerre de ta ligue.`);
}

export async function respondToWar(actorId: string, warId: string, accept: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data: w } = await admin.from("clan_wars").select(WAR_COLUMNS).eq("id", warId).maybeSingle();
  if (!w || warPhase(w) !== "proposed") throw new Error("Cette déclaration n'est plus valable.");
  const officer = await officerClan(actorId);
  if (officer?.clanId !== w.clan_b) throw new Error("Seuls le chef et les adjoints de la ligue défiée peuvent répondre.");
  const [own, other] = await Promise.all([getClanById(w.clan_b), getClanById(w.clan_a)]);

  if (!accept) {
    await admin.from("clan_wars").update({ status: "declined", declined_at: new Date().toISOString() }).eq("id", warId).eq("status", "proposed");
    await notifyOfficers(w.clan_a, `${own?.name} refuse la guerre`, "Défie une autre ligue depuis l'onglet Guerre.");
    return;
  }
  if ((own?.verifiedCount ?? 0) < WAR_MIN_VERIFIED) throw new Error(`Il faut ${WAR_MIN_VERIFIED} membres vérifiés dans ta ligue pour accepter.`);
  const busy = await admin
    .from("clan_wars")
    .select("id")
    .eq("status", "scheduled")
    .or(`clan_a.in.(${w.clan_a},${w.clan_b}),clan_b.in.(${w.clan_a},${w.clan_b})`)
    .limit(1);
  if (busy.data?.length) throw new Error("Une des deux ligues est déjà en guerre.");

  const startsAt = warStartAfter(new Date());
  const endsAt = new Date(startsAt.getTime() + WAR_DAYS * DAY_MS);
  const { data: claimed } = await admin
    .from("clan_wars")
    .update({ status: "scheduled", accepted_at: new Date().toISOString(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
    .eq("id", warId)
    .eq("status", "proposed")
    .select("id");
  if (!claimed?.length) throw new Error("Cette déclaration n'est plus valable.");
  // Other declarations involving either league no longer make sense.
  await admin
    .from("clan_wars")
    .update({ status: "canceled" })
    .eq("status", "proposed")
    .neq("id", warId)
    .or(`clan_a.in.(${w.clan_a},${w.clan_b}),clan_b.in.(${w.clan_a},${w.clan_b})`);
  const when = startsAt.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  await notifyOfficers(w.clan_a, `${own?.name} accepte la guerre !`, `La bataille commence ${when}. Fais venir ta ligue d'ici là : seuls les membres présents au départ comptent.`);
  await notifyOfficers(w.clan_b, `Guerre contre ${other?.name} confirmée`, `La bataille commence ${when}.`);
}

export async function cancelDeclaration(actorId: string, warId: string): Promise<void> {
  const officer = await officerClan(actorId);
  const admin = createAdminClient();
  const { data: w } = await admin.from("clan_wars").select("clan_a, status").eq("id", warId).maybeSingle();
  if (!w || w.status !== "proposed" || officer?.clanId !== w.clan_a) throw new Error("Tu ne peux pas annuler cette déclaration.");
  await admin.from("clan_wars").update({ status: "canceled" }).eq("id", warId).eq("status", "proposed");
}

// ---------------------------------------------------------------------------
// Start, daily score, end
// ---------------------------------------------------------------------------

/** Freezes both rosters with each fighter's starting point. */
export async function startWar(warId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: claimed } = await admin
    .from("clan_wars")
    .update({ started_at: new Date().toISOString() })
    .eq("id", warId)
    .eq("status", "scheduled")
    .is("started_at", null)
    .lte("starts_at", new Date().toISOString())
    .select(WAR_COLUMNS);
  const w = claimed?.[0];
  if (!w) return false;

  const starts = new Date(w.starts_at!);
  const startPeriod = isoDay(monthStart(starts));
  const prev = monthStart(starts, -1);
  const prevPeriod = isoDay(prev);
  const daysInPrev = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)).getUTCDate();

  const { data: members } = await admin.from("clan_members").select("user_id, clan_id").in("clan_id", [w.clan_a, w.clan_b]);
  const ids = (members ?? []).map((m) => m.user_id);
  const [{ data: profiles }, { data: snapshots }, autoSync] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, revenue_verified").in("id", ids) : Promise.resolve({ data: [] as { id: string; revenue_verified: boolean }[] }),
    ids.length
      ? admin.from("revenue_snapshots").select("user_id, period, amount_cents").in("user_id", ids).eq("is_verified", true).in("period", [prevPeriod, startPeriod])
      : Promise.resolve({ data: [] as { user_id: string; period: string; amount_cents: number }[] }),
    membersWithAutoSync(ids),
  ]);
  const verified = new Set((profiles ?? []).filter((p) => p.revenue_verified).map((p) => p.id));
  const amount = (userId: string, period: string) =>
    Number((snapshots ?? []).find((s) => s.user_id === userId && s.period === period)?.amount_cents ?? 0);

  const rows = (members ?? []).map((m) => {
    const baseline = Math.round((amount(m.user_id, prevPeriod) * 7) / daysInPrev);
    return {
      war_id: w.id,
      user_id: m.user_id,
      clan_id: m.clan_id,
      verified_at_start: verified.has(m.user_id),
      revenue_eligible: autoSync.has(m.user_id) && baseline > 0,
      baseline_weekly_cents: baseline,
      start_period: startPeriod,
      start_mtd_cents: amount(m.user_id, startPeriod),
    };
  });
  if (rows.length) await admin.from("clan_war_fighters").upsert(rows, { onConflict: "war_id,user_id" });

  const [a, b] = await Promise.all([getClanById(w.clan_a), getClanById(w.clan_b)]);
  const endText = new Date(w.ends_at!).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  for (const m of members ?? []) {
    const opponent = m.clan_id === w.clan_a ? b : a;
    await createNotificationForUser({
      userId: m.user_id,
      type: "league_war",
      title: `La guerre contre ${opponent?.name ?? "l'autre ligue"} commence !`,
      body: `Jusqu'à ${endText} : chaque vente vérifiée et chaque défi réussi comptent pour ta ligue.`,
      metadata: { war_id: w.id },
    });
  }
  return true;
}

async function recordDay(w: WarRow, a: number, b: number): Promise<void> {
  const day = isoDay(new Date(Math.min(Date.now(), new Date(w.ends_at!).getTime() - 1)));
  await createAdminClient().from("clan_war_days").upsert({ war_id: w.id, day, score_a: a, score_b: b }, { onConflict: "war_id,day" });
}

async function bumpClan(clanId: string, delta: number, result: "won" | "lost" | "draw"): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("clans").select("trophies, wars_won, wars_lost, wars_drawn").eq("id", clanId).maybeSingle();
  if (!data) return 0;
  const trophies = Math.max(0, data.trophies + delta);
  await admin
    .from("clans")
    .update({
      trophies,
      wars_won: data.wars_won + (result === "won" ? 1 : 0),
      wars_lost: data.wars_lost + (result === "lost" ? 1 : 0),
      wars_drawn: data.wars_drawn + (result === "draw" ? 1 : 0),
    })
    .eq("id", clanId);
  return trophies - data.trophies;
}

/** Final score, trophies, each fighter's points and result, titles, and the news for everyone. */
export async function closeWar(warId: string): Promise<{ winner: string | null; titles: number } | null> {
  const admin = createAdminClient();
  const { data: w } = await admin.from("clan_wars").select(WAR_COLUMNS).eq("id", warId).maybeSingle();
  if (!w || warPhase(w) !== "ending") return null;
  const sides = await computeSides(w);
  const side = clanWarWinner({ total: sides.a.score.total, canWin: sides.a.canWin }, { total: sides.b.score.total, canWin: sides.b.canWin });
  const resultA = side === "a" ? "won" : side === "b" ? "lost" : "draw";
  const resultB = side === "b" ? "won" : side === "a" ? "lost" : "draw";

  const { data: claimed } = await admin
    .from("clan_wars")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      score_a: sides.a.score.total,
      score_b: sides.b.score.total,
      winner_clan_id: side === "a" ? w.clan_a : side === "b" ? w.clan_b : null,
    })
    .eq("id", warId)
    .eq("status", "scheduled")
    .is("closed_at", null)
    .select("id");
  if (!claimed?.length) return null;

  const deltaA = await bumpClan(w.clan_a, WAR_TROPHIES[resultA === "won" ? "win" : resultA === "lost" ? "loss" : "draw"], resultA);
  const deltaB = await bumpClan(w.clan_b, WAR_TROPHIES[resultB === "won" ? "win" : resultB === "lost" ? "loss" : "draw"], resultB);
  await admin.from("clan_wars").update({ trophies_a: deltaA, trophies_b: deltaB }).eq("id", warId);
  await recordDay(w, sides.a.score.total, sides.b.score.total);

  const [clanA, clanB] = await Promise.all([getClanById(w.clan_a), getClanById(w.clan_b)]);
  let titles = 0;
  for (const [mine, result, own, other, delta] of [
    [sides.a, resultA, clanA, clanB, deltaA],
    [sides.b, resultB, clanB, clanA, deltaB],
  ] as const) {
    for (const f of mine.fighters) {
      await admin.from("clan_war_fighters").update({ points: f.points, result }).eq("war_id", warId).eq("user_id", f.userId);
      let earned: string | null = null;
      if (result === "won" && f.verified) {
        const { count } = await admin.from("clan_war_fighters").select("war_id", { count: "exact", head: true }).eq("user_id", f.userId).eq("result", "won");
        for (const t of WAR_TITLES) {
          if ((count ?? 0) >= t.wins && (await grantTitleToMember(f.userId, t.id, { notify: false }))) {
            titles++;
            earned = t.name;
          }
        }
      }
      const score = `${formatPoints(own === clanA ? sides.a.score.total : sides.b.score.total)} à ${formatPoints(own === clanA ? sides.b.score.total : sides.a.score.total)}`;
      await createNotificationForUser({
        userId: f.userId,
        type: "league_war",
        title:
          result === "won"
            ? `Victoire ! ${own?.name} bat ${other?.name}`
            : result === "lost"
              ? `${other?.name} remporte la guerre`
              : `Égalité entre ${own?.name} et ${other?.name}`,
        body: `Score final : ${score}. Tu as rapporté ${formatPoints(f.points)} pts. Trophées de la ligue : ${delta >= 0 ? "+" : ""}${delta}.${
          earned ? ` Tu reçois le titre « ${earned} ».` : ""
        }`,
        metadata: { war_id: warId },
      });
    }
  }
  const winnerClan = side === "a" ? clanA : side === "b" ? clanB : null;
  return { winner: winnerClan?.name ?? null, titles };
}

async function syncAll(userIds: string[], deadline: number): Promise<void> {
  const queue = [...new Set(userIds)];
  const worker = async () => {
    while (queue.length && Date.now() < deadline) {
      const id = queue.shift()!;
      // Fresh numbers at the war's boundaries: anything older than 30 min is synced again.
      await syncMemberSources(id, 30 * 60 * 1000).catch((err) => console.error("War sync failed:", err));
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

/**
 * The nightly job: expires unanswered declarations, starts due wars,
 * syncs everyone at war and records the day's score, closes finished wars.
 */
export async function runWarJobs(budgetMs = 40_000): Promise<{ expired: number; started: number; recorded: number; closed: number }> {
  const deadline = Date.now() + budgetMs;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expired } = await admin.from("clan_wars").update({ status: "expired" }).eq("status", "proposed").lt("respond_by", nowIso).select("id");

  const { data: scheduled } = await admin.from("clan_wars").select(WAR_COLUMNS).eq("status", "scheduled");
  const due = (scheduled ?? []).filter((w) => warPhase(w) === "starting");
  const running = (scheduled ?? []).filter((w) => warPhase(w) === "live" || warPhase(w) === "ending");

  const { data: dueMembers } = due.length
    ? await admin.from("clan_members").select("user_id").in("clan_id", due.flatMap((w) => [w.clan_a, w.clan_b]))
    : { data: [] as { user_id: string }[] };
  const { data: fighters } = running.length
    ? await admin.from("clan_war_fighters").select("user_id").in("war_id", running.map((w) => w.id))
    : { data: [] as { user_id: string }[] };
  await syncAll([...(dueMembers ?? []), ...(fighters ?? [])].map((m) => m.user_id), deadline);

  let started = 0;
  for (const w of due) if (await startWar(w.id)) started++;

  let recorded = 0;
  let closed = 0;
  for (const w of running) {
    if (warPhase(w) === "ending") {
      if (await closeWar(w.id)) closed++;
    } else {
      const sides = await computeSides(w);
      await recordDay(w, sides.a.score.total, sides.b.score.total);
      recorded++;
    }
  }
  return { expired: expired?.length ?? 0, started, recorded, closed };
}
