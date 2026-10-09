import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Coins, Swords, Trophy, Users } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { ClanEmblem } from "@/components/clans/ClanEmblem";
import { listClans } from "@/services/clan.service";
import { ACCESS_LABELS, INVITE_REWARD_CENTS, WAR_DAYS, euros } from "@/lib/clans";
import { cn } from "@/lib/utils";

export const revalidate = 300;

const TITLE = "Classement des ligues";
const DESCRIPTION = `Les ligues d'entrepreneurs aux revenus vérifiés, classées par trophées. Rejoins-en une ou crée la tienne, défie les autres en guerres de ${WAR_DAYS} jours.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ligues" },
  openGraph: { title: `${TITLE} · ASCEND`, description: DESCRIPTION, url: "/ligues" },
};

export default async function LeaguesPage() {
  const clans = await listClans({ limit: 100 });
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(214,168,79,0.16),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-14 sm:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
              <Swords className="h-4 w-4" /> Ligues ASCEND
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{TITLE}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">{DESCRIPTION}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Users, text: "Une équipe, un chef, des adjoints" },
                { icon: Swords, text: `Des guerres de ${WAR_DAYS} jours sur vos vraies ventes` },
                { icon: Coins, text: `${euros(INVITE_REWARD_CENTS)} par filleul qui s'abonne` },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm text-text-secondary">
                  <b.icon className="h-4 w-4 shrink-0 text-gold" /> {b.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {clans.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {clans.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/ligues/${c.slug}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-gold/40 sm:gap-4 sm:p-4",
                      i < 3 ? "border-gold/30" : "border-border",
                    )}
                  >
                    <span className={cn("w-7 shrink-0 text-center text-sm font-bold tabular-nums", i === 0 ? "text-gold" : i < 3 ? "text-text-primary" : "text-text-muted")}>{i + 1}</span>
                    <ClanEmblem emblem={c.emblem} color={c.color} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate font-semibold text-text-primary">
                        {c.name} {c.isPartner && <BadgeCheck className="h-4 w-4 shrink-0 text-gold" aria-label="Partenaire" />}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                        {c.leader && <span>Chef @{c.leader.username}</span>}
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" /> {c.memberCount}/{c.maxMembers}
                        </span>
                        <span className="hidden sm:inline">{ACCESS_LABELS[c.access].label}</span>
                        <span>
                          {c.warsWon} V · {c.warsLost} D
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-lg font-semibold tabular-nums text-text-primary">
                      <Trophy className="h-4 w-4 text-gold" /> {c.trophies}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
              <p className="font-medium text-text-primary">Les premières ligues ouvrent bientôt.</p>
              <p className="mt-2 text-sm text-text-secondary">Inscris-toi, fais vérifier tes revenus et ouvre la première.</p>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-6 py-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">Monte ta ligue</h2>
            <p className="max-w-md text-sm text-text-secondary">
              Rassemble ta communauté, défie les autres ligues et touche {euros(INVITE_REWARD_CENTS)} pour chaque personne que tu fais abonner.
            </p>
            <Button href="/app/ligue" size="lg">
              Créer ou rejoindre une ligue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
