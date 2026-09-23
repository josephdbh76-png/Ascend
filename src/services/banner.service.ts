import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BannerButton {
  type: "link" | "copy_code";
  label: string;
  value: string;
}

export interface DashboardBannerRow {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  buttons: BannerButton[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

type BannerDbRow = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  buttons: BannerButton[];
  display_order: number;
  is_active: boolean;
  created_at: string;
};

function mapBanner(row: BannerDbRow): DashboardBannerRow {
  return {
    id: row.id,
    imageUrl: row.image_url,
    title: row.title,
    subtitle: row.subtitle,
    buttons: row.buttons ?? [],
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Empty when nothing was configured — the dashboard shows nothing different in that case. */
export async function listActiveBanners(): Promise<DashboardBannerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_banners")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBanner);
}

export async function listAllBannersForAdmin(): Promise<DashboardBannerRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_banners")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBanner);
}

export interface CreateBannerInput {
  imageUrl: string;
  title: string;
  subtitle?: string | null;
  buttons?: BannerButton[];
  displayOrder?: number;
}

export async function createBanner(input: CreateBannerInput): Promise<DashboardBannerRow> {
  const buttons = (input.buttons ?? []).filter((b) => b.label.trim() && b.value.trim());
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_banners")
    .insert({
      image_url: input.imageUrl,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      buttons,
      display_order: input.displayOrder ?? 0,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Impossible de créer la bannière.");
  return mapBanner(data);
}

export async function setBannerActive(bannerId: string, isActive: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("dashboard_banners").update({ is_active: isActive }).eq("id", bannerId);
  if (error) throw new Error(error.message);
}

export async function deleteBanner(bannerId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("dashboard_banners").delete().eq("id", bannerId);
  if (error) throw new Error(error.message);
}
