import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(245,196,81,0.08),transparent)]" />
      <Reveal as="div" className="mx-auto max-w-[1440px] px-4 py-24 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Prêt à voir jusqu&apos;où tu peux monter ?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-text-secondary">
          Crée ton profil. Vérifie tes performances. Découvre ta place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/signup" size="lg">
            Rejoindre la bêta <ArrowRight className="h-4 w-4" />
          </Button>
          <Button href="#classement" variant="secondary" size="lg">
            Explorer le classement
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
