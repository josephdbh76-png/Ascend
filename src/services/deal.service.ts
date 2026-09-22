import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DealRow {
  id: string;
  title: string;
  description: string;
  influencerName: string;
  originalPriceCents: number;
  dealPriceCents: number;
  externalUrl: string;
  coverImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

type DealDbRow = {
  id: string;
  title: string;
  description: string;
  influencer_name: string;
  original_price_cents: number;
  deal_price_cents: number;
  external_url: string;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
};

function mapDeal(row: DealDbRow): DealRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    influencerName: row.influencer_name,
    originalPriceCents: row.original_price_cents,
    dealPriceCents: row.deal_price_cents,
    externalUrl: row.external_url,
    coverImageUrl: row.cover_image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Elite-gated at the page level — this just returns what's currently live. */
export async function listActiveDeals(): Promise<DealRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDeal);
}

export async function listAllDealsForAdmin(): Promise<DealRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("deals").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDeal);
}

export interface CreateDealInput {
  title: string;
  description: string;
  influencerName: string;
  originalPriceCents: number;
  dealPriceCents: number;
  externalUrl: string;
  coverImageUrl?: string | null;
}

export async function createDeal(input: CreateDealInput): Promise<DealRow> {
  if (input.dealPriceCents >= input.originalPriceCents) {
    throw new Error("Le prix bon plan doit être inférieur au prix normal.");
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deals")
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      influencer_name: input.influencerName.trim(),
      original_price_cents: input.originalPriceCents,
      deal_price_cents: input.dealPriceCents,
      external_url: input.externalUrl.trim(),
      cover_image_url: input.coverImageUrl || null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Impossible de créer le bon plan.");
  return mapDeal(data);
}

export async function setDealActive(dealId: string, isActive: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("deals").update({ is_active: isActive }).eq("id", dealId);
  if (error) throw new Error(error.message);
}

export async function deleteDeal(dealId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("deals").delete().eq("id", dealId);
  if (error) throw new Error(error.message);
}
