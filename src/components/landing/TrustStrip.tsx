import Link from "next/link";
import { ShieldCheck, Lock, UserCog, Compass, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const ITEMS = [
  { icon: ShieldCheck, label: "Revenus vérifiés" },
  { icon: Lock, label: "Données sous ton contrôle" },
  { icon: UserCog, label: "Profil public personnalisable" },
  { icon: Compass, label: "Conçu pour les entrepreneurs" },
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <Reveal className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-2 text-center sm:justify-start">
              <item.icon className="h-4 w-4 shrink-0 text-gold" />
              <span className="text-xs font-medium text-text-secondary sm:text-sm">{item.label}</span>
            </div>
          ))}
        </div>
        <Link
          href="/verification"
          className="mt-4 flex items-center justify-center gap-1 text-xs font-medium text-gold hover:text-gold-light sm:justify-start"
        >
          Comment on vérifie chaque profil <ArrowRight className="h-3 w-3" />
        </Link>
      </Reveal>
    </section>
  );
}
