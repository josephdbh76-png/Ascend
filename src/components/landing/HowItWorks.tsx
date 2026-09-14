import { Link2, ShieldCheck, Trophy, Rocket } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const STEPS = [
  { number: "01", title: "Connecte", description: "Connecte ton entreprise — Stripe pour commencer.", icon: Link2 },
  { number: "02", title: "Vérifie", description: "Tes performances sont vérifiées à partir de données réelles.", icon: ShieldCheck },
  { number: "03", title: "Grimpe", description: "Monte dans les classements mondial, pays et catégorie.", icon: Trophy },
  { number: "04", title: "Progresse", description: "Construis ta réputation et partage ton profil.", icon: Rocket },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Comment fonctionne ASCEND
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {STEPS.map((step, i) => (
            <RevealItem key={step.number} className="relative">
              <span className="text-5xl font-semibold text-border-strong tabular-nums">{step.number}</span>
              <div className="mt-3 flex items-center gap-2">
                <step.icon className="h-4 w-4 text-gold" />
                <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{step.description}</p>
              {i < STEPS.length - 1 && (
                <div className="absolute right-[-1rem] top-6 hidden h-px w-8 bg-border-strong lg:block" />
              )}
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
