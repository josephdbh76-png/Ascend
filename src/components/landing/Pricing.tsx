import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "FREE",
    price: "€0",
    note: "During beta",
    features: ["Profile", "Verification", "Leaderboard", "Achievements", "Challenges", "Basic networking"],
    cta: "Join the Beta",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "PRO",
    price: "€19",
    note: "per month · Coming Soon",
    features: ["Everything in Free", "Advanced analytics", "Priority verification", "Custom profile themes"],
    cta: "Coming Soon",
    disabled: true,
  },
  {
    name: "ELITE",
    price: "€49",
    note: "per month · Coming Soon",
    features: ["Everything in Pro", "Founder network access", "Opportunities feed", "Concierge support"],
    cta: "Coming Soon",
    disabled: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Simple pricing, free during beta
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-lg border p-6",
                plan.highlighted ? "border-gold/40 bg-gradient-to-b from-gold/5 to-card" : "border-border bg-card",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{plan.name}</span>
                {plan.highlighted && <Badge variant="gold">Beta</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-text-primary">{plan.price}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">{plan.note}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                href={plan.href}
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mt-6"
                disabled={plan.disabled}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
