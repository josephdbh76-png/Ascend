import { CHALLENGE_DEFINITIONS } from "@/lib/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

// A curated spread — from a founder's very first sale to established
// growth — rather than the full catalog, keyed by id so it stays correct
// as challenges are added or reordered.
const DEMO_PROGRESS: Record<string, number> = {
  "first-sale": 100,
  "first-10k-month": 72,
  "growth-30": 45,
  "consistency-30": 90,
};
const FEATURED_IDS = Object.keys(DEMO_PROGRESS);
const FEATURED_CHALLENGES = CHALLENGE_DEFINITIONS.filter((c) => FEATURED_IDS.includes(c.id));

export function ChallengesPreview() {
  return (
    <section id="defis" className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Chaque mois, une nouvelle raison de progresser.
          </h2>
          <p className="mt-4 text-sm text-text-secondary">
            Des défis saisonniers, façon compétition d&apos;élite, qui récompensent la régularité, la
            croissance et les premières fois — jamais les métriques de vanité.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CHALLENGES.map((c) => {
            const isComingSoon = c.type === "coming_soon";
            return (
              <RevealItem
                key={c.id}
                className={`rounded-lg border bg-card p-6 ${isComingSoon ? "opacity-60" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{c.title}</h3>
                  <Badge variant={isComingSoon ? "neutral" : "gold"}>
                    {isComingSoon ? "Bientôt disponible" : "Actif"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-text-secondary">{c.description}</p>
                {!isComingSoon && <ProgressBar percent={DEMO_PROGRESS[c.id]} className="mt-4" />}
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
