import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { grantTitleToMember } from "@/services/progress.service";
import { getStripe } from "@/lib/stripe";
import type { TitleRow, EarnedTitle } from "@/types";
import type { TitleRarity } from "@/types/database.types";
import type { TitleSaleWindow } from "@/lib/titleSale";

export type ActiveTitleInfo = { name: string; icon: string; rarity: TitleRarity; editionNumber: number | null };

/** Bulk-fetches each user's currently-displayed title, keyed by user id — used
 * wherever a member's name appears in a list (leaderboard, network, ...). */
export async function getActiveTitlesByUserIds(userIds: string[]): Promise<Map<string, ActiveTitleInfo>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_titles")
    .select("user_id, edition_number, titles(name, icon, rarity)")
    .eq("is_active", true)
    .in("user_id", userIds);

  return new Map(
    (data ?? [])
      .filter((d) => d.titles)
      .map((d) => {
        const title = d.titles as unknown as Omit<ActiveTitleInfo, "editionNumber">;
        return [d.user_id, { ...title, editionNumber: d.edition_number }];
      }),
  );
}

/** % of (non-demo) members who own each title — shown as social proof next to rarity. */
export async function getTitleCompletionRates(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const [{ count: total }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_demo", false),
    supabase.from("user_titles").select("title_id"),
  ]);
  if (!total) return {};

  const tally = new Map<string, number>();
  for (const row of rows ?? []) tally.set(row.title_id, (tally.get(row.title_id) ?? 0) + 1);

  const rates: Record<string, number> = {};
  for (const [id, n] of tally) rates[id] = (n / total) * 100;
  return rates;
}

export async function getTitleCatalog(): Promise<TitleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("titles").select("*").order("rarity");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserTitles(userId: string): Promise<EarnedTitle[]> {
  const supabase = await createClient();
  const { data: owned, error } = await supabase
    .from("user_titles")
    .select("title_id, acquired_at, acquisition_type, is_active, edition_number")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!owned || owned.length === 0) return [];

  const { data: catalog } = await supabase
    .from("titles")
    .select("*")
    .in("id", owned.map((o) => o.title_id));

  const byId = new Map((catalog ?? []).map((t) => [t.id, t]));

  return owned
    .filter((o) => byId.has(o.title_id))
    .map((o) => {
      const def = byId.get(o.title_id)!;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        acquiredAt: o.acquired_at,
        acquisitionType: o.acquisition_type,
        isActive: o.is_active,
        editionNumber: o.edition_number,
        supply: def.supply,
      };
    });
}

export async function getActiveTitle(userId: string): Promise<EarnedTitle | null> {
  const titles = await getUserTitles(userId);
  return titles.find((t) => t.isActive) ?? null;
}

export async function setActiveTitle(userId: string, titleId: string | null) {
  const supabase = await createClient();
  await supabase.from("user_titles").update({ is_active: false }).eq("user_id", userId);
  if (titleId) {
    await supabase
      .from("user_titles")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("title_id", titleId);
  }
}

function grantEarnedTitle(userId: string, titleId: string): Promise<boolean> {
  return grantTitleToMember(userId, titleId);
}

/**
 * Re-evaluates every "earned" title against the user's current standing.
 * Safe to call repeatedly — grants are idempotent. Mirrors the achievement
 * engine but for collectible profile titles.
 */
export async function evaluateEarnedTitles(
  userId: string,
  data: {
    revenueCents?: number;
    growthPercent?: number | null;
    globalRank?: number | null;
    foundingMemberNumber?: number | null;
    isVerified?: boolean;
  },
) {
  const newlyEarned: string[] = [];

  if (data.isVerified && (await grantEarnedTitle(userId, "the-builder"))) newlyEarned.push("the-builder");

  if (data.foundingMemberNumber != null && (await grantEarnedTitle(userId, "founding-member"))) {
    newlyEarned.push("founding-member");
  }

  if (data.globalRank != null) {
    const rankTitles: [number, string][] = [
      [10, "top-10"],
      [50, "top-50"],
      [100, "top-100"],
    ];
    for (const [rank, id] of rankTitles) {
      if (data.globalRank <= rank && (await grantEarnedTitle(userId, id))) newlyEarned.push(id);
    }
  }

  if (data.growthPercent != null && data.growthPercent >= 30 && (await grantEarnedTitle(userId, "growth-machine"))) {
    newlyEarned.push("growth-machine");
  }

  if (data.revenueCents != null && data.revenueCents >= 10000000 && (await grantEarnedTitle(userId, "100k-club"))) {
    newlyEarned.push("100k-club");
  }

  return newlyEarned;
}

export interface PurchasableTitle {
  id: string;
  name: string;
  priceCents: number;
  stripePriceId: string | null;
  remainingSupply: number | null;
  saleWindow: TitleSaleWindow;
  requiredTier: "pro" | "elite" | null;
}

export async function getPurchasableTitle(titleId: string): Promise<PurchasableTitle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("titles")
    .select("id, name, type, price_cents, stripe_price_id, remaining_supply, sale_starts_at, sale_ends_at, launch_sale_days, required_tier")
    .eq("id", titleId)
    .eq("type", "purchasable")
    .maybeSingle();
  if (!data || data.price_cents == null) return null;

  return {
    id: data.id,
    name: data.name,
    priceCents: data.price_cents,
    stripePriceId: data.stripe_price_id,
    remainingSupply: data.remaining_supply,
    saleWindow: { sale_starts_at: data.sale_starts_at, sale_ends_at: data.sale_ends_at, launch_sale_days: data.launch_sale_days },
    requiredTier: data.required_tier,
  };
}

/** Called only from the Stripe webhook after a title purchase is paid. */
export async function grantPurchasedTitle(userId: string, titleId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_purchased_title", { p_user_id: userId, p_title_id: titleId });
  if (error) throw new Error(error.message);

  if (data) {
    const { data: def } = await admin.from("titles").select("name").eq("id", titleId).maybeSingle();
    // Webhook context: no user session, so the RLS-scoped createNotification would be rejected.
    await createNotificationForUser({
      userId,
      type: "achievement_unlocked",
      title: "Titre débloqué",
      body: `Paiement confirmé : « ${def?.name ?? titleId} » est maintenant sur ton profil.`,
      metadata: { title_id: titleId },
    });
  }

  return data ?? false;
}

/**
 * Idempotent: gives every purchasable title a Stripe Price matching its
 * price in ASCEND. New titles get a Product + Price; a title whose price
 * changed gets a new Price on its Product (Stripe prices can't be edited)
 * and the old one is archived. Safe to re-run after any catalogue change.
 */
export async function syncPurchasableTitleStripeProducts(): Promise<{ created: string[]; updated: string[] }> {
  const admin = createAdminClient();
  const { data: titles, error } = await admin
    .from("titles")
    .select("id, name, description, price_cents, stripe_price_id")
    .eq("type", "purchasable");
  if (error) throw new Error(error.message);

  const stripe = getStripe();
  const created: string[] = [];
  const updated: string[] = [];

  for (const title of titles ?? []) {
    if (title.price_cents == null) continue;
    if (title.stripe_price_id) {
      const current = await stripe.prices.retrieve(title.stripe_price_id);
      if (current.unit_amount === title.price_cents && current.active) continue;
      const productId = typeof current.product === "string" ? current.product : current.product.id;
      const price = await stripe.prices.create({ product: productId, unit_amount: title.price_cents, currency: "eur" });
      await admin.from("titles").update({ stripe_price_id: price.id }).eq("id", title.id);
      if (current.active) await stripe.prices.update(current.id, { active: false });
      updated.push(title.id);
      continue;
    }
    const product = await stripe.products.create({ name: `ASCEND — ${title.name}`, description: title.description });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: title.price_cents,
      currency: "eur",
    });
    await admin.from("titles").update({ stripe_price_id: price.id }).eq("id", title.id);
    created.push(title.id);
  }

  return { created, updated };
}
