import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BetaMode {
  enabled: boolean;
  since: string | null;
}

const OFF: BetaMode = { enabled: false, since: null };

/**
 * Beta: everyone gets Elite for free and no payment goes through ASCEND.
 * Read once per request; off when the setting (or its table) is missing.
 */
export const getBetaMode = cache(async (): Promise<BetaMode> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_settings").select("value").eq("key", "beta").maybeSingle();
  if (error || !data) return OFF;
  const value = (data.value ?? {}) as { enabled?: unknown; since?: unknown };
  return { enabled: value.enabled === true, since: typeof value.since === "string" ? value.since : null };
});

export async function setBetaMode(enabled: boolean, adminUserId: string): Promise<void> {
  const admin = createAdminClient();
  const current = await getBetaMode();
  const since = enabled ? (current.enabled && current.since ? current.since : new Date().toISOString()) : null;
  const { error } = await admin
    .from("platform_settings")
    .upsert({ key: "beta", value: { enabled, since }, updated_at: new Date().toISOString(), updated_by: adminUserId });
  if (error) throw new Error(error.message);
  if (!enabled) await startLaunchSales();
}

/**
 * Official launch: titles on sale "N days from the launch" get their dates
 * now. Only once — turning the beta back on and off never restarts them.
 */
async function startLaunchSales(): Promise<void> {
  const admin = createAdminClient();
  const { data: titles, error } = await admin
    .from("titles")
    .select("id, launch_sale_days")
    .not("launch_sale_days", "is", null)
    .is("sale_starts_at", null);
  if (error) throw new Error(error.message);
  const now = Date.now();
  for (const title of titles ?? []) {
    const { error: updateError } = await admin
      .from("titles")
      .update({
        sale_starts_at: new Date(now).toISOString(),
        sale_ends_at: new Date(now + title.launch_sale_days! * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", title.id);
    if (updateError) throw new Error(updateError.message);
  }
}

/** Figures shown next to the switch in the admin. */
export async function getBetaStats(since: string | null) {
  const admin = createAdminClient();
  const [{ count: joined }, { count: paying }] = await Promise.all([
    since
      ? admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", false).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
    admin
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .neq("tier", "free")
      .neq("status", "canceled")
      .not("stripe_subscription_id", "is", null),
  ]);
  return { joinedSinceStart: joined ?? 0, activePaidSubscriptions: paying ?? 0 };
}
