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
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Les bonnes personnes accélèrent les bons projets.
          </h2>
          <p className="mt-4 text-sm text-text-secondary">
            Réseau et Opportunités sont réservés aux membres Elite — recherche des fondateurs de ton
            secteur et trouve les bonnes collaborations, avec un matching pensé pour ton activité.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevealGroup className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Users className="h-4 w-4 text-gold" /> Réseau
              </h3>
              <Badge variant="gold">Elite</Badge>
            </div>
            {FOUNDERS.map((f) => (
              <RevealItem
                key={f.name}
                className="flex items-center gap-3 rounded-md border border-border bg-card-elevated p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-active text-xs font-semibold text-gold">
                  {f.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{f.name}</p>
                  <p className="truncate text-xs text-text-muted">{f.business}</p>
                </div>
                {f.verified && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Vérifié
                  </span>
                )}
              </RevealItem>
            ))}
          </RevealGroup>

          <RevealGroup className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Compass className="h-4 w-4 text-gold" /> Opportunités
              </h3>
              <Badge variant="gold">Elite</Badge>
            </div>
            {OPPORTUNITIES.map((o) => (
              <RevealItem
                key={o.title}
                className="flex flex-col gap-1.5 rounded-md border border-border bg-card-elevated p-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="neutral">{o.type}</Badge>
                  <span className="flex items-center gap-1 text-xs font-medium text-gold">
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
