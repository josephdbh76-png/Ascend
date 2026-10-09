import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStripeRevenue, PLATFORM_ACCOUNT_SENTINEL } from "@/services/stripe.service";
import { syncShopifyRevenue } from "@/services/shopify.service";
import { syncPayPalRevenue } from "@/services/paypal.service";
import { syncLemonSqueezyRevenue } from "@/services/lemonsqueezy.service";
import { isApiConnector, syncApiSource } from "@/services/apiConnector.service";
import { AUTO_SYNC_PROVIDERS, REVENUE_RESYNC_AFTER_MS } from "@/lib/revenueSync";

/**
 * Re-syncs a member's connected sources older than `staleAfterMs`: from the
 * dashboard (once a day) and from the nightly job for members at war (so
 * the war score follows their sales). Returns how many sources synced.
 */
export async function syncMemberSources(userId: string, staleAfterMs = REVENUE_RESYNC_AFTER_MS): Promise<number> {
  const admin = createAdminClient();
  const [{ data: sources }, { data: profile }] = await Promise.all([
    admin
      .from("revenue_sources")
      .select("id, provider, status, external_account_id, last_synced_at")
      .eq("user_id", userId)
      .eq("status", "connected")
      .in("provider", [...AUTO_SYNC_PROVIDERS]),
    admin.from("profiles").select("is_cofounder").eq("id", userId).maybeSingle(),
  ]);
  const cutoff = Date.now() - staleAfterMs;
  const stale = (sources ?? []).filter(
    (s) =>
      (!s.last_synced_at || new Date(s.last_synced_at).getTime() < cutoff) &&
      // The platform's own Stripe account is only ever read for cofounders.
      (s.external_account_id !== PLATFORM_ACCOUNT_SENTINEL || profile?.is_cofounder),
  );

  let synced = 0;
  for (const source of stale) {
    try {
      const result = isApiConnector(source.provider)
        ? await syncApiSource(userId, source.provider, source.id)
        : source.provider === "stripe"
          ? await syncStripeRevenue(
              userId,
              source.id,
              !source.external_account_id || source.external_account_id === PLATFORM_ACCOUNT_SENTINEL ? null : source.external_account_id,
            )
          : source.provider === "shopify"
            ? source.external_account_id
              ? await syncShopifyRevenue(userId, source.id, source.external_account_id)
              : { success: false as const }
            : source.provider === "paypal"
              ? await syncPayPalRevenue(userId, source.id)
              : await syncLemonSqueezyRevenue(userId, source.id);
      if (result.success) synced++;
    } catch (err) {
      console.error(`Auto-sync ${source.provider} failed for ${userId}:`, err);
    }
  }
  return synced;
}

/** User ids among `userIds` with at least one connected source that syncs on its own. */
export async function membersWithAutoSync(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const { data } = await createAdminClient()
    .from("revenue_sources")
    .select("user_id")
    .in("user_id", userIds)
    .eq("status", "connected")
    .in("provider", [...AUTO_SYNC_PROVIDERS]);
  return new Set((data ?? []).map((r) => r.user_id));
}
