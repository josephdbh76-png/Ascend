import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "GRATUIT",
    price: "0 €",
    note: "Pendant la bêta",
    features: ["Profil", "Vérification", "Classement", "Accomplissements", "Défis", "Réseau de base"],
    cta: "Rejoindre ASCEND",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "PRO",
    price: "19 €",
    note: "par mois · Bientôt disponible",
    features: ["Tout Gratuit", "Analyses avancées", "Vérification prioritaire", "Thèmes de profil personnalisés"],
    cta: "Bientôt disponible",
    disabled: true,
  },
  {
    name: "ELITE",
    price: "49 €",
    note: "par mois · Bientôt disponible",
    features: ["Tout Pro", "Accès au réseau de fondateurs", "Fil d'opportunités", "Support dédié"],
    cta: "Bientôt disponible",
    disabled: true,
  },
];

export function Pricing() {
  return (
    <section id="tarifs" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Des tarifs simples, gratuit pendant la bêta
          </h2>
        </Reveal>
        <RevealGroup className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <RevealItem
              key={plan.name}
              className={cn(
                "flex flex-col rounded-lg border p-6 transition-all duration-200 ease-out hover:-translate-y-1",
                plan.highlighted
                  ? "border-gold/40 bg-card hover:shadow-[0_16px_40px_rgba(245,196,81,0.15)]"
                  : "border-border bg-card hover:border-border-strong hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{plan.name}</span>
                {plan.highlighted && <Badge variant="gold">Bêta</Badge>}
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
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
