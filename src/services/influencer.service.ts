import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export interface InfluencerRow {
  id: string;
  name: string;
  email: string;
  code: string;
  commissionRate: number;
  discountPercent: number;
  duration: "forever" | "once";
  status: "active" | "inactive";
  createdAt: string;
  pendingCents: number;
  paidCents: number;
  /** null = commission for as long as the member pays. */
  commissionMonths: number | null;
  linkClicks: number;
  /** The creator's own member account (captain of their league, Elite while active). */
  linkedUsername: string | null;
  signups: number;
}

export interface InfluencerCommissionRow {
  id: string;
  influencerId: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: "pending" | "paid";
  paidAt: string | null;
  createdAt: string;
}

// Creates the Stripe coupon (the discount% off, applied either once or to
// every renewal for as long as the subscription stays active, per
// `duration`) and the human-readable promotion code the influencer shares
// with their audience, then stores the pairing so the webhook can
// attribute a sale back to them.
export async function createInfluencer(
  name: string,
  email: string,
  rawCode: string,
  commissionRate: number,
  discountPercent: number,
  duration: "forever" | "once",
  commissionMonths: number | null = 12,
): Promise<InfluencerRow> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Le code ne peut pas être vide.");
  if (discountPercent <= 0 || discountPercent > 100) throw new Error("La réduction doit être entre 1 et 100%.");
  if (commissionRate <= 0 || commissionRate > 1) throw new Error("La commission doit être entre 1 et 100%.");

  const stripe = getStripe();
  const coupon = await stripe.coupons.create({
    percent_off: discountPercent,
    duration,
    name: `Influenceur — ${name}`,
  });

  let promotionCode: Stripe.PromotionCode;
  try {
    promotionCode = await stripe.promotionCodes.create({ promotion: { type: "coupon", coupon: coupon.id }, code });
  } catch (err) {
    await stripe.coupons.del(coupon.id);
    throw new Error(
      err instanceof Error && err.message.includes("already exists")
        ? `Le code "${code}" est déjà utilisé.`
        : err instanceof Error
          ? err.message
          : "Impossible de créer le code promotionnel Stripe.",
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("influencers")
    .insert({
      name: name.trim(),
      email: email.trim(),
      code,
      stripe_coupon_id: coupon.id,
      stripe_promotion_code_id: promotionCode.id,
      commission_rate: commissionRate,
      discount_percent: discountPercent,
      duration,
      commission_months: commissionMonths,
    })
    .select("id, name, email, code, commission_rate, discount_percent, duration, status, created_at")
    .single();

  if (error || !data) {
    await stripe.promotionCodes.update(promotionCode.id, { active: false });
    await stripe.coupons.del(coupon.id);
    throw new Error(error?.message ?? "Impossible d'enregistrer l'influenceur.");
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    code: data.code,
    commissionRate: data.commission_rate,
    discountPercent: data.discount_percent,
    duration: data.duration,
    status: data.status,
    createdAt: data.created_at,
    pendingCents: 0,
    paidCents: 0,
    commissionMonths,
    linkClicks: 0,
    linkedUsername: null,
    signups: 0,
  };
}

export async function listInfluencers(): Promise<InfluencerRow[]> {
  const admin = createAdminClient();
  const { data: influencers, error } = await admin
    .from("influencers")
    .select("id, name, email, code, commission_rate, discount_percent, duration, status, created_at, commission_months, link_clicks, user_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const userIds = (influencers ?? []).map((i) => i.user_id).filter((id): id is string => !!id);
  const [{ data: commissions }, { data: owners }, { data: attributed }] = await Promise.all([
    admin.from("influencer_commissions").select("influencer_id, amount_cents, status"),
    userIds.length ? admin.from("profiles").select("id, username").in("id", userIds) : Promise.resolve({ data: [] as { id: string; username: string }[] }),
    admin.from("profiles").select("influencer_id").not("influencer_id", "is", null),
  ]);
  const usernameById = new Map((owners ?? []).map((o) => [o.id, o.username]));
  const signups = new Map<string, number>();
  for (const p of attributed ?? []) if (p.influencer_id) signups.set(p.influencer_id, (signups.get(p.influencer_id) ?? 0) + 1);

  const totals = new Map<string, { pending: number; paid: number }>();
  for (const c of commissions ?? []) {
    const entry = totals.get(c.influencer_id) ?? { pending: 0, paid: 0 };
    if (c.status === "paid") entry.paid += c.amount_cents;
    else entry.pending += c.amount_cents;
    totals.set(c.influencer_id, entry);
  }

  return (influencers ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    email: i.email,
    code: i.code,
    commissionRate: i.commission_rate,
    discountPercent: i.discount_percent,
    duration: i.duration,
    status: i.status,
    createdAt: i.created_at,
    pendingCents: totals.get(i.id)?.pending ?? 0,
    paidCents: totals.get(i.id)?.paid ?? 0,
    commissionMonths: i.commission_months,
    linkClicks: i.link_clicks,
    linkedUsername: i.user_id ? (usernameById.get(i.user_id) ?? null) : null,
    signups: signups.get(i.id) ?? 0,
  }));
}

export async function listCommissionsForInfluencer(influencerId: string): Promise<InfluencerCommissionRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("influencer_commissions")
    .select("id, influencer_id, user_id, amount_cents, currency, status, paid_at, created_at")
    .eq("influencer_id", influencerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id,
    influencerId: c.influencer_id,
    userId: c.user_id,
    amountCents: c.amount_cents,
    currency: c.currency,
    status: c.status,
    paidAt: c.paid_at,
    createdAt: c.created_at,
  }));
}

export async function setInfluencerStatus(influencerId: string, status: "active" | "inactive"): Promise<void> {
  const admin = createAdminClient();
  const { data: influencer, error: fetchError } = await admin
    .from("influencers")
    .select("stripe_promotion_code_id")
    .eq("id", influencerId)
    .single();
  if (fetchError || !influencer) throw new Error(fetchError?.message ?? "Influenceur introuvable.");

  const stripe = getStripe();
  await stripe.promotionCodes.update(influencer.stripe_promotion_code_id, { active: status === "active" });

  const { error } = await admin.from("influencers").update({ status }).eq("id", influencerId);
  if (error) throw new Error(error.message);
}

export async function markCommissionPaid(commissionId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("influencer_commissions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", commissionId);
  if (error) throw new Error(error.message);
}

/** A month is 28 to 31 days: three days of slack so the invoice due "12 months later" isn't counted as the 12th. */
const WINDOW_SLACK_MS = 3 * 24 * 3600 * 1000;

function promotionCodeOf(subscription: Stripe.Subscription): string | null {
  // Callers must retrieve the subscription with `expand: ["discounts"]` —
  // without it, each entry is just a discount id string.
  const discount = subscription.discounts.find((d): d is Stripe.Discount => typeof d !== "string");
  const code = discount?.promotion_code;
  return (typeof code === "string" ? code : code?.id) ?? null;
}

/**
 * Commission on a paid invoice of a member a creator brought in, through
 * their link (profiles.influencer_id, set at signup) or their promo code
 * (which then sticks to the member: the first creator keeps them). Paid on
 * every invoice during the creator's `commission_months` months after the
 * first commission, or for life when null. Keyed on the invoice id, so a
 * redelivered webhook never pays twice. `amountPaidCents` is what the
 * member actually paid, after their discount.
 */
export async function recordInfluencerCommissionForInvoice(
  subscription: Stripe.Subscription,
  invoice: { id: string; amountPaidCents: number; currency: string; createdAt: Date },
): Promise<void> {
  const userId = subscription.metadata?.user_id;
  if (!userId || invoice.amountPaidCents <= 0) return;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("influencer_id").eq("id", userId).maybeSingle();
  let influencerId = profile?.influencer_id ?? null;

  if (!influencerId) {
    const promotionCodeId = promotionCodeOf(subscription);
    if (!promotionCodeId) return;
    const { data: byCode } = await admin
      .from("influencers")
      .select("id, user_id")
      .eq("stripe_promotion_code_id", promotionCodeId)
      .maybeSingle();
    if (!byCode || byCode.user_id === userId) return;
    influencerId = byCode.id;
    await admin
      .from("profiles")
      .update({ influencer_id: byCode.id, influencer_joined_at: new Date().toISOString() })
      .eq("id", userId)
      .is("influencer_id", null);
  }

  const { data: influencer } = await admin
    .from("influencers")
    .select("id, user_id, commission_rate, commission_months, status")
    .eq("id", influencerId)
    .maybeSingle();
  // A creator paying for their own account earns nothing on it.
  if (!influencer || influencer.status !== "active" || influencer.user_id === userId) return;

  if (influencer.commission_months != null) {
    const { data: first } = await admin
      .from("influencer_commissions")
      .select("created_at")
      .eq("influencer_id", influencer.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (first) {
      const end = new Date(first.created_at);
      end.setMonth(end.getMonth() + influencer.commission_months);
      if (invoice.createdAt.getTime() >= end.getTime() - WINDOW_SLACK_MS) return;
    }
  }

  const amountCents = Math.round(invoice.amountPaidCents * influencer.commission_rate);
  if (amountCents <= 0) return;

  const { error } = await admin.from("influencer_commissions").upsert(
    {
      influencer_id: influencer.id,
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      amount_cents: amountCents,
      currency: invoice.currency,
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`influencer commission failed: ${error.message}`);
}
