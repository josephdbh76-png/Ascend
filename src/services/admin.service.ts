import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/database.types";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_admin ?? false;
}

export interface AdminUserRow {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  country: string | null;
  isAdmin: boolean;
  isCofounder: boolean;
  isDemo: boolean;
  revenueVerified: boolean;
  createdAt: string;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
}

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, username, first_name, last_name, city, country, is_admin, is_cofounder, is_demo, revenue_verified, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: subs } = await admin.from("subscriptions").select("user_id, tier, status");
  const subsById = new Map((subs ?? []).map((s) => [s.user_id, s]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    firstName: p.first_name,
    lastName: p.last_name,
    city: p.city,
    country: p.country,
    isAdmin: p.is_admin,
    isCofounder: p.is_cofounder,
    isDemo: p.is_demo,
    revenueVerified: p.revenue_verified,
    createdAt: p.created_at,
    tier: subsById.get(p.id)?.tier ?? "free",
    subscriptionStatus: subsById.get(p.id)?.status ?? "active",
  }));
}

export async function adminSetTier(targetUserId: string, tier: SubscriptionTier): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ tier, status: "active" })
    .eq("user_id", targetUserId);
  if (error) throw new Error(error.message);
}

export async function adminSetIsAdmin(targetUserId: string, isAdmin: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_admin: isAdmin }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
}
