import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SubscriptionInfo } from "@/types";
import type { SubscriptionTier } from "@/types/database.types";

const PLANS: { tier: SubscriptionTier; name: string; price: string; features: string[] }[] = [
  {
    tier: "free",
    name: "Gratuit",
    price: "0 €",
    features: ["Profil", "Vérification", "Classement", "Défis", "Titres de base"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "19 €/mois",
    features: ["Analyses avancées", "Profil personnalisable (thèmes)", "Défis avancés"],
  },
  {
    tier: "elite",
    name: "Elite",
    price: "49 €/mois",
    features: ["Tout Pro", "Réseau de fondateurs", "Fil d'opportunités", "Support dédié"],
  },
];

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
  const { tier: currentTier, status, currentPeriodEnd, hasStripeCustomer } = subscription;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <div
              key={plan.tier}
              className={cn(
                "flex flex-col gap-3 rounded-md border p-4 transition-all duration-200 ease-out hover:-translate-y-0.5",
                isCurrent ? "border-gold/50 bg-gold/5" : "border-border-strong bg-card-elevated",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
                {isCurrent && <Badge variant="gold">Actuel</Badge>}
              </div>
              <span className="text-lg font-semibold text-text-primary">{plan.price}</span>
              <ul className="flex flex-col gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-text-secondary">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" /> {f}
                  </li>
                ))}
              </ul>
              {plan.tier !== "free" && !isCurrent && (
                <Button href={`/api/stripe/checkout?tier=${plan.tier}`} size="sm" className="mt-1">
                  Passer {plan.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {currentTier !== "free" && (
        <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-card-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
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
