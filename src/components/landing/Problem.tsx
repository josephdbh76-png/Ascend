import { ShieldAlert, PieChart, BadgeCheck } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const CARDS = [
  {
    icon: ShieldAlert,
    title: "N'importe qui peut prétendre",
    description: "Sans vérification, une capture d'écran de revenus ne prouve rien.",
  },
  {
    icon: PieChart,
    title: "Des données éparpillées",
    description: "Ta performance vit entre Stripe, Shopify, des tableurs et des rapports privés.",
  },
  {
    icon: BadgeCheck,
    title: "Aucune couche de réputation",
    description: "Tes accomplissements sont difficiles à prouver, comparer et partager.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Ton entreprise a des chiffres. Ta réputation devrait les refléter.
          </h2>
          <p className="mt-4 text-base text-text-secondary">
            Ta performance est éparpillée entre Stripe, Shopify, des tableurs, des dashboards
            d&apos;analyse, des rapports privés et les réseaux sociaux. ASCEND réunit performance et
            identité entrepreneuriale au même endroit.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <RevealItem key={card.title} className="rounded-lg border border-border bg-card p-6">
              <card.icon className="h-5 w-5 text-gold" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-text-primary">
                {card.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{card.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
