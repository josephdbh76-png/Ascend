import { Gem, Medal, Flame, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { formatCurrency } from "@/lib/utils";

const TITLES = [
  { icon: Gem, name: "Membre fondateur", note: "500 exemplaires", exclusive: false },
  { icon: Medal, name: "Top 100", note: "Classement", exclusive: false },
  { icon: Flame, name: "Growth Machine", note: "+30 % de croissance", exclusive: false },
  { icon: Crown, name: "The Business Man", note: "1 exemplaire", exclusive: true },
];

export function TitlesPreview() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Ton profil mérite un statut.
          </h2>
          <p className="mt-4 text-sm text-text-secondary">
            Certains titres se débloquent en progressant. D&apos;autres sont extrêmement limités — un
            seul entrepreneur au monde pourra les porter.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4" stagger={0.08}>
          {TITLES.map((t) => (
            <RevealItem
              key={t.name}
              className={`flex flex-col items-center gap-3 rounded-lg border p-6 text-center ${
                t.exclusive ? "border-gold/40" : "border-border bg-card"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-card-elevated">
                <t.icon className={`h-4 w-4 ${t.exclusive ? "text-gold" : "text-text-secondary"}`} />
              </div>
              <span className="text-sm font-medium uppercase tracking-tight text-text-primary">{t.name}</span>
              <span className="text-[11px] text-text-muted">
                {t.note}
                {t.exclusive && ` · ${formatCurrency(50000)}`}
              </span>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal as="div" delay={0.15} className="mt-10 text-center">
          <Button href="/signup" variant="secondary">
            Découvrir les titres
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
