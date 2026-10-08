import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Cofounder {
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  revenueVerified: boolean;
}

/** The people behind ASCEND, shown on the home page: a real team, not a logo. */
export const getCofounders = cache(async (): Promise<Cofounder[]> => {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("username, first_name, last_name, avatar_url, revenue_verified, created_at")
    .eq("is_cofounder", true)
    .eq("is_demo", false)
    .order("created_at", { ascending: true });
  return (data ?? []).map((p) => ({
    username: p.username,
    firstName: p.first_name,
    lastName: p.last_name,
    avatarUrl: p.avatar_url,
    revenueVerified: p.revenue_verified,
  }));
});
