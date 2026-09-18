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
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <Reveal as="div">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">La reconnaissance</span>
            <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
              Chaque résultat compte.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">
              Les accomplissements retracent ta progression au quotidien. Ils sont réservés au
              classement, à la croissance et au prestige de saison. Ils se gagnent, jamais ne
              s&apos;achètent.
            </p>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 border-t border-l border-border" stagger={0.1}>
            {ACHIEVEMENTS.map((a) => (
              <RevealItem
                key={a.name}
                className="flex flex-col items-center gap-3 border-r border-b border-border p-8 text-center"
              >
                <a.icon className="h-5 w-5 text-gold" />
                <span className="text-sm font-medium text-text-primary">{a.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted">{a.rarity}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
