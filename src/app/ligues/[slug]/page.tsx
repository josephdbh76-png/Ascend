import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Crown, Lock } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { JoinLeagueButton, type JoinState } from "@/components/leagues/JoinLeagueButton";
import { LeagueWarCard } from "@/components/leagues/LeagueWarCard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatPercent, initials } from "@/lib/utils";
import {
  getCreatorLeagueBySlug,
  getCurrentWarForLeague,
  getLeagueStandings,
  getMemberCreatorLeague,
} from "@/services/creatorLeague.service";

export async function generateMetadata({ params }: PageProps<"/ligues/[slug]">): Promise<Metadata> {
  const league = await getCreatorLeagueBySlug((await params).slug);
  if (!league) return { title: "Ligue introuvable" };
  const description =
    league.tagline ??
    `${league.name} sur ASCEND : ${league.memberCount} entrepreneurs aux revenus vérifiés, un classement interne et des guerres de ligues.`;
  return {
    title: league.name,
    description,
    alternates: { canonical: `/ligues/${league.slug}` },
    openGraph: { title: `${league.name} · ASCEND`, description, url: `/ligues/${league.slug}` },
  };
}

const fullName = (first: string | null, last: string | null, username: string) =>
  [first, last].filter(Boolean).join(" ") || username;

export default async function LeaguePage({ params }: PageProps<"/ligues/[slug]">) {
  const league = await getCreatorLeagueBySlug((await params).slug);
  if (!league || !league.isActive) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [standings, war, memberLeague, { data: creator }] = await Promise.all([
    getLeagueStandings(league.id),
    getCurrentWarForLeague(league.id),
    auth.user ? getMemberCreatorLeague(auth.user.id) : Promise.resolve(null),
    league.influencerId
      ? createAdminClient().from("influencers").select("code, status").eq("id", league.influencerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Visitors sign up through the creator's link, so they land in the league.
  const signupHref = creator?.status === "active" ? `/c/${creator.code.toLowerCase()}?to=signup` : "/signup";
  const joinState: JoinState = !auth.user
    ? { kind: "guest", signupHref }
    : memberLeague?.id === league.id
      ? { kind: "member" }
      : memberLeague
        ? { kind: "other", leagueName: memberLeague.name }
        : { kind: "none" };
  const verified = standings.filter((s) => s.revenueVerified).length;

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 sm:px-6 lg:px-8">
            <nav aria-label="Fil d'Ariane" className="text-xs text-text-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-text-primary">
                    Accueil
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/ligues" className="hover:text-text-primary">
                    Ligues
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-text-secondary">{league.name}</li>
              </ol>
            </nav>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{league.name}</h1>
            {league.tagline && <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary">{league.tagline}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-text-secondary">
              {league.captain && (
                <Link href={`/profile/${league.captain.username}`} className="flex items-center gap-2 hover:text-text-primary">
                  <Avatar url={league.captain.avatarUrl} first={league.captain.firstName} last={league.captain.lastName} size="sm" />
                  <span>
                    <Crown className="mr-1 inline h-3.5 w-3.5 text-gold" />
                    Capitaine :{" "}
                    <span className="capitalize text-text-primary">
                      {fullName(league.captain.firstName, league.captain.lastName, league.captain.username)}
                    </span>
                  </span>
                </Link>
              )}
              <span>
                <span className="font-medium text-text-primary">{league.memberCount}</span> membre{league.memberCount > 1 ? "s" : ""}
              </span>
              <span>
                <span className="font-medium text-text-primary">{verified}</span> vérifié{verified > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-8">
              <JoinLeagueButton leagueId={league.id} slug={league.slug} state={joinState} />
              {!auth.user && <p className="mt-2 text-xs text-text-muted">Gratuit · sans carte bancaire</p>}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          {war && <LeagueWarCard war={war} />}

          <div>
            <h2 className="text-lg font-semibold text-text-primary">Classement interne</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Sur la croissance mensuelle vérifiée, pas sur le chiffre d&apos;affaires : un débutant peut passer devant un membre plus
              avancé.
            </p>
            <ol className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {standings.map((s) => (
                <li key={s.userId}>
                  <Link href={`/profile/${s.username}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-elevated">
                    <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-text-muted">{s.rank ?? "·"}</span>
                    <Avatar url={s.avatarUrl} first={s.firstName} last={s.lastName} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium capitalize text-text-primary">
                        {fullName(s.firstName, s.lastName, s.username)}
                      </span>
                      <span className="block truncate text-xs text-text-muted">@{s.username}</span>
                    </span>
                    {!s.revenueVerified ? (
                      <span className="shrink-0 text-xs text-text-muted">Non vérifié</span>
                    ) : s.growthPrivate ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-text-muted">
                        <Lock className="h-3 w-3" /> Privé
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Revenus vérifiés" />
                        <span
                          className={cn(
                            "w-16 text-right text-sm font-medium tabular-nums",
                            s.growthPercent == null ? "text-text-muted" : s.growthPercent >= 0 ? "text-success" : "text-error",
                          )}
                        >
                          {s.growthPercent == null ? "—" : formatPercent(s.growthPercent)}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              {standings.length === 0 && <li className="px-4 py-8 text-center text-sm text-text-muted">Aucun membre pour l&apos;instant.</li>}
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-bg-secondary p-5 text-sm text-text-secondary sm:p-6">
            <h2 className="font-semibold text-text-primary">Comment ça marche</h2>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
              <li>Tu gardes ta ligue de niveau (Bronze à Diamant) et tu joues en plus en équipe avec cette communauté.</li>
              <li>Chaque mois, deux ligues s&apos;affrontent. Le score tient compte de la taille de la ligue : une petite ligue active peut gagner.</li>
              <li>Les membres vérifiés de la ligue gagnante reçoivent le titre « Vainqueur · Guerre de ligues ».</li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Avatar({ url, first, last, size }: { url: string | null; first: string | null; last: string | null; size: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated font-semibold text-gold",
        size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(first, last)
      )}
    </span>
  );
}
