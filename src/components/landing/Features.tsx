import { ShieldCheck, Trophy, Flag, Award, Users, Compass } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

const FEATURES = [
  { icon: ShieldCheck, title: "Profil vérifié", description: "Des revenus vérifiés directement depuis tes sources connectées — pas des captures d'écran." },
  { icon: Trophy, title: "Classement", description: "Classements mondial, pays et catégorie, mis à jour à partir de données réelles." },
  { icon: Flag, title: "Défis mensuels", description: "Des défis saisonniers qui récompensent la régularité et la croissance." },
  { icon: Award, title: "Récompenses", description: "Des accomplissements collectibles qui retracent ton parcours." },
  { icon: Users, title: "Réseau d'entrepreneurs", description: "Bientôt disponible — connecte-toi avec des fondateurs à ton niveau." },
  { icon: Compass, title: "Opportunités", description: "Bientôt disponible — découvre des opportunités issues du réseau." },
];

export function Features() {
  return (
    <section id="produit" className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Tout ce qu&apos;il te faut pour aller plus loin.
          </h2>
        </Reveal>
        <RevealGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <RevealItem
              key={f.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/10 transition-transform duration-200 group-hover:scale-110">
                <f.icon className="h-4 w-4 text-gold" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{f.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
