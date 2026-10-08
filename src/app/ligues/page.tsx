import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Swords, Users } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { listCreatorLeagues } from "@/services/creatorLeague.service";
import { initials } from "@/lib/utils";

export const revalidate = 300;

const TITLE = "Ligues de créateurs";
const DESCRIPTION =
  "Rejoins la ligue d'un créateur que tu suis : un classement interne sur la croissance vérifiée, et chaque mois une guerre contre une autre ligue.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ligues" },
  openGraph: { title: `${TITLE} · ASCEND`, description: DESCRIPTION, url: "/ligues" },
};

export default async function LeaguesPage() {
  const leagues = await listCreatorLeagues();
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{TITLE}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">{DESCRIPTION}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-text-muted">
              <Swords className="h-4 w-4 text-gold" /> Une guerre de ligues par mois · score ramené à la taille de la ligue
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {leagues.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {leagues.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/ligues/${l.slug}`}
                    className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-gold/40"
                  >
                    <span className="text-lg font-semibold text-text-primary">{l.name}</span>
                    {l.tagline && <span className="line-clamp-2 text-sm text-text-secondary">{l.tagline}</span>}
                    <span className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-text-muted">
                      {l.captain ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-[10px] font-semibold text-gold">
                            {l.captain.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.captain.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(l.captain.firstName, l.captain.lastName)
                            )}
                          </span>
                          <span className="truncate">@{l.captain.username}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex shrink-0 items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {l.memberCount}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
              <p className="font-medium text-text-primary">Les premières ligues ouvrent bientôt.</p>
              <p className="mt-2 text-sm text-text-secondary">
                En attendant, inscris-toi : tu joues déjà dans ta ligue de niveau, de Bronze à Diamant.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-6 py-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">Tu as une communauté d&apos;entrepreneurs ?</h2>
            <p className="max-w-md text-sm text-text-secondary">
              Ouvre ta ligue sur ASCEND : une page à ton nom, un classement interne pour ta communauté, des guerres contre
              les autres créateurs et une commission sur les abonnements de tes membres.
            </p>
            <Button href="/signup" size="lg">
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
