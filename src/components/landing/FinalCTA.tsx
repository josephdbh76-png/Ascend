import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCTA() {
  return (
    <section className="border-t border-border">
      <Reveal as="div" className="mx-auto max-w-[1200px] px-4 py-24 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Prêt à voir jusqu&apos;où tu peux monter ?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-text-secondary">
          Crée ton profil. Vérifie tes performances. Découvre ta place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/signup" size="lg">
            Rejoindre ASCEND <ArrowRight className="h-4 w-4" />
          </Button>
          <Button href="#classement" variant="secondary" size="lg">
            Explorer le classement
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
