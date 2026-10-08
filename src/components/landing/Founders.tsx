import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { initials } from "@/lib/utils";
import type { Cofounder } from "@/services/team.service";

/** The real team, with links to their real profiles: trust before the call to action. */
export function Founders({ cofounders }: { cofounders: Cofounder[] }) {
  if (cofounders.length === 0) return null;
  return (
    <section id="equipe" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Construit par des entrepreneurs, pour des entrepreneurs.
          </h2>
          <p className="mt-4 text-sm text-text-secondary">
            ASCEND est né d&apos;un constat simple : sur les réseaux, personne ne peut prouver ses chiffres. Alors on a construit
            l&apos;endroit où on peut.
          </p>
        </Reveal>
        <RevealGroup className="mt-12 flex flex-wrap justify-center gap-4">
          {cofounders.map((c) => (
            <RevealItem key={c.username} className="flex">
              <Link
                href={`/profile/${c.username}`}
                className="flex w-56 flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-gold/40"
              >
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-lg font-semibold text-gold">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(c.firstName, c.lastName)
                  )}
                </span>
                <span>
                  <span className="block font-medium capitalize text-text-primary">
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">Cofondateur · @{c.username}</span>
                </span>
                {c.revenueVerified && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Revenus vérifiés
                  </span>
                )}
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
