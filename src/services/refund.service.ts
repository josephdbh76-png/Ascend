import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendFromAddress, resendReplyTo } from "@/lib/resend";
import { renderEmailHtml } from "@/lib/emailRender";
import { getAppUrl } from "@/lib/utils";

/**
 * Full refund of a paid one-off Checkout Session the platform couldn't
 * honour (item gone between checkout and payment). Idempotent per session,
 * so a redelivered webhook never refunds twice.
 */
export async function refundCheckoutSession(
  session: Stripe.Checkout.Session,
  { userId, reason, connect = false }: { userId: string; reason: string; connect?: boolean },
): Promise<void> {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) throw new Error(`Session ${session.id} has no payment intent to refund.`);

  const stripe = getStripe();
  await stripe.refunds.create(
    {
      payment_intent: paymentIntent,
      reason: "requested_by_customer",
      // Destination charges: pull the seller's share and our fee back too.
      ...(connect ? { reverse_transfer: true, refund_application_fee: true } : {}),
      metadata: { reason: "item_unavailable", checkout_session: session.id },
    },
    { idempotencyKey: `refund-unavailable-${session.id}` },
  );

  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    type: "payment_refunded",
    title: "Paiement remboursé",
    body: reason,
    metadata: { checkout_session: session.id },
  });

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) return;
  try {
    await getResend().emails.send({
      from: resendFromAddress(),
      replyTo: resendReplyTo(),
      to: email,
      subject: "Ton paiement ASCEND a été remboursé",
      html: renderEmailHtml(
        `Salut,\n\n${reason}\n\nLe remboursement apparaît sur ton moyen de paiement sous 5 à 10 jours ouvrés, selon ta banque.`,
        { ctaLabel: "Voir les titres", ctaUrl: `${getAppUrl()}/app/titles` },
      ),
    });
  } catch (err) {
    console.error("Refund email failed:", err);
  }
}
