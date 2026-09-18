import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const ITEMS = [
  {
    number: "01",
    title: "N'importe qui peut prétendre",
    description: "Sans vérification, une capture d'écran de revenus ne prouve rien.",
  },
  {
    number: "02",
    title: "Des données éparpillées",
    description: "Ta performance vit entre Stripe, Shopify, des tableurs et des rapports privés.",
  },
  {
    number: "03",
    title: "Aucune couche de réputation",
    description: "Tes accomplissements sont difficiles à prouver, comparer et partager.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal as="div">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le constat</span>
            <h2 className="mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight text-text-primary sm:text-5xl">
              Ton entreprise a des chiffres. Ta réputation devrait les{" "}
              <em className="italic text-gold">refléter</em>.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-text-secondary">
              Ta performance est éparpillée entre Stripe, Shopify, des tableurs, des dashboards
              d&apos;analyse et les réseaux sociaux. ASCEND réunit performance et identité
              entrepreneuriale au même endroit.
            </p>
          </Reveal>

          <RevealGroup className="flex flex-col">
            {ITEMS.map((item, i) => (
              <RevealItem key={item.number}>
                {i > 0 && <div className="hairline" />}
                <div className="flex gap-6 py-7">
                  <span className="font-display text-3xl font-medium text-border-strong tabular-nums">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.description}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
