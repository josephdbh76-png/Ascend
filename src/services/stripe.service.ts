import "server-only";
import { getStripe, isStripeTestKey } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import {
  upsertMonthlyRevenue,
  getCurrentRevenue,
  calculateMonthlyGrowth,
  nextRevenueMilestone,
  refreshRevenueVerifiedFlag,
} from "@/services/revenue.service";
import { evaluateRevenueAchievements, evaluateRankAchievements } from "@/services/achievement.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { createNotification } from "@/services/notification.service";
import { getUserRank } from "@/services/leaderboard.service";
import { evaluateEarnedTitles } from "@/services/title.service";
import { getProfile } from "@/services/profile.service";

const STRIPE_OAUTH_AUTHORIZE_URL = "https://connect.stripe.com/oauth/authorize";
const MONTHS_OF_HISTORY = 6;
export const PLATFORM_ACCOUNT_SENTINEL = "platform";

/**
 * Builds the Stripe Connect (Standard) OAuth authorize URL. Whether this
 * connects real or test-mode accounts follows STRIPE_SECRET_KEY/
 * STRIPE_CLIENT_ID's own mode — there is no separate toggle here.
 * `state` is the signed user id so the callback can't be forged into
 * attaching a Stripe account to the wrong user.
 */
export function buildStripeConnectUrl(userId: string, appUrl: string): string {
  const clientId = process.env.STRIPE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "STRIPE_CLIENT_ID is not configured — register a Connect platform in test mode first.",
    );
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    // Stripe now requires manual support approval for "read_only" OAuth
    // connections. ASCEND only ever reads charge history (never writes to
    // a connected account) but must request "read_write" for self-serve
    // access — the extra permission is simply never exercised in code.
    scope: "read_write",
    redirect_uri: `${appUrl}/api/stripe/callback`,
    state: userId,
  });
  return `${STRIPE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Reads the platform's OWN Stripe account revenue directly, for the
 * platform's co-founders — who legitimately can't use the normal OAuth
 * Connect flow because their "business" revenue IS the platform's
 * revenue, and Stripe refuses to let a platform authorize itself as one
 * of its own connected accounts. Restricted to profiles.is_cofounder;
 * callers must still check that themselves (this doesn't re-check it),
 * since it acts on the platform's real financial data.
 */
export async function connectPlatformRevenueForCofounder(userId: string) {
  const supabase = await createClient();
  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: "stripe",
        status: "connected",
        // Sentinel, not a real Stripe account id — it tells the resync
        // route to omit the `stripeAccount` header entirely rather than
        // treat the platform as a connected account of itself.
        external_account_id: PLATFORM_ACCOUNT_SENTINEL,
        is_test_mode: isStripeTestKey(process.env.STRIPE_SECRET_KEY),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();

  if (error || !source) {
    throw new Error(error?.message ?? "Could not save the Stripe connection.");
  }

  await supabase.from("verifications").upsert(
    {
      revenue_source_id: source.id,
      status: "unverified",
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: "revenue_source_id" },
  );

  return syncStripeRevenue(userId, source.id, null);
}

export async function handleStripeOAuthCallback(code: string, userId: string) {
  const stripe = getStripe();

  const tokenResponse = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });

  const stripeAccountId = tokenResponse.stripe_user_id;
  if (!stripeAccountId) {
    throw new Error("Stripe did not return a connected account id.");
  }

  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: "stripe",
        status: "connected",
        external_account_id: stripeAccountId,
        is_test_mode: isStripeTestKey(process.env.STRIPE_SECRET_KEY),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();

  if (error || !source) {
    throw new Error(error?.message ?? "Could not save the Stripe connection.");
  }

  await supabase.from("verifications").upsert(
    {
      revenue_source_id: source.id,
      status: "unverified",
      last_checked_at: new Date().toISOString(),
    },
    { onConflict: "revenue_source_id" },
  );

  const syncResult = await syncStripeRevenue(userId, source.id, stripeAccountId);

  return { source, syncResult };
}

/**
 * Pulls succeeded charges for the connected account, aggregates them into
 * normalized monthly revenue snapshots, and marks the source verified
 * only once real data was actually retrieved successfully.
 */
export async function syncStripeRevenue(
  userId: string,
  revenueSourceId: string,
  /** null means "the platform's own Stripe account" (cofounder direct sync) rather than a connected account. */
  stripeAccountId: string | null,
) {
  const stripe = getStripe();
  const supabase = await createClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - MONTHS_OF_HISTORY);

  try {
    const monthlyTotals = new Map<string, number>();
    const monthlyTransactionCounts = new Map<string, number>();
    const monthlyCustomers = new Map<string, Set<string>>();
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const charges: Awaited<ReturnType<typeof stripe.charges.list>> = await stripe.charges.list(
        {
          limit: 100,
          created: { gte: Math.floor(sinceDate.getTime() / 1000) },
          starting_after: startingAfter,
        },
        stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
      );

      for (const charge of charges.data) {
        if (charge.status !== "succeeded" || charge.refunded) continue;
        const period = periodKeyFromUnixSeconds(charge.created);
        monthlyTotals.set(period, (monthlyTotals.get(period) ?? 0) + charge.amount);
        monthlyTransactionCounts.set(period, (monthlyTransactionCounts.get(period) ?? 0) + 1);

        const customerId = typeof charge.customer === "string" ? charge.customer : null;
        if (customerId) {
          if (!monthlyCustomers.has(period)) monthlyCustomers.set(period, new Set());
          monthlyCustomers.get(period)!.add(customerId);
        }
      }

      hasMore = charges.has_more;
      startingAfter = charges.data.at(-1)?.id;
    }

    for (const [period, amountCents] of monthlyTotals.entries()) {
      await upsertMonthlyRevenue({
        userId,
        revenueSourceId,
        period,
        amountCents,
        currency: "EUR",
        isVerified: true,
        transactionCount: monthlyTransactionCounts.get(period) ?? 0,
        customerCount: monthlyCustomers.get(period)?.size ?? 0,
      });
    }

    // A successful API call with zero charges isn't a verified account —
    // it just means there's nothing to verify yet. Keep it "unverified"
    // (not "error": nothing went wrong, Stripe just has no data) so the
    // account can pick up a real verification the next time it's synced.
    const hasVerifiableRevenue = monthlyTotals.size > 0;

    await supabase
      .from("verifications")
      .update({
        status: hasVerifiableRevenue ? "verified" : "unverified",
        verified_at: hasVerifiableRevenue ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
        error_message: hasVerifiableRevenue
          ? null
          : "Aucune transaction trouvée sur les 6 derniers mois.",
      })
      .eq("revenue_source_id", revenueSourceId);

    await supabase
      .from("revenue_sources")
      .update({ last_synced_at: new Date().toISOString(), status: "connected" })
      .eq("id", revenueSourceId);

    await refreshRevenueVerifiedFlag(userId);

    if (!hasVerifiableRevenue) {
      return {
        success: true as const,
        monthsSynced: 0,
        isFirstVerification: false,
        currentRevenueCents: null,
        rank: null,
        milestoneCents: null,
      };
    }

    const { current, previous } = await getCurrentRevenue(userId);
    let rank: number | null = null;
    let milestoneCents: number | null = null;

    if (current) {
      const growth = calculateMonthlyGrowth(current.amountCents, previous?.amountCents ?? null);
      await evaluateRevenueAchievements(userId, current.amountCents);
      await evaluateChallengeProgress(userId, current.amountCents, growth);

      const rankResult = await getUserRank(userId, "global", "");
      if (rankResult) {
        rank = rankResult.rank;
        await evaluateRankAchievements(userId, rankResult.rank);
      }
      milestoneCents = nextRevenueMilestone(current.amountCents).targetCents;

      const profile = await getProfile(userId);
      await evaluateEarnedTitles(userId, {
        revenueCents: current.amountCents,
        growthPercent: growth,
        globalRank: rank,
        foundingMemberNumber: profile?.foundingMemberNumber ?? null,
        isVerified: true,
      });
    }

    if (!wasAlreadyVerified) {
      await createNotification({
        userId,
        type: "verification_completed",
        title: "Revenus vérifiés",
        body: "Ton activité est désormais vérifiée sur ASCEND.",
      });
    }

    return {
      success: true as const,
      monthsSynced: monthlyTotals.size,
      isFirstVerification: !wasAlreadyVerified,
      currentRevenueCents: current?.amountCents ?? null,
      rank,
      milestoneCents,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error.";
    await supabase
      .from("verifications")
      .update({ status: "error", error_message: message, last_checked_at: new Date().toISOString() })
      .eq("revenue_source_id", revenueSourceId);
    return { success: false as const, error: message };
  }
}

export async function disconnectStripeSource(userId: string, revenueSourceId: string) {
  const supabase = await createClient();

  await supabase
    .from("revenue_sources")
    .update({ status: "disconnected" })
    .eq("id", revenueSourceId)
    .eq("user_id", userId);

  await supabase
    .from("verifications")
    .update({ status: "disconnected", last_checked_at: new Date().toISOString() })
    .eq("revenue_source_id", revenueSourceId);
}

function periodKeyFromUnixSeconds(seconds: number): string {
  const d = new Date(seconds * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
