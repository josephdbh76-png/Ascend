import "server-only";
import { getStripe, isStripeTestKey } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  refreshRevenueVerifiedFlag,
  syncWindowStart,
  addToMonth,
  writeSourceMonths,
  type MonthTotal,
} from "@/services/revenue.service";
import { euroConverter } from "@/lib/fx";
import { createNotificationForUser } from "@/services/notification.service";
import { afterRevenueSync } from "@/services/progress.service";

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
  const supabase = createAdminClient();
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

  const supabase = createAdminClient();

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

/** Stripe customers and emails of the cofounders, whose own payments on the platform are tests. */
async function cofounderPayers() {
  const admin = createAdminClient();
  const { data: cofounders } = await admin.from("profiles").select("id").eq("is_cofounder", true);
  const ids = (cofounders ?? []).map((c) => c.id);
  const customers = new Set<string>();
  const emails = new Set<string>();
  if (ids.length === 0) return { customers, emails };
  const { data: subs } = await admin.from("subscriptions").select("stripe_customer_id").in("user_id", ids);
  for (const s of subs ?? []) if (s.stripe_customer_id) customers.add(s.stripe_customer_id);
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) emails.add(data.user.email.toLowerCase());
  }
  return { customers, emails };
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
  const supabase = createAdminClient();

  const { data: verificationBefore } = await supabase
    .from("verifications")
    .select("status")
    .eq("revenue_source_id", revenueSourceId)
    .maybeSingle();
  const wasAlreadyVerified = verificationBefore?.status === "verified";

  const sinceDate = syncWindowStart(MONTHS_OF_HISTORY);

  try {
    // Balance transactions rather than charges: they carry what was really
    // collected (partial refunds and disputes subtract) in the account's
    // settlement currency, whatever currency the customer paid in.
    const SALES = new Set(["charge", "payment"]);
    const COUNTED = new Set(["charge", "payment", "refund", "payment_refund", "payment_reversal", "payment_failure_refund", "refund_failure", "adjustment"]);
    let movements: {
      amount: number;
      currency: string;
      created: number;
      sale: boolean;
      customer: string | null;
      refundOf: string | null;
    }[] = [];
    // On the platform's own account, a cofounder's purchases are tests, not revenue.
    const ownPayers = stripeAccountId ? null : await cofounderPayers();
    const skippedCharges = new Set<string>();
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const page: Awaited<ReturnType<typeof stripe.balanceTransactions.list>> = await stripe.balanceTransactions.list(
        {
          limit: 100,
          created: { gte: Math.floor(sinceDate.getTime() / 1000) },
          starting_after: startingAfter,
          expand: ["data.source"],
        },
        stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
      );

      for (const bt of page.data) {
        if (!COUNTED.has(bt.type)) continue;
        // Only adjustments tied to a dispute (chargebacks and their reversals) affect revenue.
        if (bt.type === "adjustment" && !(bt.source && typeof bt.source === "object" && bt.source.object === "dispute")) continue;
        const source =
          bt.source && typeof bt.source === "object"
            ? (bt.source as {
                id?: string;
                customer?: unknown;
                charge?: unknown;
                receipt_email?: string | null;
                billing_details?: { email?: string | null };
              })
            : null;
        if (ownPayers && source) {
          const email = (source.billing_details?.email ?? source.receipt_email ?? "").toLowerCase();
          const fromCofounder =
            (typeof source.customer === "string" && ownPayers.customers.has(source.customer)) ||
            (email !== "" && ownPayers.emails.has(email));
          if (fromCofounder && source.id) {
            skippedCharges.add(source.id);
            continue;
          }
        }
        movements.push({
          refundOf: typeof source?.charge === "string" ? source.charge : null,
          amount: bt.amount,
          currency: bt.currency,
          created: bt.created,
          sale: SALES.has(bt.type),
          customer: typeof source?.customer === "string" ? source.customer : null,
        });
      }

      hasMore = page.has_more;
      startingAfter = page.data.at(-1)?.id;
    }

    // Newest first: a refund is listed before the charge it reverses.
    movements = movements.filter((m) => !m.refundOf || !skippedCharges.has(m.refundOf));

    const toEur = await euroConverter(
      movements.map((m) => m.currency),
      sinceDate,
    );
    const months = new Map<string, MonthTotal>();
    for (const m of movements) {
      const at = new Date(m.created * 1000);
      addToMonth(months, at, toEur(m.amount, m.currency, at), { countsAsSale: m.sale, customerId: m.customer });
    }
    const monthsWithRevenue = await writeSourceMonths(userId, revenueSourceId, months, sinceDate);

    // A successful API call with zero charges isn't a verified account —
    // it just means there's nothing to verify yet. Keep it "unverified"
    // (not "error": nothing went wrong, Stripe just has no data) so the
    // account can pick up a real verification the next time it's synced.
    const hasVerifiableRevenue = monthsWithRevenue > 0;

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

    const { currentRevenueCents, rank, milestoneCents } = await afterRevenueSync(userId);

    if (!wasAlreadyVerified) {
      await createNotificationForUser({
        userId,
        type: "verification_completed",
        title: "Revenus vérifiés",
        body: "Ton activité est désormais vérifiée sur ASCEND.",
      });
    }

    return {
      success: true as const,
      monthsSynced: monthsWithRevenue,
      isFirstVerification: !wasAlreadyVerified,
      currentRevenueCents,
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
  const supabase = createAdminClient();

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

