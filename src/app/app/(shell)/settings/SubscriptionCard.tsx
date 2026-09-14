import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/types/database.types";

const PLANS: { tier: SubscriptionTier; name: string; price: string; features: string[] }[] = [
  { tier: "free", name: "Gratuit", price: "0 €", features: ["Profil", "Vérification", "Classement", "Défis", "Titres de base"] },
  { tier: "pro", name: "Pro", price: "19 €/mois", features: ["Analyses avancées", "Profil personnalisable", "Défis avancés"] },
  { tier: "elite", name: "Elite", price: "Bientôt", features: ["Réseau avancé", "Opportunités premium"] },
];

export function SubscriptionCard({ currentTier }: { currentTier: SubscriptionTier }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = plan.tier === currentTier;
        return (
          <div
            key={plan.tier}
            className={cn(
              "flex flex-col gap-3 rounded-md border p-4",
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
              <Button size="sm" variant="secondary" disabled className="mt-1">
                Bientôt disponible
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
