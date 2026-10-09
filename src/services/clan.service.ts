import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import {
  CLAN_MAX_MEMBERS,
  CLAN_SLUG_PATTERN,
  MAX_COLEADERS,
  PARTNER_CLAN_MAX_MEMBERS,
  RESERVED_CLAN_WORDS,
  clanSlug,
  isClanColor,
  isClanEmblem,
} from "@/lib/clans";
import type { ClanAccess, ClanRole } from "@/types/database.types";

// Leagues ("clans" here, « ligues » on screen). Every write goes through
// the admin client after the checks below: members never write these
// tables themselves.

export interface Person {
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ClanSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  emblem: string;
  color: string;
  access: ClanAccess;
  maxMembers: number;
  trophies: number;
  warsWon: number;
  warsLost: number;
  warsDrawn: number;
  isActive: boolean;
  isPartner: boolean;
  influencerId: string | null;
  leader: Person | null;
  memberCount: number;
  verifiedCount: number;
}

export interface ClanMemberRow extends Person {
  role: ClanRole;
  joinedAt: string;
  isDemo: boolean;
  revenueVerified: boolean;
  /** null when the member keeps their revenue private, or has a single verified month. */
  growthPercent: number | null;
  growthPrivate: boolean;
}

type ClanRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  emblem: string;
  color: string;
  access: ClanAccess;
  max_members: number;
  trophies: number;
  wars_won: number;
  wars_lost: number;
  wars_drawn: number;
  is_active: boolean;
  influencer_id: string | null;
};

const CLAN_COLUMNS = "id, slug, name, tagline, emblem, color, access, max_members, trophies, wars_won, wars_lost, wars_drawn, is_active, influencer_id";

type ProfileLite = { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null };

export function toPerson(p: ProfileLite): Person {
  return { userId: p.id, username: p.username, firstName: p.first_name, lastName: p.last_name, avatarUrl: p.avatar_url };
}

async function hydrate(rows: ClanRow[]): Promise<ClanSummary[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("clan_members")
    .select("clan_id, role, user_id, profiles!clan_members_user_id_fkey(id, username, first_name, last_name, avatar_url, revenue_verified)")
    .in("clan_id", rows.map((r) => r.id));
  const byClan = new Map<string, { leader: Person | null; count: number; verified: number }>();
  for (const m of members ?? []) {
    const entry = byClan.get(m.clan_id) ?? { leader: null, count: 0, verified: 0 };
    const profile = m.profiles as unknown as (ProfileLite & { revenue_verified: boolean }) | null;
    entry.count++;
    if (profile?.revenue_verified) entry.verified++;
    if (m.role === "leader" && profile) entry.leader = toPerson(profile);
    byClan.set(m.clan_id, entry);
  }
  return rows.map((r) => {
    const stats = byClan.get(r.id);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      emblem: r.emblem,
      color: r.color,
      access: r.access,
      maxMembers: r.max_members,
      trophies: r.trophies,
      warsWon: r.wars_won,
      warsLost: r.wars_lost,
      warsDrawn: r.wars_drawn,
      isActive: r.is_active,
      isPartner: !!r.influencer_id,
      influencerId: r.influencer_id,
      leader: stats?.leader ?? null,
      memberCount: stats?.count ?? 0,
      verifiedCount: stats?.verified ?? 0,
    };
  });
}

/** Active leagues by trophies (the leagues ranking), or every league for the admin. */
export async function listClans(opts: { includeInactive?: boolean; limit?: number } = {}): Promise<ClanSummary[]> {
  let query = createAdminClient().from("clans").select(CLAN_COLUMNS).order("trophies", { ascending: false }).order("created_at");
  if (!opts.includeInactive) query = query.eq("is_active", true);
  if (opts.limit) query = query.limit(opts.limit);
  const { data } = await query;
  const clans = await hydrate(data ?? []);
  return clans.sort((a, b) => b.trophies - a.trophies || b.memberCount - a.memberCount);
}

export const getClanBySlug = cache(async (slug: string): Promise<ClanSummary | null> => {
  const { data } = await createAdminClient().from("clans").select(CLAN_COLUMNS).eq("slug", slug).maybeSingle();
  return data ? (await hydrate([data]))[0] : null;
});

export const getClanById = cache(async (id: string): Promise<ClanSummary | null> => {
  const { data } = await createAdminClient().from("clans").select(CLAN_COLUMNS).eq("id", id).maybeSingle();
  return data ? (await hydrate([data]))[0] : null;
});

export async function getClanForInfluencer(influencerId: string): Promise<ClanSummary | null> {
  const { data } = await createAdminClient().from("clans").select(CLAN_COLUMNS).eq("influencer_id", influencerId).maybeSingle();
  return data ? (await hydrate([data]))[0] : null;
}

/** Position in the leagues ranking (by trophies). */
export async function clanRank(clan: Pick<ClanSummary, "trophies">): Promise<number> {
  const { count } = await createAdminClient()
    .from("clans")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .gt("trophies", clan.trophies);
  return (count ?? 0) + 1;
}

export interface Membership {
  clan: ClanSummary;
  role: ClanRole;
  joinedAt: string;
}

export const getMembership = cache(async (userId: string): Promise<Membership | null> => {
  const admin = createAdminClient();
  const { data: m } = await admin.from("clan_members").select("clan_id, role, joined_at").eq("user_id", userId).maybeSingle();
  if (!m) return null;
  const clan = await getClanById(m.clan_id);
  return clan ? { clan, role: m.role, joinedAt: m.joined_at } : null;
});

const ROLE_ORDER: Record<ClanRole, number> = { leader: 0, coleader: 1, member: 2 };

/** Members with their verified growth (hidden when their revenue is private), chief first. */
export async function getClanMembers(clanId: string): Promise<ClanMemberRow[]> {
  const { data } = await createAdminClient().rpc("clan_member_stats", { p_clan_id: clanId });
  return (data ?? [])
    .map((r) => {
      const growthPrivate = r.revenue_visibility === "private";
      return {
        userId: r.user_id,
        username: r.username,
        firstName: r.first_name,
        lastName: r.last_name,
        avatarUrl: r.avatar_url,
        isDemo: r.is_demo,
        role: r.role,
        joinedAt: r.joined_at,
        revenueVerified: r.revenue_verified,
        growthPercent: growthPrivate || r.growth_percent == null ? null : Number(r.growth_percent),
        growthPrivate,
      };
    })
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.joinedAt.localeCompare(b.joinedAt));
}

/** The internal ranking: verified members by monthly growth, so a beginner can beat someone bigger. */
export function rankByGrowth(members: ClanMemberRow[]): (ClanMemberRow & { rank: number | null })[] {
  const group = (m: ClanMemberRow) => (!m.revenueVerified ? 3 : m.growthPrivate ? 2 : m.growthPercent == null ? 1 : 0);
  const sorted = [...members].sort(
    (a, b) => group(a) - group(b) || (b.growthPercent ?? 0) - (a.growthPercent ?? 0) || a.username.localeCompare(b.username),
  );
  let rank = 0;
  return sorted.map((m) => ({ ...m, rank: group(m) === 0 ? ++rank : null }));
}

async function notifyLeaders(clanId: string, title: string, body: string, metadata: Record<string, unknown>, except?: string) {
  const { data } = await createAdminClient().from("clan_members").select("user_id").eq("clan_id", clanId).in("role", ["leader", "coleader"]);
  for (const r of data ?? []) {
    if (r.user_id === except) continue;
    await createNotificationForUser({ userId: r.user_id, type: "league_activity", title, body, metadata });
  }
}

async function displayName(userId: string): Promise<string> {
  const { data } = await createAdminClient().from("profiles").select("first_name, username").eq("id", userId).maybeSingle();
  const first = data?.first_name?.trim();
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : `@${data?.username ?? "membre"}`;
}

// ---------------------------------------------------------------------------
// Creating and running a league
// ---------------------------------------------------------------------------

export interface ClanSettingsInput {
  name: string;
  tagline: string;
  emblem: string;
  color: string;
  access: ClanAccess;
}

function validateSettings(input: ClanSettingsInput): { name: string; tagline: string | null } {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 30) throw new Error("Le nom fait entre 2 et 30 caractères.");
  if (RESERVED_CLAN_WORDS.test(name)) throw new Error("Ce nom ressemble à un compte officiel ASCEND : choisis-en un autre.");
  if (!isClanEmblem(input.emblem) || !isClanColor(input.color)) throw new Error("Emblème invalide.");
  if (!["open", "request", "invite"].includes(input.access)) throw new Error("Mode d'accès invalide.");
  const tagline = input.tagline.trim().slice(0, 140) || null;
  return { name, tagline };
}

async function freeSlug(name: string): Promise<string> {
  const base = clanSlug(name) || "ligue";
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!CLAN_SLUG_PATTERN.test(slug)) continue;
    const { data } = await admin.from("clans").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Any member with verified revenue who isn't in a league yet. Returns the new league's slug. */
export async function createClan(
  userId: string,
  input: ClanSettingsInput,
  opts: { skipVerification?: boolean; influencerId?: string } = {},
): Promise<string> {
  const admin = createAdminClient();
  const { name, tagline } = validateSettings(input);
  const [{ data: profile }, { data: current }] = await Promise.all([
    admin.from("profiles").select("revenue_verified").eq("id", userId).maybeSingle(),
    admin.from("clan_members").select("clan_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!opts.skipVerification && !profile?.revenue_verified) {
    throw new Error("Fais d'abord vérifier tes revenus : seuls les membres vérifiés peuvent ouvrir une ligue.");
  }
  if (current) throw new Error("Quitte d'abord ta ligue actuelle pour en créer une.");

  const slug = await freeSlug(name);
  const { data: clan, error } = await admin
    .from("clans")
    .insert({
      slug,
      name,
      tagline,
      emblem: input.emblem,
      color: input.color,
      access: input.access,
      owner_id: userId,
      influencer_id: opts.influencerId ?? null,
      max_members: opts.influencerId ? PARTNER_CLAN_MAX_MEMBERS : CLAN_MAX_MEMBERS,
    })
    .select("id, slug")
    .single();
  if (error || !clan) throw new Error(error?.message ?? "Impossible de créer la ligue.");
  const { error: memberError } = await admin.from("clan_members").insert({ user_id: userId, clan_id: clan.id, role: "leader" });
  if (memberError) {
    await admin.from("clans").delete().eq("id", clan.id);
    throw new Error(memberError.code === "23505" ? "Tu fais déjà partie d'une ligue." : memberError.message);
  }
  return clan.slug;
}

async function roleIn(userId: string, clanId: string): Promise<ClanRole | null> {
  const { data } = await createAdminClient().from("clan_members").select("role").eq("user_id", userId).eq("clan_id", clanId).maybeSingle();
  return data?.role ?? null;
}

export async function updateClanSettings(actorId: string, clanId: string, input: ClanSettingsInput): Promise<void> {
  if ((await roleIn(actorId, clanId)) !== "leader") throw new Error("Seul le chef peut modifier la ligue.");
  const { name, tagline } = validateSettings(input);
  const { error } = await createAdminClient()
    .from("clans")
    .update({ name, tagline, emblem: input.emblem, color: input.color, access: input.access })
    .eq("id", clanId);
  if (error) throw new Error(error.message);
}

export type JoinOutcome = "joined" | "requested";

/**
 * Joins a league, leaving the current one. `inviterId`: the member whose
 * invite link brought them. The chief's and co-leaders' links open any
 * league; a member's link opens an open league, else sends a request.
 */
export async function joinClan(userId: string, clanId: string, opts: { inviterId?: string | null; force?: boolean } = {}): Promise<JoinOutcome> {
  const admin = createAdminClient();
  const clan = await getClanById(clanId);
  if (!clan?.isActive) throw new Error("Cette ligue est fermée.");
  const { data: current } = await admin.from("clan_members").select("clan_id, role").eq("user_id", userId).maybeSingle();
  if (current?.clan_id === clanId) return "joined";
  if (clan.memberCount >= clan.maxMembers) throw new Error("Cette ligue est complète.");

  const inviterRole = opts.inviterId ? await roleIn(opts.inviterId, clanId) : null;
  const vouched = opts.force || inviterRole === "leader" || inviterRole === "coleader";
  if (!vouched && clan.access !== "open") {
    if (clan.access === "invite" && !inviterRole) throw new Error("Cette ligue est sur invitation : demande le lien au chef ou à un adjoint.");
    await admin.from("clan_join_requests").upsert({ clan_id: clanId, user_id: userId }, { onConflict: "clan_id,user_id" });
    await notifyLeaders(clanId, "Nouvelle demande pour rejoindre ta ligue", `${await displayName(userId)} veut rejoindre ${clan.name}.`, { slug: clan.slug });
    return "requested";
  }

  if (current) await leaveClan(userId);
  const { error } = await admin.from("clan_members").insert({
    user_id: userId,
    clan_id: clanId,
    role: "member",
    invited_by: inviterRole ? opts.inviterId! : null,
  });
  if (error) throw new Error(error.code === "23505" ? "Tu fais déjà partie d'une ligue." : error.message);
  await admin.from("clan_join_requests").delete().eq("user_id", userId);
  await notifyLeaders(clanId, "Un nouveau membre dans ta ligue", `${await displayName(userId)} vient de rejoindre ${clan.name}.`, { slug: clan.slug }, userId);
  return "joined";
}

/**
 * Leaves the league. A chief hands over to the oldest co-leader, else the
 * oldest member; the last one out closes the league.
 */
export async function leaveClan(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: m } = await admin.from("clan_members").select("clan_id, role").eq("user_id", userId).maybeSingle();
  if (!m) return;
  const { error } = await admin.from("clan_members").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (m.role !== "leader") return;

  const { data: rest } = await admin
    .from("clan_members")
    .select("user_id, role, joined_at")
    .eq("clan_id", m.clan_id)
    .order("joined_at", { ascending: true });
  const heir = (rest ?? []).find((r) => r.role === "coleader") ?? rest?.[0];
  if (!heir) {
    await admin.from("clans").update({ is_active: false, owner_id: null }).eq("id", m.clan_id);
    await admin.from("clan_wars").update({ status: "canceled" }).eq("status", "proposed").or(`clan_a.eq.${m.clan_id},clan_b.eq.${m.clan_id}`);
    return;
  }
  await admin.from("clan_members").update({ role: "leader" }).eq("user_id", heir.user_id);
  await admin.from("clans").update({ owner_id: heir.user_id }).eq("id", m.clan_id);
  const clan = await getClanById(m.clan_id);
  await createNotificationForUser({
    userId: heir.user_id,
    type: "league_activity",
    title: `Tu es le nouveau chef de ${clan?.name ?? "ta ligue"}`,
    body: "L'ancien chef a quitté la ligue : c'est toi qui la mènes maintenant.",
    metadata: { slug: clan?.slug },
  });
}

export async function kickMember(actorId: string, targetId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: target } = await admin.from("clan_members").select("clan_id, role").eq("user_id", targetId).maybeSingle();
  if (!target) throw new Error("Ce membre n'est plus dans la ligue.");
  const actorRole = await roleIn(actorId, target.clan_id);
  const allowed = actorRole === "leader" ? target.role !== "leader" : actorRole === "coleader" && target.role === "member";
  if (!allowed || actorId === targetId) throw new Error("Tu ne peux pas exclure ce membre.");
  await admin.from("clan_members").delete().eq("user_id", targetId);
  const clan = await getClanById(target.clan_id);
  await createNotificationForUser({
    userId: targetId,
    type: "league_activity",
    title: `Tu ne fais plus partie de ${clan?.name ?? "la ligue"}`,
    body: "Le chef de la ligue t'a retiré. Tu peux rejoindre une autre ligue quand tu veux.",
    metadata: { slug: clan?.slug },
  });
}

/** Chief only: promote to co-leader, back to member, or hand over the chief role. */
export async function setMemberRole(actorId: string, targetId: string, role: ClanRole): Promise<void> {
  const admin = createAdminClient();
  const { data: target } = await admin.from("clan_members").select("clan_id, role").eq("user_id", targetId).maybeSingle();
  if (!target || actorId === targetId) throw new Error("Membre introuvable.");
  if ((await roleIn(actorId, target.clan_id)) !== "leader") throw new Error("Seul le chef peut changer les rôles.");
  const clan = await getClanById(target.clan_id);

  if (role === "leader") {
    await admin.from("clan_members").update({ role: "coleader" }).eq("user_id", actorId);
    const { error } = await admin.from("clan_members").update({ role: "leader" }).eq("user_id", targetId);
    if (error) {
      await admin.from("clan_members").update({ role: "leader" }).eq("user_id", actorId);
      throw new Error(error.message);
    }
    await admin.from("clans").update({ owner_id: targetId }).eq("id", target.clan_id);
    await createNotificationForUser({
      userId: targetId,
      type: "league_activity",
      title: `Tu es le nouveau chef de ${clan?.name ?? "ta ligue"}`,
      body: "L'ancien chef t'a confié la ligue.",
      metadata: { slug: clan?.slug },
    });
    return;
  }
  if (role === "coleader") {
    const { count } = await admin.from("clan_members").select("user_id", { count: "exact", head: true }).eq("clan_id", target.clan_id).eq("role", "coleader");
    if ((count ?? 0) >= MAX_COLEADERS) throw new Error(`${MAX_COLEADERS} adjoints au maximum.`);
  }
  const { error } = await admin.from("clan_members").update({ role }).eq("user_id", targetId);
  if (error) throw new Error(error.message);
  if (role === "coleader") {
    await createNotificationForUser({
      userId: targetId,
      type: "league_activity",
      title: `Tu es adjoint de ${clan?.name ?? "ta ligue"}`,
      body: "Tu peux maintenant accepter des membres et déclarer des guerres.",
      metadata: { slug: clan?.slug },
    });
  }
}

export async function listJoinRequests(clanId: string): Promise<(Person & { createdAt: string; revenueVerified: boolean })[]> {
  const { data } = await createAdminClient()
    .from("clan_join_requests")
    .select("created_at, profiles(id, username, first_name, last_name, avatar_url, revenue_verified)")
    .eq("clan_id", clanId)
    .order("created_at");
  return (data ?? []).flatMap((r) => {
    const p = r.profiles as unknown as (ProfileLite & { revenue_verified: boolean }) | null;
    return p ? [{ ...toPerson(p), createdAt: r.created_at, revenueVerified: p.revenue_verified }] : [];
  });
}

export async function pendingRequestClanIds(userId: string): Promise<string[]> {
  const { data } = await createAdminClient().from("clan_join_requests").select("clan_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.clan_id);
}

export async function respondJoinRequest(actorId: string, clanId: string, userId: string, accept: boolean): Promise<void> {
  const role = await roleIn(actorId, clanId);
  if (role !== "leader" && role !== "coleader") throw new Error("Seuls le chef et les adjoints répondent aux demandes.");
  const admin = createAdminClient();
  const { data: request } = await admin.from("clan_join_requests").select("user_id").eq("clan_id", clanId).eq("user_id", userId).maybeSingle();
  if (!request) throw new Error("Cette demande n'existe plus.");
  await admin.from("clan_join_requests").delete().eq("clan_id", clanId).eq("user_id", userId);
  const clan = await getClanById(clanId);
  if (!accept) {
    await createNotificationForUser({
      userId,
      type: "league_activity",
      title: `Demande refusée par ${clan?.name ?? "la ligue"}`,
      body: "D'autres ligues t'attendent : jette un œil au classement des ligues.",
      metadata: { slug: clan?.slug },
    });
    return;
  }
  await joinClan(userId, clanId, { force: true });
  await createNotificationForUser({
    userId,
    type: "league_activity",
    title: `Bienvenue dans ${clan?.name ?? "la ligue"} !`,
    body: "Ta demande a été acceptée.",
    metadata: { slug: clan?.slug },
  });
}

export async function cancelJoinRequest(userId: string, clanId: string): Promise<void> {
  await createAdminClient().from("clan_join_requests").delete().eq("clan_id", clanId).eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function setClanActive(clanId: string, isActive: boolean): Promise<void> {
  const { error } = await createAdminClient().from("clans").update({ is_active: isActive }).eq("id", clanId);
  if (error) throw new Error(error.message);
}

/** Opens a partner creator's league (no verification needed: the partnership is the vetting). */
export async function createPartnerClan(influencerId: string, input: ClanSettingsInput): Promise<string> {
  const admin = createAdminClient();
  const { data: influencer } = await admin.from("influencers").select("id, user_id").eq("id", influencerId).maybeSingle();
  if (!influencer?.user_id) throw new Error("Relie d'abord ce créateur à son compte ASCEND : il sera le chef de la ligue.");
  const { data: current } = await admin.from("clan_members").select("clan_id, role").eq("user_id", influencer.user_id).maybeSingle();
  if (current?.role === "leader") {
    // Already leads a league: make it the partner league.
    const { error } = await admin
      .from("clans")
      .update({ influencer_id: influencerId, max_members: PARTNER_CLAN_MAX_MEMBERS })
      .eq("id", current.clan_id);
    if (error) throw new Error(error.code === "23505" ? "Ce créateur a déjà une ligue partenaire." : error.message);
    const { data } = await admin.from("clans").select("slug").eq("id", current.clan_id).single();
    return data!.slug;
  }
  if (current) await leaveClan(influencer.user_id);
  return createClan(influencer.user_id, input, { skipVerification: true, influencerId });
}
