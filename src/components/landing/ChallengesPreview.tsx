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
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Le rythme</span>
          <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
            Chaque mois, une nouvelle raison de progresser.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-text-secondary">
            Des défis saisonniers, façon compétition d&apos;élite, qui récompensent la régularité, la
            croissance et les premières fois — jamais les métriques de vanité.
          </p>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-1 border-t border-l border-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CHALLENGES.map((c) => {
            const isComingSoon = c.type === "coming_soon";
            return (
              <RevealItem
                key={c.id}
                className={`border-r border-b border-border p-7 ${isComingSoon ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-text-primary">{c.title}</h3>
                  <Badge variant={isComingSoon ? "neutral" : "gold"}>
                    {isComingSoon ? "Bientôt" : "Actif"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{c.description}</p>
                {!isComingSoon && <ProgressBar percent={DEMO_PROGRESS[c.id]} className="mt-5" />}
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
