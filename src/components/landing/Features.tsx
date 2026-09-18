import { ShieldCheck, Trophy, Flag, Award, Gem, Users, Compass } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Revenus vérifiés",
    description: "Vérifie tes revenus via Stripe, ou déclare-les manuellement avec preuve à l'appui — pas des captures d'écran.",
  },
  { icon: Trophy, title: "Classement", description: "Classements mondial, pays et catégorie, mis à jour à partir de données réelles." },
  { icon: Flag, title: "Défis", description: "De la première vente aux 10K€ mensuels — des défis pour chaque étape, pas seulement les plus avancés." },
  { icon: Award, title: "Accomplissements", description: "Des récompenses collectibles qui retracent ton parcours." },
  { icon: Gem, title: "Titres", description: "Débloque des titres selon tes performances, ou obtiens un titre exclusif en édition limitée." },
  {
    icon: Users,
    title: "Réseau d'entrepreneurs",
    description: "Recherche et connecte-toi avec des fondateurs de ton secteur, suis leur progression.",
    elite: true,
  },
  {
    icon: Compass,
    title: "Opportunités",
    description: "Cofondateur, développeur, partenaire — un matching intelligent te propose les meilleures offres du réseau.",
    elite: true,
  },
];

export function Features() {
  return (
    <section id="produit" className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <Reveal as="div" className="flex items-center gap-3">
          <span className="h-px w-8 bg-gold" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">L&apos;arsenal</span>
        </Reveal>
        <Reveal as="h2" delay={0.05} className="mt-5 max-w-xl font-display text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
          Tout ce qu&apos;il te faut pour aller plus loin.
        </Reveal>

        <RevealGroup className="mt-14 border-t border-border sm:grid sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <RevealItem
              key={f.title}
              className={cn(
                "group border-b border-border py-7 pr-6 transition-colors duration-200 sm:pr-10",
                i % 2 === 0 ? "sm:border-r sm:pl-0" : "sm:pl-10",
              )}
            >
              <div className="flex items-center justify-between">
                <f.icon className="h-5 w-5 text-gold transition-transform duration-200 group-hover:-translate-y-0.5" />
                {f.elite && <Badge variant="gold">Elite</Badge>}
              </div>
              <h3 className="mt-4 text-base font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
