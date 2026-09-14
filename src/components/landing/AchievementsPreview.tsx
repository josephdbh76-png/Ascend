import { Award, Trophy, Flame } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const ACHIEVEMENTS = [
  { icon: Award, name: "10K mensuels", rarity: "rare" },
  { icon: Award, name: "100K mensuels", rarity: "légendaire" },
  { icon: Trophy, name: "Top 10", rarity: "légendaire" },
  { icon: Flame, name: "Growth Champion", rarity: "épique" },
];

export function AchievementsPreview() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal as="div">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              Les résultats méritent d&apos;être reconnus.
            </h2>
            <p className="mt-4 text-sm text-text-secondary">
              Les accomplissements retracent ta progression au quotidien. Les trophées sont rares —
              réservés au classement, à la croissance et au prestige de saison. Les deux se gagnent,
              jamais ne s&apos;achètent.
            </p>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 gap-4" stagger={0.12}>
            {ACHIEVEMENTS.map((a) => (
              <RevealItem
                key={a.name}
                className="flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-gradient-to-b from-gold/10 to-card p-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-card-elevated">
                  <a.icon className="h-5 w-5 text-gold" />
                </div>
                <span className="text-sm font-medium text-text-primary">{a.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">{a.rarity}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
