import { Users, Compass, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const FOUNDERS = [
  { initials: "TM", name: "Thomas M.", business: "SaaS B2B", verified: true },
  { initials: "SR", name: "Sofia R.", business: "E-commerce", verified: true },
  { initials: "LM", name: "Lucas M.", business: "Agence growth", verified: true },
];

const OPPORTUNITIES = [
  { type: "Cofondateur", title: "Cherche CTO pour SaaS B2B en croissance", match: 92 },
  { type: "Freelance", title: "Développeur React pour mission 3 mois", match: 87 },
  { type: "Partenaire", title: "Growth partner pour lancement e-commerce", match: 78 },
];

export function CommunityPreview() {
  return (
    <section id="communaute" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">La communauté</span>
          <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
            Les bonnes personnes accélèrent les bons projets.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-text-secondary">
            Réseau et Opportunités sont réservés aux membres Elite — recherche des fondateurs de ton
            secteur et trouve les bonnes collaborations, avec un matching pensé pour ton activité.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-px bg-border lg:grid-cols-2">
          <RevealGroup className="flex flex-col gap-3 bg-bg-primary p-7">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Users className="h-4 w-4 text-gold" /> Réseau
              </h3>
              <Badge variant="gold">Elite</Badge>
            </div>
            {FOUNDERS.map((f) => (
              <RevealItem
                key={f.name}
                className="flex items-center gap-3 border border-border p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-strong font-mono text-xs font-medium text-gold">
                  {f.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{f.name}</p>
                  <p className="truncate font-mono text-[11px] text-text-muted">{f.business}</p>
                </div>
                {f.verified && (
                  <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Vérifié
                  </span>
                )}
              </RevealItem>
            ))}
          </RevealGroup>

          <RevealGroup className="flex flex-col gap-3 bg-bg-primary p-7">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Compass className="h-4 w-4 text-gold" /> Opportunités
              </h3>
              <Badge variant="gold">Elite</Badge>
            </div>
            {OPPORTUNITIES.map((o) => (
              <RevealItem
                key={o.title}
                className="flex flex-col gap-1.5 border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="neutral">{o.type}</Badge>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-gold">
                    <Sparkles className="h-3 w-3" /> {o.match}% compatible
                  </span>
                </div>
                <p className="text-sm text-text-primary">{o.title}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal as="div" delay={0.15} className="mt-10 text-center">
          <Button href="/signup" variant="secondary">
            Rejoindre ASCEND
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
