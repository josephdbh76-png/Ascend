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

const MAX_BUTTONS = 3;

/**
 * A code button only carries the code (its label is never shown), a link
 * needs both a label and a destination: an ASCEND path or an http(s) URL.
 */
function cleanButtons(buttons: BannerButton[] | undefined): BannerButton[] {
  return (buttons ?? [])
    .map((b): BannerButton | null => {
      const value = b.value.trim();
      if (!value) return null;
      if (b.type === "copy_code") return { type: "copy_code", label: "", value: value.toUpperCase().slice(0, 40) };
      const label = b.label.trim();
      if (!label) return null;
      const isPath = value.startsWith("/") && !value.startsWith("//");
      if (!isPath && !/^https?:\/\//i.test(value)) return null;
      return { type: "link", label: label.slice(0, 40), value };
    })
    .filter((b): b is BannerButton => b !== null)
    .slice(0, MAX_BUTTONS);
}

export async function createBanner(input: CreateBannerInput): Promise<DashboardBannerRow> {
  const buttons = cleanButtons(input.buttons);
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

export async function updateBanner(bannerId: string, input: CreateBannerInput): Promise<DashboardBannerRow> {
  const buttons = cleanButtons(input.buttons);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_banners")
    .update({
      image_url: input.imageUrl,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      buttons,
    })
    .eq("id", bannerId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Impossible de modifier la bannière.");
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
