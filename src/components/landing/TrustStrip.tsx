import { Reveal } from "@/components/motion/Reveal";

const ITEMS = ["Revenus vérifiés", "Données sous ton contrôle", "Profil personnalisable", "Conçu pour les entrepreneurs"];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <Reveal className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 lg:justify-between">
          {ITEMS.map((label) => (
            <span
              key={label}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted"
            >
              {label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
