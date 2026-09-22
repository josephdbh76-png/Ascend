import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPriceId, intervalForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantPurchasedTitle } from "@/services/title.service";
import { recordInfluencerCommissionIfApplicable } from "@/services/influencer.service";
import { finalizeListingSale } from "@/services/marketplace.service";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ["discounts"],
          });
          await syncSubscriptionFromStripe(subscription);
          await recordInfluencerCommissionIfApplicable(session, subscription);
        } else if (session.mode === "payment" && session.metadata?.kind === "title_purchase") {
          const { user_id: userId, title_id: titleId } = session.metadata;
          if (userId && titleId) await grantPurchasedTitle(userId, titleId);
        } else if (session.mode === "payment" && session.metadata?.kind === "title_listing_purchase") {
          await finalizeListingSale(session);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error processing webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
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

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({
      tier: status === "canceled" ? "free" : tier,
      status,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
      billing_interval: interval,
      // trial_used is set once and never reset back to false — a
      // downgrade or cancellation must never make the trial available
      // again for the same member.
      ...(isTrialing ? { trial_used: true, trial_ends_at: new Date(subscription.trial_end! * 1000).toISOString() } : {}),
    })
    .eq("user_id", userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ tier: "free", status: "canceled", current_period_end: null })
    .eq("user_id", userId);
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
