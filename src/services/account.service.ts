import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deletes a member for good. Any live Stripe subscription is cancelled
 * first: otherwise Stripe keeps charging someone who no longer exists here.
 * Throws with a member-readable message when the cancellation fails.
 */
export async function deleteMemberAccount(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (sub?.stripe_subscription_id) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      if (live.status !== "canceled" && live.status !== "incomplete_expired") {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      }
    } catch (err) {
      console.error("Subscription cancel on account deletion failed:", err);
      throw new Error(
        "Impossible de résilier l'abonnement pour le moment. Réessaie dans quelques minutes, ou résilie-le d'abord depuis Stripe.",
      );
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}
