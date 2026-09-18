import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import type { SubscriptionInfo } from "@/types";

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
  const { tier: currentTier, status, currentPeriodEnd, hasStripeCustomer, trialUsed, trialEndsAt } = subscription;
  const isTrialing = trialEndsAt != null && new Date(trialEndsAt) > new Date();
  const trialEligible = !trialUsed;

  return (
    <div className="flex flex-col gap-4">
      {isTrialing && (
        <div className="flex items-center gap-2 border border-gold/30 bg-gold/5 px-3.5 py-2.5 text-sm text-gold">
          <Clock className="h-4 w-4 shrink-0" />
          Essai Elite en cours — se termine le {new Date(trialEndsAt!).toLocaleDateString("fr-FR")}, puis
          facturation automatique sauf annulation.
        </div>
      )}

      <PricingPlans currentTier={currentTier} trialEligible={trialEligible} loggedIn compact />

      {currentTier !== "free" && (
        <div className="flex flex-col gap-2 border border-border-strong bg-card-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            {status === "past_due"
              ? "Ton dernier paiement a échoué — mets à jour ton moyen de paiement pour garder tes avantages."
              : currentPeriodEnd
                ? `Renouvellement le ${new Date(currentPeriodEnd).toLocaleDateString("fr-FR")}.`
                : "Abonnement actif."}
          </p>
          {hasStripeCustomer && (
            <Button href="/api/stripe/portal" variant="secondary" size="sm" className="shrink-0">
              Gérer mon abonnement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
