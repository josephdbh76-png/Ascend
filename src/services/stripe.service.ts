import "server-only";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { upsertMonthlyRevenue, getCurrentRevenue, calculateMonthlyGrowth, nextRevenueMilestone } from "@/services/revenue.service";
import { evaluateRevenueAchievements, evaluateRankAchievements } from "@/services/achievement.service";
import { evaluateChallengeProgress } from "@/services/challenge.service";
import { createNotification } from "@/services/notification.service";
import { getUserRank } from "@/services/leaderboard.service";
import { evaluateEarnedTitles } from "@/services/title.service";
import { getProfile } from "@/services/profile.service";

const STRIPE_OAUTH_AUTHORIZE_URL = "https://connect.stripe.com/oauth/authorize";
const MONTHS_OF_HISTORY = 6;

/**
 * Builds the Stripe Connect (Standard, test mode) OAuth authorize URL.
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
    scope: "read_only",
    redirect_uri: `${appUrl}/api/stripe/callback`,
    state: userId,
  });
  return `${STRIPE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
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
        is_test_mode: true,
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
 * Pulls succeeded charges for the connected test-mode account, aggregates
 * them into normalized monthly revenue snapshots, and marks the source
 * verified only once real data was actually retrieved successfully.
 */
export async function syncStripeRevenue(
  userId: string,
  revenueSourceId: string,
  stripeAccountId: string,
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
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const charges: Awaited<ReturnType<typeof stripe.charges.list>> = await stripe.charges.list(
        {
          limit: 100,
          created: { gte: Math.floor(sinceDate.getTime() / 1000) },
          starting_after: startingAfter,
        },
        { stripeAccount: stripeAccountId },
      );

      for (const charge of charges.data) {
        if (charge.status !== "succeeded" || charge.refunded) continue;
        const period = periodKeyFromUnixSeconds(charge.created);
        monthlyTotals.set(period, (monthlyTotals.get(period) ?? 0) + charge.amount);
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
      });
    }

    await supabase
      .from("verifications")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("revenue_source_id", revenueSourceId);

    await supabase
      .from("revenue_sources")
      .update({ last_synced_at: new Date().toISOString(), status: "connected" })
      .eq("id", revenueSourceId);

    await supabase.from("profiles").update({ revenue_verified: true }).eq("id", userId);

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
