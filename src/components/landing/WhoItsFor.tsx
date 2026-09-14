import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const AUDIENCE = [
  { title: "Fondateurs SaaS", description: "Vérifie ton MRR et compare ta croissance à celle de tes pairs de catégorie." },
  { title: "E-commerçants", description: "Transforme tes revenus Stripe en un historique crédible et vérifié." },
  { title: "Consultants & agences solo", description: "Construis une réputation qui survit à chaque relation client." },
  { title: "Bâtisseurs ambitieux", description: "Tu suis déjà tes chiffres à l'obsession. Montre-les enfin." },
];

export function WhoItsFor() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="h2" className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Pour qui est ASCEND
        </Reveal>
        <RevealGroup className="mt-10 grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {AUDIENCE.map((a) => (
            <RevealItem key={a.title} className="px-2 py-6 sm:px-8">
              <h3 className="text-base font-semibold text-text-primary">{a.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{a.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
