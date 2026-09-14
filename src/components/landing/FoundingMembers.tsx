import { Gem } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { FOUNDING_MEMBER_LIMIT } from "@/lib/constants";

export function FoundingMembers() {
  return (
    <section className="border-b border-border bg-bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal
          as="div"
          className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-lg border border-gold/30 bg-gradient-to-b from-gold/10 to-card p-10 text-center"
        >
          <Gem className="h-6 w-6 text-gold" />
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Membre fondateur
          </h2>
          <p className="max-w-md text-sm text-text-secondary">
            Les {FOUNDING_MEMBER_LIMIT} premiers membres à rejoindre ASCEND reçoivent un numéro de
            membre fondateur permanent et un trophée — la marque d&apos;avoir été là depuis le début.
          </p>
          <p className="font-mono text-xs text-gold">Membre fondateur #001 · #002 · #003 …</p>
          <Button href="/signup" className="mt-2">
            Réserve ton numéro
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
