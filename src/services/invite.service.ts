import "server-only";
import { createHash } from "crypto";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { getAppUrl } from "@/lib/utils";
import { joinClan } from "@/services/clan.service";
import {
  INVITE_BONUS_CENTS,
  INVITE_BONUS_EVERY,
  INVITE_REWARD_CENTS,
  INVITE_WINDOW_DAYS,
  LEADER_SHARE,
  MIN_PAYOUT_CENTS,
  REWARD_HOLD_DAYS,
  euros,
} from "@/lib/clans";
import type { ClanInviteOutcome, ClanRewardKind } from "@/types/database.types";

// Invites: every member has a link. A new member who takes a paid
// subscription within 60 days earns the inviter 5 € (50 € more at every
// 10th), if the inviter is in a league; the league's chief earns 20 % of
// that on top. Held 30 days (refund window), paid on the 5th.
// Partner creators have their own deal (influencer.service): a member they
// brought never earns an invite reward on top.

export const INVITE_COOKIE = "ascend_invite";
export const INVITE_COOKIE_DAYS = 30;
const DAY_MS = 864e5;

export function inviteLink(username: string): string {
  return `${getAppUrl()}/i/${encodeURIComponent(username)}`;
}

async function hasPaidSubscription(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("tier, status, stripe_subscription_id, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.tier === "free" || data.status !== "active" || !data.stripe_subscription_id) return false;
  // A free trial isn't a paid subscription yet.
  return !(data.trial_ends_at && new Date(data.trial_ends_at) > new Date());
}

/**
 * Remembers who brought a member, the first time only. `source`: they
 * signed up through the link, or joined the inviter's league through it.
 */
export async function recordInvite(inviteeId: string, inviterId: string, source: "signup" | "join", clanId: string | null): Promise<void> {
  if (inviteeId === inviterId) return;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("clan_invites").select("invitee_id").eq("invitee_id", inviteeId).maybeSingle();
  if (existing) return;
  // Someone a partner creator brought stays theirs.
  const { data: profile } = await admin.from("profiles").select("influencer_id").eq("id", inviteeId).maybeSingle();
  if (profile?.influencer_id) return;
  await admin.from("clan_invites").insert({
    invitee_id: inviteeId,
    inviter_id: inviterId,
    clan_id: clanId,
    source,
    had_paid_subscription: source === "join" ? await hasPaidSubscription(inviteeId) : false,
    eligible_until: new Date(Date.now() + INVITE_WINDOW_DAYS * DAY_MS).toISOString(),
  });
}

/**
 * A new member who signed up through an invite: remembered for the reward,
 * and taken into the inviter's league (or asked in, depending on its
 * access). Never throws: an invite must not break a signup.
 */
export async function attributeSignupToInviter(userId: string, inviterId: string): Promise<void> {
  try {
    const { data: membership } = await createAdminClient().from("clan_members").select("clan_id").eq("user_id", inviterId).maybeSingle();
    await recordInvite(userId, inviterId, "signup", membership?.clan_id ?? null);
    if (membership) await joinClan(userId, membership.clan_id, { inviterId });
  } catch (err) {
    console.error("Invite attribution failed:", err);
  }
}

async function resolveInvite(inviteeId: string, outcome: ClanInviteOutcome) {
  await createAdminClient().from("clan_invites").update({ outcome, resolved_at: new Date().toISOString() }).eq("invitee_id", inviteeId).is("outcome", null);
}

/** The card that paid this invoice, to compare with the inviter's own cards. */
async function invoiceCardFingerprint(invoiceId: string): Promise<string | null> {
  try {
    const payments = await getStripe().invoicePayments.list({ invoice: invoiceId, expand: ["data.payment.payment_intent.latest_charge"] });
    for (const p of payments.data) {
      const intent = p.payment.payment_intent;
      const charge = typeof intent === "object" ? intent?.latest_charge : null;
      const fingerprint = typeof charge === "object" ? charge?.payment_method_details?.card?.fingerprint : null;
      if (fingerprint) return fingerprint;
    }
  } catch (err) {
    console.error("Invoice card lookup failed:", err);
  }
  return null;
}

async function memberCardFingerprints(userId: string): Promise<Set<string>> {
  const { data } = await createAdminClient().from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (!data?.stripe_customer_id) return new Set();
  try {
    const methods = await getStripe().paymentMethods.list({ customer: data.stripe_customer_id, type: "card", limit: 20 });
    return new Set(methods.data.map((m) => m.card?.fingerprint).filter((f): f is string => !!f));
  } catch {
    return new Set();
  }
}

/**
 * On a paid invoice: the invitee's first payment pays the invite reward,
 * once. Rewards are keyed (dedupe_key), so a redelivered webhook never pays twice.
 */
export async function recordInviteRewardForInvoice(
  subscription: Stripe.Subscription,
  invoice: { id: string; amountPaidCents: number; createdAt: Date },
): Promise<void> {
  const inviteeId = subscription.metadata?.user_id;
  if (!inviteeId || invoice.amountPaidCents <= 0) return;
  const admin = createAdminClient();
  const { data: invite } = await admin.from("clan_invites").select("*").eq("invitee_id", inviteeId).is("outcome", null).maybeSingle();
  if (!invite) return;

  const { data: profile } = await admin.from("profiles").select("influencer_id").eq("id", inviteeId).maybeSingle();
  if (profile?.influencer_id) return;
  if (invite.had_paid_subscription) return resolveInvite(inviteeId, "already_subscribed");
  if (invoice.createdAt > new Date(invite.eligible_until)) return resolveInvite(inviteeId, "late");

  const { data: membership } = await admin.from("clan_members").select("clan_id").eq("user_id", invite.inviter_id).maybeSingle();
  if (!membership) return resolveInvite(inviteeId, "not_in_league");

  const fingerprint = await invoiceCardFingerprint(invoice.id);
  if (fingerprint && (await memberCardFingerprints(invite.inviter_id)).has(fingerprint)) return resolveInvite(inviteeId, "same_card");

  const { data: leader } = await admin.from("clan_members").select("user_id").eq("clan_id", membership.clan_id).eq("role", "leader").maybeSingle();
  const availableAt = new Date(Date.now() + REWARD_HOLD_DAYS * DAY_MS).toISOString();
  const reward = (beneficiary: string, kind: ClanRewardKind, cents: number, key: string) => ({
    beneficiary_id: beneficiary,
    kind,
    amount_cents: cents,
    invitee_id: inviteeId,
    clan_id: membership.clan_id,
    stripe_invoice_id: invoice.id,
    dedupe_key: key,
    available_at: availableAt,
  });
  const rows = [reward(invite.inviter_id, "invite", INVITE_REWARD_CENTS, `invite:${inviteeId}`)];
  const leaderId = leader && leader.user_id !== invite.inviter_id ? leader.user_id : null;
  if (leaderId) rows.push(reward(leaderId, "leader_share", Math.round(INVITE_REWARD_CENTS * LEADER_SHARE), `leader:${inviteeId}`));
  const { error } = await admin.from("clan_rewards").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(`invite reward failed: ${error.message}`);

  // Every 10th paid invite brings the bonus.
  const { count } = await admin
    .from("clan_rewards")
    .select("id", { count: "exact", head: true })
    .eq("beneficiary_id", invite.inviter_id)
    .eq("kind", "invite")
    .neq("status", "canceled");
  const paidInvites = count ?? 0;
  const bonus = paidInvites > 0 && paidInvites % INVITE_BONUS_EVERY === 0;
  if (bonus) {
    const bonusRows = [reward(invite.inviter_id, "invite_bonus", INVITE_BONUS_CENTS, `bonus:${invite.inviter_id}:${paidInvites}`)];
    if (leaderId) bonusRows.push(reward(leaderId, "leader_bonus", Math.round(INVITE_BONUS_CENTS * LEADER_SHARE), `leaderbonus:${invite.inviter_id}:${paidInvites}`));
    await admin.from("clan_rewards").upsert(bonusRows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  }
  await resolveInvite(inviteeId, "rewarded");

  const { data: invitee } = await admin.from("profiles").select("first_name, username").eq("id", inviteeId).maybeSingle();
  const name = invitee?.first_name?.trim() ? invitee.first_name.trim().replace(/^./, (c) => c.toUpperCase()) : `@${invitee?.username ?? "ton filleul"}`;
  await createNotificationForUser({
    userId: invite.inviter_id,
    type: "referral_rewarded",
    title: bonus ? `+${euros(INVITE_REWARD_CENTS + INVITE_BONUS_CENTS)} : ton ${paidInvites}e filleul abonné !` : `+${euros(INVITE_REWARD_CENTS)} grâce à ${name}`,
    body: `${name} s'est abonné grâce à ton invitation.${bonus ? ` Avec le bonus des ${INVITE_BONUS_EVERY} filleuls,` : ""} Ce gain sera disponible dans ${REWARD_HOLD_DAYS} jours, puis versé le 5 du mois.`,
    metadata: { invitee_id: inviteeId },
  });
  if (leaderId) {
    await createNotificationForUser({
      userId: leaderId,
      type: "referral_rewarded",
      title: `+${euros(Math.round((INVITE_REWARD_CENTS + (bonus ? INVITE_BONUS_CENTS : 0)) * LEADER_SHARE))} pour ta ligue`,
      body: `Un membre de ta ligue vient de faire abonner ${name}. En tant que chef, tu touches ${Math.round(LEADER_SHARE * 100)} % de son gain.`,
      metadata: { invitee_id: inviteeId },
    });
  }
}

/** A refunded first payment: its rewards are canceled while they're still held. */
export async function cancelInviteRewardsForInvitee(inviteeId: string): Promise<void> {
  await createAdminClient().from("clan_rewards").update({ status: "canceled" }).eq("invitee_id", inviteeId).eq("status", "pending");
}

// ---------------------------------------------------------------------------
// What a member sees
// ---------------------------------------------------------------------------

export interface InviteeRow {
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  status: "waiting" | "rewarded" | "lost";
  /** Why it didn't pay (lost), in plain words. */
  note: string | null;
  eligibleUntil: string;
}

export interface EarningsSummary {
  link: string;
  invitees: InviteeRow[];
  paidInvites: number;
  /** Held 30 days. */
  holdingCents: number;
  /** Ready for the next payout. */
  availableCents: number;
  paidCents: number;
  leaderCents: number;
  rewards: { kind: ClanRewardKind; amountCents: number; status: "pending" | "paid" | "canceled"; availableAt: string; createdAt: string; invitee: string | null }[];
}

const LOST_NOTES: Record<ClanInviteOutcome, string | null> = {
  rewarded: null,
  not_in_league: "Abonné alors que tu n'étais dans aucune ligue",
  same_card: "Payé avec une de tes cartes",
  late: "Abonné après les 60 jours",
  already_subscribed: "Déjà abonné avant ton invitation",
};

export async function getEarnings(userId: string, username: string): Promise<EarningsSummary> {
  const admin = createAdminClient();
  const [{ data: invites }, { data: rewards }] = await Promise.all([
    admin
      .from("clan_invites")
      .select("created_at, eligible_until, outcome, profiles!clan_invites_invitee_id_fkey(username, first_name, avatar_url)")
      .eq("inviter_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("clan_rewards")
      .select("kind, amount_cents, status, available_at, created_at, profiles!clan_rewards_invitee_id_fkey(username, first_name)")
      .eq("beneficiary_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const now = Date.now();
  let holdingCents = 0;
  let availableCents = 0;
  let paidCents = 0;
  let leaderCents = 0;
  for (const r of rewards ?? []) {
    if (r.status === "canceled") continue;
    if (r.kind === "leader_share" || r.kind === "leader_bonus") leaderCents += r.amount_cents;
    if (r.status === "paid") paidCents += r.amount_cents;
    else if (new Date(r.available_at).getTime() <= now) availableCents += r.amount_cents;
    else holdingCents += r.amount_cents;
  }
  return {
    link: inviteLink(username),
    invitees: (invites ?? []).map((i) => {
      const p = i.profiles as unknown as { username: string; first_name: string | null; avatar_url: string | null } | null;
      return {
        username: p?.username ?? "membre",
        firstName: p?.first_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        joinedAt: i.created_at,
        status: i.outcome === "rewarded" ? "rewarded" : i.outcome ? "lost" : "waiting",
        note: i.outcome ? LOST_NOTES[i.outcome] : null,
        eligibleUntil: i.eligible_until,
      };
    }),
    paidInvites: (rewards ?? []).filter((r) => r.kind === "invite" && r.status !== "canceled").length,
    holdingCents,
    availableCents,
    paidCents,
    leaderCents,
    rewards: (rewards ?? []).map((r) => {
      const p = r.profiles as unknown as { username: string; first_name: string | null } | null;
      return {
        kind: r.kind,
        amountCents: r.amount_cents,
        status: r.status,
        availableAt: r.available_at,
        createdAt: r.created_at,
        invitee: p ? (p.first_name?.trim() || `@${p.username}`) : null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Admin: the payout of the 5th
// ---------------------------------------------------------------------------

export interface PayableMember {
  userId: string;
  username: string;
  availableCents: number;
  holdingCents: number;
  rewardIds: string[];
  payoutAccount: "ready" | "pending" | "none";
}

export async function listPayableRewards(): Promise<PayableMember[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clan_rewards")
    .select("id, beneficiary_id, amount_cents, available_at, profiles!clan_rewards_beneficiary_id_fkey(username)")
    .eq("status", "pending");
  const now = Date.now();
  const byMember = new Map<string, PayableMember>();
  for (const r of data ?? []) {
    const p = r.profiles as unknown as { username: string } | null;
    const entry = byMember.get(r.beneficiary_id) ?? {
      userId: r.beneficiary_id,
      username: p?.username ?? "membre",
      availableCents: 0,
      holdingCents: 0,
      rewardIds: [],
      payoutAccount: "none" as const,
    };
    if (new Date(r.available_at).getTime() <= now) {
      entry.availableCents += r.amount_cents;
      entry.rewardIds.push(r.id);
    } else entry.holdingCents += r.amount_cents;
    byMember.set(r.beneficiary_id, entry);
  }
  const ids = [...byMember.keys()];
  const { data: accounts } = ids.length
    ? await admin.from("seller_accounts").select("user_id, payouts_enabled").in("user_id", ids)
    : { data: [] as { user_id: string; payouts_enabled: boolean }[] };
  for (const a of accounts ?? []) {
    const entry = byMember.get(a.user_id);
    if (entry) entry.payoutAccount = a.payouts_enabled ? "ready" : "pending";
  }
  return [...byMember.values()].sort((a, b) => b.availableCents - a.availableCents);
}

/**
 * Pays a member's available rewards: a Stripe transfer to their payout
 * account (Stripe then pays it out on the 5th), or `manual` when the team
 * paid by other means. Refuses below the 20 € minimum.
 */
export async function payMemberRewards(userId: string, manual: boolean): Promise<number> {
  const admin = createAdminClient();
  const member = (await listPayableRewards()).find((m) => m.userId === userId);
  if (!member || member.rewardIds.length === 0) throw new Error("Rien à verser pour ce membre.");
  if (member.availableCents < MIN_PAYOUT_CENTS) throw new Error(`Moins de ${euros(MIN_PAYOUT_CENTS)} disponibles : on attend le prochain versement.`);

  let transferId: string | null = null;
  if (!manual) {
    const { data: account } = await admin.from("seller_accounts").select("stripe_account_id, payouts_enabled").eq("user_id", userId).maybeSingle();
    if (!account?.payouts_enabled) throw new Error("Ce membre n'a pas encore activé son compte de versement.");
    const transfer = await getStripe().transfers.create(
      {
        amount: member.availableCents,
        currency: "eur",
        destination: account.stripe_account_id,
        description: "Gains d'invitation ASCEND",
        metadata: { ascend_user_id: userId, kind: "invite_rewards" },
      },
      { idempotencyKey: `invite-rewards-${createHash("sha256").update([...member.rewardIds].sort().join(",")).digest("hex")}` },
    );
    transferId = transfer.id;
  }
  await admin
    .from("clan_rewards")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_transfer_id: transferId })
    .in("id", member.rewardIds)
    .eq("status", "pending");
  await createNotificationForUser({
    userId,
    type: "referral_rewarded",
    title: `${euros(member.availableCents)} versés`,
    body: manual ? "Tes gains d'invitation ont été versés." : "Tes gains d'invitation sont en route vers ton compte de versement.",
    metadata: {},
  });
  return member.availableCents;
}
