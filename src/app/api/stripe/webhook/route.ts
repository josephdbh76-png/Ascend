import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPriceId, intervalForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantPurchasedTitle } from "@/services/title.service";
import { recordInfluencerCommissionForInvoice } from "@/services/influencer.service";
import { finalizeListingSale } from "@/services/marketplace.service";
import { refundCheckoutSession } from "@/services/refund.service";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Any throw below returns 500, so Stripe retries the event instead of
  // considering it delivered while the database never recorded it.
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subId === "string" ? subId : subId?.id;
        // Every paid invoice, the first one included (a subscription checkout
        // pays through its first invoice), so commissions are recorded here only.
        if (subscriptionId && invoice.id && invoice.amount_paid > 0) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["discounts"] });
          await recordInfluencerCommissionForInvoice(subscription, {
            id: invoice.id,
            amountPaidCents: invoice.amount_paid,
            currency: invoice.currency,
            createdAt: new Date(invoice.created * 1000),
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        // Re-read the live subscription: events can arrive out of order,
        // and the payload of an older event must never overwrite newer state.
        const sub = event.data.object as Stripe.Subscription;
        const fresh = await stripe.subscriptions.retrieve(sub.id).catch(() => sub);
        await syncSubscriptionFromStripe(fresh);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error processing webhook.";
    console.error(`Stripe webhook ${event.type} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const stripe = getStripe();

  if (session.mode === "subscription" && typeof session.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await syncSubscriptionFromStripe(subscription);
    return;
  }

  // One-off payments: wait for the money. Delayed methods fire
  // checkout.session.completed as "unpaid", then async_payment_succeeded.
  if (session.mode !== "payment" || session.payment_status !== "paid") return;

  if (session.metadata?.kind === "title_purchase") {
    const { user_id: userId, title_id: titleId } = session.metadata;
    if (!userId || !titleId) return;
    const granted = await grantPurchasedTitle(userId, titleId);
    if (!granted) {
      await refundCheckoutSession(session, {
        userId,
        reason: "Ce titre s'est épuisé pendant ton paiement. Tu as été remboursé intégralement.",
      });
    }
  } else if (session.metadata?.kind === "title_listing_purchase") {
    const outcome = await finalizeListingSale(session);
    if (outcome === "unavailable" && session.metadata.buyer_id) {
      await refundCheckoutSession(session, {
        userId: session.metadata.buyer_id,
        reason: "Cette annonce a été vendue ou retirée juste avant ton paiement. Tu as été remboursé intégralement.",
        connect: true,
      });
    }
  }
}

async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const item = subscription.items.data[0];
  const tier = item ? tierForPriceId(item.price.id) : null;
  if (!tier) return;

  const status = mapStripeStatus(subscription.status);
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;
  const interval = item ? intervalForPriceId(item.price.id) : null;
  const isTrialing = subscription.status === "trialing";
  // "incomplete" = the first payment never went through: no access yet.
  const grantsAccess = status !== "canceled" && subscription.status !== "incomplete";

  const admin = createAdminClient();
  if (!grantsAccess) {
    // An old, replaced subscription ending must not downgrade the current one.
    const { data: row } = await admin.from("subscriptions").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
    if (row?.stripe_subscription_id && row.stripe_subscription_id !== subscription.id) return;
  }
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      tier: grantsAccess ? tier : "free",
      status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      current_period_end: status === "canceled" ? null : currentPeriodEnd,
      billing_interval: interval,
      // trial_used is set once and never reset back to false — a
      // downgrade or cancellation must never make the trial available
      // again for the same member.
      ...(isTrialing && subscription.trial_end
        ? { trial_used: true, trial_ends_at: new Date(subscription.trial_end * 1000).toISOString() }
        : {}),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
}

function mapStripeStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      return "canceled";
  }
}
