import { Link2, ShieldCheck, Trophy, Rocket } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const STEPS = [
  { number: "01", title: "Connecte", description: "Connecte ton entreprise via Stripe, ou déclare tes revenus manuellement.", icon: Link2 },
  { number: "02", title: "Vérifie", description: "Tes performances sont vérifiées à partir de données réelles.", icon: ShieldCheck },
  { number: "03", title: "Grimpe", description: "Monte dans les classements mondial, pays et catégorie.", icon: Trophy },
  { number: "04", title: "Progresse", description: "Construis ta réputation et partage ton profil.", icon: Rocket },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="flex items-center gap-3">
          <span className="h-px w-8 bg-gold" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le mécanisme</span>
        </Reveal>
        <Reveal as="h2" delay={0.05} className="mt-5 max-w-xl font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
          Comment fonctionne ASCEND
        </Reveal>

        <div className="hairline mt-14" />
        <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {STEPS.map((step, i) => (
            <RevealItem
              key={step.number}
              className={`relative py-8 pr-6 ${i > 0 ? "lg:border-l lg:border-border lg:pl-8" : ""}`}
            >
              <span className="font-display text-5xl font-medium text-border-strong tabular-nums">{step.number}</span>
              <div className="mt-4 flex items-center gap-2">
                <step.icon className="h-4 w-4 text-gold" />
                <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="hairline" />
      </div>
    </section>
  );
}
