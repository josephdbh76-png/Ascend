import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/services/notification.service";
import { getStripe } from "@/lib/stripe";
import type { TitleRow, EarnedTitle } from "@/types";

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
    .select("title_id, acquired_at, acquisition_type, is_active")
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

async function grantEarnedTitle(userId: string, titleId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_titles")
    .select("id")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();
  if (existing) return false;

  const { data: def } = await supabase.from("titles").select("name").eq("id", titleId).maybeSingle();
  if (!def) return false;

  const { error } = await supabase
    .from("user_titles")
    .insert({ user_id: userId, title_id: titleId, acquisition_type: "earned" });
  if (error) return false;

  await createNotification({
    userId,
    type: "achievement_unlocked",
    title: "Nouveau titre débloqué",
    body: `Tu peux désormais afficher le titre « ${def.name} » sur ton profil.`,
    metadata: { title_id: titleId },
  });

  return true;
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
}

export async function getPurchasableTitle(titleId: string): Promise<PurchasableTitle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("titles")
    .select("id, name, type, price_cents, stripe_price_id, remaining_supply")
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
  };
}

/** Called only from the Stripe webhook after a title purchase is paid. */
export async function grantPurchasedTitle(userId: string, titleId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_purchased_title", { p_user_id: userId, p_title_id: titleId });
  if (error) throw new Error(error.message);

  if (data) {
    const { data: def } = await admin.from("titles").select("name").eq("id", titleId).maybeSingle();
    await createNotification({
      userId,
      type: "achievement_unlocked",
      title: "Titre débloqué",
      body: `Ton paiement a été confirmé — « ${def?.name ?? titleId} » est maintenant sur ton profil.`,
      metadata: { title_id: titleId },
    });
  }

  return data ?? false;
}

/**
 * One-time (idempotent) setup: creates a real Stripe Product + Price for
 * every purchasable title that doesn't have one yet. Safe to re-run — it
 * skips titles that already have a stripe_price_id, so it also picks up
 * any new purchasable title added to the catalog later.
 */
export async function syncPurchasableTitleStripeProducts(): Promise<{ created: string[] }> {
  const admin = createAdminClient();
  const { data: titles, error } = await admin
    .from("titles")
    .select("id, name, description, price_cents, stripe_price_id")
    .eq("type", "purchasable")
    .is("stripe_price_id", null);
  if (error) throw new Error(error.message);

  const stripe = getStripe();
  const created: string[] = [];

  for (const title of titles ?? []) {
    if (title.price_cents == null) continue;
    const product = await stripe.products.create({ name: `ASCEND — ${title.name}`, description: title.description });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: title.price_cents,
      currency: "eur",
    });
    await admin.from("titles").update({ stripe_price_id: price.id }).eq("id", title.id);
    created.push(title.id);
  }

  return { created };
}
