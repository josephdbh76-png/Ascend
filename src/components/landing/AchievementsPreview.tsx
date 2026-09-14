import { Award, Trophy, Flame } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const ACHIEVEMENTS = [
  { icon: Award, name: "10K mensuels", rarity: "rare" },
  { icon: Award, name: "100K mensuels", rarity: "légendaire" },
  { icon: Trophy, name: "Top 10", rarity: "légendaire" },
  { icon: Flame, name: "Growth Machine", rarity: "épique" },
];

export function AchievementsPreview() {
  return (
    <section id="recompenses" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal as="div">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Chaque résultat compte.
            </h2>
            <p className="mt-4 text-sm text-text-secondary">
              Les accomplissements retracent ta progression au quotidien. Ils sont réservés au
              classement, à la croissance et au prestige de saison. Ils se gagnent, jamais ne
              s&apos;achètent.
            </p>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 gap-3" stagger={0.1}>
            {ACHIEVEMENTS.map((a) => (
              <RevealItem
                key={a.name}
                className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-card-elevated">
                  <a.icon className="h-4 w-4 text-gold" />
                </div>
                <span className="text-sm font-medium text-text-primary">{a.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{a.rarity}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
