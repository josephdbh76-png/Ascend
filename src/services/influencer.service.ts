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
  };
}

export async function listInfluencers(): Promise<InfluencerRow[]> {
  const admin = createAdminClient();
  const { data: influencers, error } = await admin
    .from("influencers")
    .select("id, name, email, code, commission_rate, discount_percent, duration, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: commissions } = await admin.from("influencer_commissions").select("influencer_id, amount_cents, status");

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

// Called from the Stripe webhook right after a subscription checkout
// completes. The discount is only present on the subscription when the
// customer actually entered a promotion code at checkout — everyone else
// is a no-op. amount_total is what the customer paid on this first
// invoice, already net of their 10% discount, so the commission is
// computed on real money collected, not list price.
export async function recordInfluencerCommissionIfApplicable(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
): Promise<void> {
  // Callers must retrieve the subscription with `expand: ["discounts"]` —
  // without it, each entry is just a discount id string, not an object we
  // can read a promotion code off of.
  const discount = subscription.discounts.find((d): d is Stripe.Discount => typeof d !== "string");
  const promotionCodeId =
    typeof discount?.promotion_code === "string" ? discount.promotion_code : discount?.promotion_code?.id;
  if (!promotionCodeId) return;

  const userId = subscription.metadata?.user_id;
  if (!userId || session.amount_total == null) return;

  const admin = createAdminClient();
  const { data: influencer } = await admin
    .from("influencers")
    .select("id, commission_rate, status")
    .eq("stripe_promotion_code_id", promotionCodeId)
    .maybeSingle();
  if (!influencer || influencer.status !== "active") return;

  const amountCents = Math.round(session.amount_total * influencer.commission_rate);
  if (amountCents <= 0) return;

  // ignoreDuplicates + the unique constraint on stripe_subscription_id
  // makes this safe if Stripe redelivers the completion webhook.
  await admin.from("influencer_commissions").upsert(
    {
      influencer_id: influencer.id,
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_checkout_session_id: session.id,
      amount_cents: amountCents,
      currency: session.currency ?? "eur",
    },
    { onConflict: "stripe_subscription_id", ignoreDuplicates: true },
  );
}
