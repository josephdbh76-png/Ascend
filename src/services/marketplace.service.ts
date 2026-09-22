import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationForUser } from "@/services/notification.service";
import { getAppUrl } from "@/lib/utils";
import type { TitleRarity } from "@/types/database.types";

// Sliding commission scale: 10% at 50€ or below, down to 5% at 1000€ or
// above, linearly interpolated in between — lower cut on higher-value
// sales, same spirit as a payment processor's own volume pricing.
const COMMISSION_LOW_CENTS = 5000;
const COMMISSION_HIGH_CENTS = 100000;
const COMMISSION_LOW_RATE = 0.1;
const COMMISSION_HIGH_RATE = 0.05;

export function commissionRateForPrice(priceCents: number): number {
  if (priceCents <= COMMISSION_LOW_CENTS) return COMMISSION_LOW_RATE;
  if (priceCents >= COMMISSION_HIGH_CENTS) return COMMISSION_HIGH_RATE;
  const t = (priceCents - COMMISSION_LOW_CENTS) / (COMMISSION_HIGH_CENTS - COMMISSION_LOW_CENTS);
  return COMMISSION_LOW_RATE + t * (COMMISSION_HIGH_RATE - COMMISSION_LOW_RATE);
}

export interface SellerAccountStatus {
  connected: boolean;
  payoutsEnabled: boolean;
}

export async function getSellerAccountStatus(userId: string): Promise<SellerAccountStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_accounts")
    .select("payouts_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return { connected: !!data, payoutsEnabled: data?.payouts_enabled ?? false };
}

/**
 * Starts (or resumes) Stripe Connect Express onboarding — a separate
 * Connect account from the one used for revenue verification
 * (revenue_sources.provider='stripe'), since that one only ever reads
 * charge history and was never granted transfer capabilities.
 */
export async function startSellerOnboarding(userId: string, email: string): Promise<string> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const appUrl = getAppUrl();
  const stripe = getStripe();

  const { data: existing } = await supabase
    .from("seller_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();

  let accountId = existing?.stripe_account_id;
  if (!accountId) {
    const { data: profile } = await supabase.from("profiles").select("country").eq("id", userId).maybeSingle();
    const account = await stripe.accounts.create({
      type: "express",
      country: profile?.country || "FR",
      email,
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await admin.from("seller_accounts").insert({ user_id: userId, stripe_account_id: accountId });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/api/marketplace/connect`,
    return_url: `${appUrl}/api/marketplace/connect/return`,
    type: "account_onboarding",
  });

  return link.url;
}

/** Called from the onboarding return route to sync the real payouts_enabled flag. */
export async function refreshSellerAccountStatus(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("seller_accounts").select("stripe_account_id").eq("user_id", userId).maybeSingle();
  if (!data) return;

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(data.stripe_account_id);
  await admin
    .from("seller_accounts")
    .update({ payouts_enabled: account.payouts_enabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export interface TradeableOwnedTitle {
  userTitleId: string;
  titleId: string;
  name: string;
  icon: string;
  rarity: TitleRarity;
}

/** Titles this member owns, are marked tradeable, and don't already have an active listing. */
export async function listMyTradeableTitles(userId: string): Promise<TradeableOwnedTitle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_titles")
    .select("id, title_id, titles(name, icon, rarity, tradeable)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const { data: activeListings } = await supabase
    .from("title_listings")
    .select("user_title_id")
    .eq("seller_id", userId)
    .eq("status", "active");
  const listedIds = new Set((activeListings ?? []).map((l) => l.user_title_id));

  return (data ?? [])
    .filter((row) => {
      const title = row.titles as unknown as { tradeable: boolean } | null;
      return title?.tradeable && !listedIds.has(row.id);
    })
    .map((row) => {
      const title = row.titles as unknown as { name: string; icon: string; rarity: TitleRarity };
      return { userTitleId: row.id, titleId: row.title_id, name: title.name, icon: title.icon, rarity: title.rarity };
    });
}

export interface MarketplaceListing {
  id: string;
  titleId: string;
  titleName: string;
  titleIcon: string;
  titleRarity: TitleRarity;
  sellerId: string;
  sellerUsername: string;
  priceCents: number;
  status: "active" | "sold" | "cancelled";
  createdAt: string;
  soldAt: string | null;
}

type ListingRow = {
  id: string;
  title_id: string;
  seller_id: string;
  price_cents: number;
  status: "active" | "sold" | "cancelled";
  created_at: string;
  sold_at: string | null;
  titles: { name: string; icon: string; rarity: TitleRarity } | null;
  profiles: { username: string } | null;
};

function mapListing(row: ListingRow): MarketplaceListing {
  return {
    id: row.id,
    titleId: row.title_id,
    titleName: row.titles?.name ?? row.title_id,
    titleIcon: row.titles?.icon ?? "gem",
    titleRarity: row.titles?.rarity ?? "common",
    sellerId: row.seller_id,
    sellerUsername: row.profiles?.username ?? "",
    priceCents: row.price_cents,
    status: row.status,
    createdAt: row.created_at,
    soldAt: row.sold_at,
  };
}

/** The browsable "buy" feed — everyone else's active listings. */
export async function listActiveMarketplaceListings(excludeSellerId: string | null): Promise<MarketplaceListing[]> {
  const supabase = await createClient();
  let query = supabase
    .from("title_listings")
    .select("id, title_id, seller_id, price_cents, status, created_at, sold_at, titles(name, icon, rarity), profiles!seller_id(username)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (excludeSellerId) query = query.neq("seller_id", excludeSellerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapListing(row as unknown as ListingRow));
}

export async function listMyListings(userId: string): Promise<MarketplaceListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("title_listings")
    .select("id, title_id, seller_id, price_cents, status, created_at, sold_at, titles(name, icon, rarity), profiles!seller_id(username)")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapListing(row as unknown as ListingRow));
}

/** Recent sales across the whole marketplace — the FOMO ticker. */
export async function listRecentSales(limit = 8): Promise<MarketplaceListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("title_listings")
    .select("id, title_id, seller_id, price_cents, status, created_at, sold_at, titles(name, icon, rarity), profiles!seller_id(username)")
    .eq("status", "sold")
    .order("sold_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapListing(row as unknown as ListingRow));
}

// Writes below use the admin client on purpose (title_listings/
// seller_accounts grant insert/update to service_role only, per the
// migration) — every mutation validates ownership/eligibility in code
// first, since RLS can't do it for us here.
export async function createListing(sellerId: string, userTitleId: string, priceCents: number): Promise<void> {
  if (priceCents < 100) throw new Error("Le prix minimum est de 1€.");

  const admin = createAdminClient();
  const { data: userTitle } = await admin
    .from("user_titles")
    .select("id, title_id, user_id, titles(tradeable)")
    .eq("id", userTitleId)
    .eq("user_id", sellerId)
    .maybeSingle();
  if (!userTitle) throw new Error("Titre introuvable.");
  const title = userTitle.titles as unknown as { tradeable: boolean } | null;
  if (!title?.tradeable) throw new Error("Ce titre n'est pas revendable.");

  const { error } = await admin.from("title_listings").insert({
    seller_id: sellerId,
    user_title_id: userTitleId,
    title_id: userTitle.title_id,
    price_cents: priceCents,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Ce titre a déjà une annonce active.");
    throw new Error(error.message);
  }
}

export async function cancelListing(sellerId: string, listingId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("title_listings")
    .update({ status: "cancelled" })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
}

export async function createListingCheckoutSession(buyerId: string, buyerEmail: string, listingId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("title_listings")
    .select("id, seller_id, title_id, price_cents, status, titles(name)")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") throw new Error("Cette annonce n'est plus disponible.");
  if (listing.seller_id === buyerId) throw new Error("Tu ne peux pas acheter ton propre titre.");

  const { data: sellerAccount } = await admin
    .from("seller_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", listing.seller_id)
    .maybeSingle();
  if (!sellerAccount?.payouts_enabled) {
    throw new Error("Le vendeur n'a pas terminé la configuration de son compte de paiement.");
  }

  const commissionCents = Math.round(listing.price_cents * commissionRateForPrice(listing.price_cents));
  const titleName = (listing.titles as unknown as { name: string } | null)?.name ?? listing.title_id;
  const appUrl = getAppUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: buyerEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: listing.price_cents,
          product_data: { name: `Titre ASCEND — ${titleName}` },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: commissionCents,
      transfer_data: { destination: sellerAccount.stripe_account_id },
    },
    success_url: `${appUrl}/app/titles?marketplace_purchase=success`,
    cancel_url: `${appUrl}/app/titles?marketplace_purchase=cancelled`,
    metadata: { kind: "title_listing_purchase", listing_id: listingId, buyer_id: buyerId },
    locale: "fr",
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/** Called only from the Stripe webhook after a listing purchase is paid. */
export async function finalizeListingSale(session: Stripe.Checkout.Session): Promise<void> {
  const listingId = session.metadata?.listing_id;
  const buyerId = session.metadata?.buyer_id;
  if (!listingId || !buyerId) return;

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("title_listings")
    .select("id, seller_id, user_title_id, title_id, price_cents, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") return; // already processed (webhook redelivery) or cancelled

  const commissionCents = Math.round(listing.price_cents * commissionRateForPrice(listing.price_cents));

  await admin
    .from("title_listings")
    .update({
      status: "sold",
      buyer_id: buyerId,
      commission_cents: commissionCents,
      stripe_checkout_session_id: session.id,
      sold_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .eq("status", "active");

  // Ownership transfer: the seller loses the title, the buyer gains it —
  // a scarce collectible, never duplicated.
  await admin.from("user_titles").delete().eq("id", listing.user_title_id);
  await admin.from("user_titles").upsert(
    { user_id: buyerId, title_id: listing.title_id, acquisition_type: "purchased" },
    { onConflict: "user_id,title_id" },
  );

  const { data: title } = await admin.from("titles").select("name").eq("id", listing.title_id).maybeSingle();

  // Webhook context has no user session — both recipients need the
  // service-role write path, never the "self" one (which assumes an
  // authenticated request and would be silently blocked by RLS here).
  await createNotificationForUser({
    userId: buyerId,
    type: "achievement_unlocked",
    title: "Titre acheté",
    body: `« ${title?.name ?? listing.title_id} » est maintenant sur ton profil.`,
    metadata: { title_id: listing.title_id },
  });

  await createNotificationForUser({
    userId: listing.seller_id,
    type: "achievement_unlocked",
    title: "Titre vendu",
    body: `Ton titre « ${title?.name ?? listing.title_id} » a été vendu — le paiement arrive sur ton compte connecté.`,
    metadata: { title_id: listing.title_id },
  });
}
