import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <Reveal as="div" className="mx-auto max-w-[1240px] px-4 py-28 text-center sm:px-6 lg:px-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">Ta place t&apos;attend</span>
        <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight text-text-primary sm:text-5xl">
          Prêt à voir jusqu&apos;où tu peux <em className="italic text-gold">monter</em> ?
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-text-secondary">
          Crée ton profil. Vérifie tes performances. Découvre ta place.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="/signup" size="lg">
            Rejoindre ASCEND <ArrowRight className="h-4 w-4" />
          </Button>
          <a
            href="#classement"
            className="group inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Explorer le classement
            <span className="h-px w-5 bg-text-muted transition-all duration-200 group-hover:w-8 group-hover:bg-gold" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
