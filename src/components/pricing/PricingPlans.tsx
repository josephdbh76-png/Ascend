"use client";

import { useState } from "react";
import { Check, Sparkles, ShieldCheck, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency } from "@/lib/utils";
import { PLANS, ELITE_TRIAL_DAYS, annualSavingsPercent, annualMonthlyEquivalentCents } from "@/lib/pricing";
import type { PlanDefinition } from "@/lib/pricing";
import { BETA_COPY } from "@/lib/beta";

export function PricingPlans({
  currentTier,
  trialEligible,
  loggedIn,
  className,
  compact,
  beta = false,
}: {
  /** Only passed in Réglages — highlights the member's current plan and disables its button. */
  currentTier?: PlanDefinition["tier"];
  /** Whether to offer the Elite trial CTA — always true for signed-out visitors (eligibility is re-checked at checkout regardless). */
  trialEligible: boolean;
  /** Server Components can't pass functions as props (RSC boundary) — the two contexts (landing vs. Réglages) only ever differ in whether the visitor is signed in, so that's all that needs to cross the boundary. */
  loggedIn: boolean;
  className?: string;
  compact?: boolean;
  /** Beta: Elite is offered and payments are closed — no checkout button. */
  beta?: boolean;
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
      {beta && (
        <div className="mx-auto mb-6 flex max-w-3xl items-start gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-left text-sm text-text-primary">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>{loggedIn ? BETA_COPY.subscriptions : BETA_COPY.landing}</p>
        </div>
      )}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-md border border-border bg-card p-1">
        <button
          onClick={() => setInterval("month")}
          className={cn(
            "rounded-sm px-3.5 py-1.5 text-sm font-medium transition-colors",
            interval === "month" ? "bg-card-active text-gold" : "text-text-secondary hover:text-text-primary",
          )}
        >
          Mensuel
        </button>
        <button
          onClick={() => setInterval("year")}
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-sm font-medium transition-colors",
            interval === "year" ? "bg-card-active text-gold" : "text-text-secondary hover:text-text-primary",
          )}
        >
          Annuel
          <Badge variant="gold" className="text-[9px]">
            jusqu&apos;à -{Math.max(...PLANS.filter((p) => p.annualCents != null).map((p) => annualSavingsPercent(p.monthlyCents, p.annualCents!)))}%
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
          const showTrialCta = !beta && plan.tier === "elite" && trialEligible && !isCurrent;

          return (
            <div
              key={plan.tier}
              className={cn(
                "flex flex-col rounded-lg border p-6 transition-all duration-200 ease-out hover:-translate-y-1",
                isCurrent
                  ? "border-gold/50 bg-gold/5"
                  : plan.highlighted
                    ? "border-gold/40 bg-card hover:shadow-[0_16px_40px_rgba(245,196,81,0.15)]"
                    : "border-border bg-card hover:border-border-strong hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{plan.name}</span>
                {beta && plan.tier === "elite" ? (
                  <Badge variant="gold" className="whitespace-nowrap">Offert en bêta</Badge>
                ) : isCurrent ? (
                  <Badge variant="gold">Actuel</Badge>
                ) : (
                  plan.highlighted && <Badge variant="gold">Recommandé</Badge>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-text-primary">{formatCurrency(priceCents)}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {plan.tier === "free"
                  ? "Pour toujours"
                  : interval === "year"
                    ? `par an, soit ${formatCurrency(annualMonthlyEquivalentCents(plan.annualCents!))}/mois`
                    : "par mois"}
              </p>
              {interval === "year" && plan.annualCents != null && (
                <p className="mt-1 text-xs font-medium text-success">
                  {Math.round(12 - plan.annualCents / plan.monthlyCents)} mois offerts
                </p>
              )}

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                {beta && plan.tier !== "free" ? (
                  loggedIn ? (
                    <>
                      <Button variant="secondary" disabled>
                        {plan.tier === "elite" ? "Inclus en bêta" : "Ouvre au lancement"}
                      </Button>
                      <p className="text-[11px] text-text-muted">Aucun paiement pendant la bêta.</p>
                    </>
                  ) : (
                    <Button href="/signup" variant={plan.highlighted ? "primary" : "secondary"}>
                      Rejoindre la bêta
                    </Button>
                  )
                ) : isCurrent ? (
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

      <p className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-center text-xs text-text-muted">
        {beta ? (
          <>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Aucune carte bancaire pendant la bêta
            </span>
            <span>Les tarifs ci-dessus s&apos;appliqueront au lancement officiel</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Paiement sécurisé par Stripe
            </span>
            <span>Sans engagement, résiliable en 2 clics</span>
            <span>Tarif bêta conservé tant que ton abonnement reste actif</span>
          </>
        )}
      </p>
    </div>
  );
}
