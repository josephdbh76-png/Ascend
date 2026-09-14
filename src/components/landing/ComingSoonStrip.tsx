import { Users, Compass, Gauge } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const ITEMS = [
  {
    icon: Users,
    title: "Réseau d'entrepreneurs",
    description: "Découvre et connecte-toi avec des fondateurs de ton niveau, ta catégorie et ton stade.",
  },
  {
    icon: Compass,
    title: "Opportunités",
    description: "Associé, développeur, partenaire, growth, cofondateur — fais émerger les bonnes opportunités du réseau.",
  },
  {
    icon: Gauge,
    title: "ASCEND Score",
    description: "Un score de réputation unique combinant performance vérifiée, croissance et régularité.",
  },
];

export function ComingSoonStrip() {
  return (
    <section id="communaute" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Les bonnes personnes accélèrent les bons projets.
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            La base est posée pour ce qui arrive. Pas encore implémenté — mais déjà pensé pour.
          </p>
        </Reveal>
        <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ITEMS.map((item) => (
            <RevealItem key={item.title} className="rounded-lg border border-dashed border-border-strong p-6">
              <item.icon className="h-5 w-5 text-text-muted" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              <span className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Bientôt disponible
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
