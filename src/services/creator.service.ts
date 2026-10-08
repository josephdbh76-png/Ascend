import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreatorLeagueForInfluencer, joinCreatorLeague, type CreatorLeague } from "@/services/creatorLeague.service";

// Creator partners: their personal link (/c/CODE) attributes the people it
// brings to them, for life. The commission itself is recorded on every paid
// invoice (influencer.service), during the creator's commission window.

export const CREATOR_COOKIE = "ascend_creator";
export const CREATOR_COOKIE_DAYS = 30;
/** Launch bonus: paid once the creator's link has brought this many verified members. */
export const CREATOR_BONUS_VERIFIED = 10;
export const CREATOR_BONUS_EUROS = 50;

export interface Creator {
  id: string;
  name: string;
  code: string;
  commissionRate: number;
  commissionMonths: number | null;
  discountPercent: number;
  duration: "forever" | "once";
  status: "active" | "inactive";
  linkClicks: number;
  userId: string | null;
}

type CreatorRow = {
  id: string;
  name: string;
  code: string;
  commission_rate: number;
  commission_months: number | null;
  discount_percent: number;
  duration: "forever" | "once";
  status: "active" | "inactive";
  link_clicks: number;
  user_id: string | null;
};

const CREATOR_COLUMNS = "id, name, code, commission_rate, commission_months, discount_percent, duration, status, link_clicks, user_id";

function toCreator(r: CreatorRow): Creator {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    commissionRate: Number(r.commission_rate),
    commissionMonths: r.commission_months,
    discountPercent: Number(r.discount_percent),
    duration: r.duration,
    status: r.status,
    linkClicks: r.link_clicks,
    userId: r.user_id,
  };
}

/** The creator behind a link or promo code, if their partnership is active. */
export async function getActiveCreatorByCode(code: string): Promise<Creator | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(clean)) return null;
  const { data } = await createAdminClient().from("influencers").select(CREATOR_COLUMNS).eq("code", clean).maybeSingle();
  return data && data.status === "active" ? toCreator(data) : null;
}

export async function recordCreatorLinkClick(creatorId: string): Promise<void> {
  await createAdminClient().rpc("increment_creator_link_clicks", { p_influencer_id: creatorId });
}

/**
 * A new member who arrived through a creator's link: attributed to the
 * creator (never overwritten afterwards) and placed in the creator's league.
 * Never throws: attribution must not break a signup.
 */
export async function attributeSignupToCreator(userId: string, creatorId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: creator } = await admin.from("influencers").select("id, status, user_id").eq("id", creatorId).maybeSingle();
    if (!creator || creator.status !== "active" || creator.user_id === userId) return;
    await admin
      .from("profiles")
      .update({ influencer_id: creator.id, influencer_joined_at: new Date().toISOString() })
      .eq("id", userId)
      .is("influencer_id", null);
    const league = await getCreatorLeagueForInfluencer(creator.id);
    if (league?.isActive) await joinCreatorLeague(userId, league.id);
  } catch (err) {
    console.error("Creator attribution failed:", err);
  }
}

/** The creator partnership tied to this member account, if any. */
export const getCreatorForUser = cache(async (userId: string): Promise<Creator | null> => {
  const { data } = await createAdminClient().from("influencers").select(CREATOR_COLUMNS).eq("user_id", userId).maybeSingle();
  return data ? toCreator(data) : null;
});

export interface CreatorDashboard {
  creator: Creator;
  league: CreatorLeague | null;
  signups: number;
  verified: number;
  paying: number;
  /** Pending commissions earned before this month: paid on the next payout day. */
  dueCents: number;
  /** Commissions earned this month, paid on the payout day of next month. */
  monthCents: number;
  paidCents: number;
  recent: { username: string; firstName: string | null; verified: boolean; paying: boolean; joinedAt: string }[];
}

export async function getCreatorDashboard(creator: Creator): Promise<CreatorDashboard> {
  const admin = createAdminClient();
  const [{ data: members }, { data: commissions }, league] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, first_name, revenue_verified, influencer_joined_at, created_at")
      .eq("influencer_id", creator.id)
      .order("influencer_joined_at", { ascending: false }),
    admin.from("influencer_commissions").select("amount_cents, status, created_at").eq("influencer_id", creator.id),
    getCreatorLeagueForInfluencer(creator.id),
  ]);
  const ids = (members ?? []).map((m) => m.id);
  const { data: subs } = ids.length
    ? await admin
        .from("subscriptions")
        .select("user_id, tier, status, stripe_subscription_id")
        .in("user_id", ids)
        .neq("tier", "free")
        .eq("status", "active")
        .not("stripe_subscription_id", "is", null)
    : { data: [] as { user_id: string }[] };
  const payingIds = new Set((subs ?? []).map((s) => s.user_id));

  // Paris time, like the payout day.
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()).split("-").map(Number);
  const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+01:00`);
  let dueCents = 0;
  let monthCents = 0;
  let paidCents = 0;
  for (const c of commissions ?? []) {
    if (c.status === "paid") paidCents += c.amount_cents;
    else if (new Date(c.created_at) >= monthStart) monthCents += c.amount_cents;
    else dueCents += c.amount_cents;
  }

  return {
    creator,
    league,
    signups: members?.length ?? 0,
    verified: (members ?? []).filter((m) => m.revenue_verified).length,
    paying: payingIds.size,
    dueCents,
    monthCents,
    paidCents,
    recent: (members ?? []).slice(0, 8).map((m) => ({
      username: m.username,
      firstName: m.first_name,
      verified: m.revenue_verified,
      paying: payingIds.has(m.id),
      joinedAt: m.influencer_joined_at ?? m.created_at,
    })),
  };
}

/** Admin: ties a creator to their member account and gives them Elite for as long as the partnership lasts. */
export async function linkCreatorToMember(creatorId: string, username: string): Promise<void> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("username", username.trim().toLowerCase().replace(/^@/, "")).maybeSingle();
  if (!profile) throw new Error("Aucun membre avec ce nom d'utilisateur.");
  const { error } = await admin.from("influencers").update({ user_id: profile.id }).eq("id", creatorId);
  if (error) throw new Error(error.code === "23505" ? "Ce membre est déjà relié à un autre créateur." : error.message);
  await admin.from("subscriptions").update({ tier: "elite", status: "active" }).eq("user_id", profile.id).is("stripe_subscription_id", null);
}

export async function setCreatorCommissionTerms(creatorId: string, rate: number, months: number | null): Promise<void> {
  if (!(rate > 0 && rate <= 1)) throw new Error("La commission doit être entre 1 et 100 %.");
  if (months != null && !(Number.isInteger(months) && months > 0 && months <= 120)) throw new Error("Durée invalide.");
  const { error } = await createAdminClient()
    .from("influencers")
    .update({ commission_rate: rate, commission_months: months })
    .eq("id", creatorId);
  if (error) throw new Error(error.message);
}
