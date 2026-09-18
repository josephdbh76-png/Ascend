"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency } from "@/lib/utils";
import { PLANS, ELITE_TRIAL_DAYS, annualSavingsPercent, annualMonthlyEquivalentCents } from "@/lib/pricing";
import type { PlanDefinition } from "@/lib/pricing";

export function PricingPlans({
  currentTier,
  trialEligible,
  loggedIn,
  className,
  compact,
}: {
  /** Only passed in Réglages — highlights the member's current plan and disables its button. */
  currentTier?: PlanDefinition["tier"];
  /** Whether to offer the Elite trial CTA — always true for signed-out visitors (eligibility is re-checked at checkout regardless). */
  trialEligible: boolean;
  /** Server Components can't pass functions as props (RSC boundary) — the two contexts (landing vs. Réglages) only ever differ in whether the visitor is signed in, so that's all that needs to cross the boundary. */
  loggedIn: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  function ctaHref(tier: PlanDefinition["tier"], interval: "month" | "year", trial?: boolean): string {
    if (tier === "free") return "/signup";
    if (loggedIn) {
      const params = new URLSearchParams({ tier, interval });
      if (trial) params.set("trial", "1");
      return `/api/stripe/checkout?${params}`;
    }
    const params = new URLSearchParams({ plan: tier, interval });
    if (trial) params.set("trial", "1");
    return `/signup?${params}`;
  }

  return (
    <div className={className}>
      <div className="mx-auto flex w-fit items-center gap-1 border border-border bg-card p-1">
        <button
          onClick={() => setInterval("month")}
          className={cn(
            "px-3.5 py-1.5 text-sm font-medium transition-colors",
            interval === "month" ? "bg-card-active text-gold" : "text-text-secondary hover:text-text-primary",
          )}
        >
          Mensuel
        </button>
        <button
          onClick={() => setInterval("year")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors",
            interval === "year" ? "bg-card-active text-gold" : "text-text-secondary hover:text-text-primary",
          )}
        >
          Annuel
          <Badge variant="gold" className="text-[9px]">
            -{annualSavingsPercent(PLANS[2].monthlyCents, PLANS[2].annualCents!)}%
          </Badge>
        </button>
      </div>

      <div
        className={cn(
          "mx-auto mt-8 grid grid-cols-1 gap-6",
          compact ? "sm:grid-cols-3" : "max-w-4xl sm:grid-cols-3",
        )}
      >
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const priceCents = interval === "year" && plan.annualCents != null ? plan.annualCents : plan.monthlyCents;
          const showTrialCta = plan.tier === "elite" && trialEligible && !isCurrent;

          return (
            <div
              key={plan.tier}
              className={cn(
                "relative flex flex-col border p-6 transition-colors duration-200",
                isCurrent
                  ? "border-gold/50 bg-gold/5"
                  : plan.highlighted
                    ? "border-gold/40 bg-card"
                    : "border-border bg-card hover:border-border-strong",
              )}
            >
              {plan.highlighted && <div className="hairline-gold absolute inset-x-0 top-0" />}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">{plan.name}</span>
                {isCurrent ? (
                  <Badge variant="gold">Actuel</Badge>
                ) : (
                  plan.highlighted && <Badge variant="gold">Populaire</Badge>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-medium text-text-primary">{formatCurrency(priceCents)}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-text-muted">
                {plan.tier === "free"
                  ? "Pour toujours"
                  : interval === "year"
                    ? `par an — soit ${formatCurrency(annualMonthlyEquivalentCents(plan.annualCents!))}/mois`
                    : "par mois"}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                {isCurrent ? (
                  <Button variant="secondary" disabled>
                    Formule actuelle
                  </Button>
                ) : (
                  <>
                    <Button
                      href={ctaHref(plan.tier, interval, showTrialCta)}
                      variant={plan.highlighted ? "primary" : "secondary"}
                    >
                      {plan.tier === "free" ? "Rejoindre ASCEND" : showTrialCta ? `Essayer ${ELITE_TRIAL_DAYS} jours` : `Passer ${plan.name.charAt(0)}${plan.name.slice(1).toLowerCase()}`}
                    </Button>
                    {showTrialCta && (
                      <p className="flex items-center gap-1 text-[11px] text-text-muted">
                        <Sparkles className="h-3 w-3 text-gold" /> Carte requise, résiliable avant la fin de l&apos;essai.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
