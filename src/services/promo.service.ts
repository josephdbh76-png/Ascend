import "server-only";
import type Stripe from "stripe";
import { getStripe, priceIdForTier } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Promo codes live in Stripe (a coupon for the discount, a promotion code for
// the text members type at checkout). This lists every code with its real
// state in Stripe, and creates or switches off the ones the team runs.
// Influencer codes show up too, but they're managed from their own panel.

export type PromoPlan = "pro" | "elite";

export interface PromoCodeRow {
  id: string;
  code: string;
  active: boolean;
  /** False when the coupon itself expired or ran out: the code can't be used. */
  usable: boolean;
  percentOff: number | null;
  amountOffCents: number | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number | null;
  /** null: no product restriction. */
  plans: PromoPlan[] | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  firstTimeOnly: boolean;
  createdAt: string;
  influencer: string | null;
}

export interface PromoCodeInput {
  code: string;
  kind: "percent" | "amount";
  /** Percent (1 to 100) or euros. */
  value: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number | null;
  plans: PromoPlan[];
  maxRedemptions?: number | null;
  /** YYYY-MM-DD, last day the code works. */
  expiresOn?: string | null;
  firstTimeOnly: boolean;
}

let productCache: Promise<Record<PromoPlan, string>> | null = null;

/** Stripe product of each plan, from the monthly prices the checkout uses. */
function planProducts(): Promise<Record<PromoPlan, string>> {
  if (!productCache) {
    productCache = (async () => {
      const stripe = getStripe();
      const [pro, elite] = await Promise.all([
        stripe.prices.retrieve(priceIdForTier("pro", "month")),
        stripe.prices.retrieve(priceIdForTier("elite", "month")),
      ]);
      const id = (p: Stripe.Price) => (typeof p.product === "string" ? p.product : p.product.id);
      return { pro: id(pro), elite: id(elite) };
    })();
    productCache.catch(() => (productCache = null));
  }
  return productCache;
}

export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

export function validatePromoInput(input: PromoCodeInput): string | null {
  const code = normalizeCode(input.code ?? "");
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return "Le code fait 3 à 30 caractères : lettres, chiffres, - ou _.";
  if (input.kind === "percent" && !(input.value >= 1 && input.value <= 100)) return "La réduction en % va de 1 à 100.";
  if (input.kind === "amount" && !(input.value >= 1 && input.value <= 1000)) return "La réduction en € va de 1 à 1 000 €.";
  if (input.duration === "repeating" && !(Number(input.durationInMonths) >= 1 && Number(input.durationInMonths) <= 36)) {
    return "Indique un nombre de mois entre 1 et 36.";
  }
  if (!input.plans?.length || input.plans.some((p) => p !== "pro" && p !== "elite")) return "Choisis au moins une offre (Pro ou Elite).";
  if (input.maxRedemptions != null && !(Number.isInteger(input.maxRedemptions) && input.maxRedemptions >= 1)) {
    return "Le nombre d'utilisations doit être un entier positif.";
  }
  if (input.expiresOn) {
    const end = new Date(`${input.expiresOn}T23:59:59Z`);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return "La date de fin doit être dans le futur.";
  }
  return null;
}

/** Stripe parameters for a new code (kept separate so it can be checked without calling Stripe). */
export function promoStripeParams(input: PromoCodeInput, products: Record<PromoPlan, string>) {
  const code = normalizeCode(input.code);
  const coupon: Stripe.CouponCreateParams = {
    name: `Code ${code}`,
    duration: input.duration,
    applies_to: { products: input.plans.map((p) => products[p]) },
    metadata: { source: "ascend-admin" },
    ...(input.kind === "percent"
      ? { percent_off: Math.round(input.value * 100) / 100 }
      : { amount_off: Math.round(input.value * 100), currency: "eur" }),
    ...(input.duration === "repeating" ? { duration_in_months: Number(input.durationInMonths) } : {}),
  };
  const promotion: Omit<Stripe.PromotionCodeCreateParams, "promotion"> = {
    code,
    metadata: { source: "ascend-admin" },
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresOn ? { expires_at: Math.floor(new Date(`${input.expiresOn}T23:59:59Z`).getTime() / 1000) } : {}),
    ...(input.firstTimeOnly ? { restrictions: { first_time_transaction: true } } : {}),
  };
  return { coupon, promotion };
}

export async function createPromoCode(input: PromoCodeInput): Promise<void> {
  const invalid = validatePromoInput(input);
  if (invalid) throw new Error(invalid);
  const stripe = getStripe();
  const { coupon: couponParams, promotion } = promoStripeParams(input, await planProducts());

  const existing = await stripe.promotionCodes.list({ code: promotion.code, limit: 1 });
  if (existing.data.length > 0) throw new Error(`Le code « ${promotion.code} » existe déjà dans Stripe : réactive-le plutôt.`);

  const coupon = await stripe.coupons.create(couponParams);
  try {
    await stripe.promotionCodes.create({ ...promotion, promotion: { type: "coupon", coupon: coupon.id } });
  } catch (err) {
    await stripe.coupons.del(coupon.id).catch(() => {});
    throw new Error(err instanceof Error ? err.message : "Impossible de créer le code dans Stripe.");
  }
}

export async function setPromoCodeActive(promotionCodeId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data: influencer } = await admin.from("influencers").select("name").eq("stripe_promotion_code_id", promotionCodeId).maybeSingle();
  if (influencer) throw new Error(`C'est le code de ${influencer.name} : gère-le dans le programme d'influenceurs.`);
  await getStripe().promotionCodes.update(promotionCodeId, { active });
}

export async function listPromoCodes(): Promise<PromoCodeRow[]> {
  const stripe = getStripe();
  const admin = createAdminClient();
  const [{ data: influencers }, products] = await Promise.all([
    admin.from("influencers").select("name, stripe_promotion_code_id"),
    planProducts().catch(() => null),
  ]);
  const influencerByCode = new Map((influencers ?? []).map((i) => [i.stripe_promotion_code_id, i.name]));
  const planOf = (productId: string): PromoPlan | null =>
    products ? ((Object.entries(products).find(([, id]) => id === productId)?.[0] as PromoPlan | undefined) ?? null) : null;

  const rows: PromoCodeRow[] = [];
  for await (const pc of stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon.applies_to"] })) {
    const coupon = typeof pc.promotion.coupon === "object" ? pc.promotion.coupon : null;
    const productIds = coupon?.applies_to?.products ?? null;
    rows.push({
      id: pc.id,
      code: pc.code,
      active: pc.active,
      usable: pc.active && (coupon?.valid ?? false) && (pc.expires_at == null || pc.expires_at * 1000 > Date.now()),
      percentOff: coupon?.percent_off ?? null,
      amountOffCents: coupon?.amount_off ?? null,
      duration: (coupon?.duration ?? "once") as PromoCodeRow["duration"],
      durationInMonths: coupon?.duration_in_months ?? null,
      plans: productIds?.length ? (productIds.map(planOf).filter(Boolean) as PromoPlan[]) : null,
      timesRedeemed: pc.times_redeemed,
      maxRedemptions: pc.max_redemptions,
      expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
      firstTimeOnly: pc.restrictions?.first_time_transaction ?? false,
      createdAt: new Date(pc.created * 1000).toISOString(),
      influencer: influencerByCode.get(pc.id) ?? null,
    });
    if (rows.length >= 300) break;
  }
  return rows;
}
