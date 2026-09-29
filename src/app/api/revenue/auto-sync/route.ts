import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncStripeRevenue, PLATFORM_ACCOUNT_SENTINEL } from "@/services/stripe.service";
import { syncShopifyRevenue } from "@/services/shopify.service";
import { syncPayPalRevenue } from "@/services/paypal.service";
import { syncLemonSqueezyRevenue } from "@/services/lemonsqueezy.service";
import { isRevenueSyncStale } from "@/lib/revenueSync";

export const maxDuration = 60;

/**
 * Keeps verified revenue (and so the leaderboard) current without the member
 * clicking "resync": the dashboard calls this when a source is stale. Runs
 * with the member's own session, like a manual sync, so RLS still applies.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: sources } = await supabase
    .from("revenue_sources")
    .select("id, provider, status, external_account_id, last_synced_at")
    .eq("user_id", user.id)
    .eq("status", "connected")
    .in("provider", ["stripe", "shopify", "paypal", "lemonsqueezy"]);

  const stale = (sources ?? []).filter((s) => isRevenueSyncStale(s.last_synced_at));

  let synced = 0;
  for (const source of stale) {
    try {
      const result =
        source.provider === "stripe"
          ? await syncStripeRevenue(
              user.id,
              source.id,
              !source.external_account_id || source.external_account_id === PLATFORM_ACCOUNT_SENTINEL
                ? null
                : source.external_account_id,
            )
          : source.provider === "shopify"
            ? source.external_account_id
              ? await syncShopifyRevenue(user.id, source.id, source.external_account_id)
              : { success: false as const }
            : source.provider === "paypal"
              ? await syncPayPalRevenue(user.id, source.id)
              : await syncLemonSqueezyRevenue(user.id, source.id);
      if (result.success) synced++;
    } catch (err) {
      console.error(`Auto-sync ${source.provider} failed for ${user.id}:`, err);
    }
  }

  return NextResponse.json({ synced });
}
