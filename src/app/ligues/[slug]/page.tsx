import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { ClanHero } from "@/components/clans/ClanHero";
import { WarBoard } from "@/components/clans/WarBoard";
import { JoinClanButton, type JoinState } from "@/components/clans/JoinClanButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatPercent, initials } from "@/lib/utils";
import { INVITE_REWARD_CENTS, ROLE_LABELS, WAR_DAYS, euros } from "@/lib/clans";
import { clanRank, getClanBySlug, getClanMembers, getMembership, pendingRequestClanIds, rankByGrowth } from "@/services/clan.service";
import { getClanWarState } from "@/services/clanWar.service";

export async function generateMetadata({ params }: PageProps<"/ligues/[slug]">): Promise<Metadata> {
  const clan = await getClanBySlug((await params).slug);
  if (!clan) return { title: "Ligue introuvable" };
  const description =
    clan.tagline ?? `${clan.name} sur ASCEND : ${clan.memberCount} entrepreneurs aux revenus vérifiés, ${clan.trophies} trophées, des guerres de ligues chaque mois.`;
  return {
    title: clan.name,
    description,
    alternates: { canonical: `/ligues/${clan.slug}` },
    openGraph: { title: `${clan.name} · ASCEND`, description, url: `/ligues/${clan.slug}` },
  };
}

const fullName = (first: string | null, last: string | null, username: string) => [first, last].filter(Boolean).join(" ") || username;

export default async function ClanPage({ params, searchParams }: PageProps<"/ligues/[slug]">) {
  const clan = await getClanBySlug((await params).slug);
  if (!clan || !clan.isActive) notFound();
  const inviteParam = (await searchParams).invite;
  const inviteUsername = typeof inviteParam === "string" ? inviteParam.toLowerCase() : null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const [members, rank, war, membership, requested, { data: inviter }, { data: creator }] = await Promise.all([
    getClanMembers(clan.id),
    clanRank(clan),
    getClanWarState(clan.id),
    auth.user ? getMembership(auth.user.id) : Promise.resolve(null),
    auth.user ? pendingRequestClanIds(auth.user.id) : Promise.resolve([] as string[]),
    inviteUsername ? admin.from("profiles").select("id, username, first_name").eq("username", inviteUsername).maybeSingle() : Promise.resolve({ data: null }),
    clan.influencerId ? admin.from("influencers").select("code, status").eq("id", clan.influencerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ranked = rankByGrowth(members);
  const inviterInClan = inviter ? members.find((m) => m.userId === inviter.id) : undefined;
  const vouched = inviterInClan && inviterInClan.role !== "member";

  // Visitors sign up through the partner's link when there is one, so they land in the league.
  const signupHref = creator?.status === "active" ? `/c/${creator.code.toLowerCase()}?to=signup` : "/signup";
  const state: JoinState = !auth.user
    ? { kind: "guest", signupHref }
    : membership?.clan.id === clan.id
      ? { kind: "member" }
      : requested.includes(clan.id)
        ? { kind: "requested" }
        : membership
          ? { kind: "other", clanName: membership.clan.name, isLeader: membership.role === "leader" }
          : { kind: "none" };
  const shownWar = war.current ?? war.lastResult;

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicNav />
      <main id="main-content" className="flex-1">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-12 pt-10 sm:px-6 lg:px-8">
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
              <li className="text-text-secondary">{clan.name}</li>
            </ol>
          </nav>

          {inviterInClan && (
            <div className="flex items-center gap-3 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3">
              <Sparkles className="h-5 w-5 shrink-0 text-gold" />
              <p className="text-sm text-text-primary">
                <span className="font-semibold capitalize">{inviter?.first_name || `@${inviter?.username}`}</span> t&apos;invite à rejoindre {clan.name}.
              </p>
            </div>
          )}

          <ClanHero clan={clan} rank={rank} />

          <div className="flex flex-col items-start gap-2">
            <JoinClanButton clanId={clan.id} access={clan.access} full={clan.memberCount >= clan.maxMembers} state={state} invited={!!vouched} />
            {!auth.user && <p className="text-xs text-text-muted">Gratuit · sans carte bancaire</p>}
          </div>

          {shownWar && <WarBoard war={shownWar} ownClanId={clan.id} />}

          <section>
            <h2 className="text-lg font-semibold text-text-primary">Classement interne</h2>
            <p className="mt-1 text-sm text-text-secondary">Sur la croissance mensuelle vérifiée, pas sur le chiffre d&apos;affaires : un débutant peut passer devant un plus grand.</p>
            <ol className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {ranked.map((m) => (
                <li key={m.userId}>
                  <Link href={`/profile/${m.username}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-elevated">
                    <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-text-muted">{m.rank ?? "·"}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-xs font-semibold text-gold">
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(m.firstName, m.lastName)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium capitalize text-text-primary">{fullName(m.firstName, m.lastName, m.username)}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {m.role !== "member" && <span className={m.role === "leader" ? "font-semibold text-gold" : ""}>{ROLE_LABELS[m.role]} · </span>}@{m.username}
                      </span>
                    </span>
                    {!m.revenueVerified ? (
                      <span className="shrink-0 text-xs text-text-muted">Non vérifié</span>
                    ) : m.growthPrivate ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-text-muted">
                        <Lock className="h-3 w-3" /> Privé
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="Revenus vérifiés" />
                        <span className={cn("w-16 text-right text-sm font-medium tabular-nums", m.growthPercent == null ? "text-text-muted" : m.growthPercent >= 0 ? "text-success" : "text-error")}>
                          {m.growthPercent == null ? "—" : formatPercent(m.growthPercent)}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-border bg-bg-secondary p-5 text-sm text-text-secondary sm:p-6">
            <h2 className="font-semibold text-text-primary">Comment ça marche</h2>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
              <li>Tu gardes ta ligue de niveau (Bronze à Diamant) et tu joues en plus en équipe.</li>
              <li>Le chef défie d&apos;autres ligues : {WAR_DAYS} jours de bataille sur les ventes vérifiées, les défis et les membres vérifiés, ramenés à la taille de la ligue.</li>
              <li>Chaque victoire rapporte des trophées à la ligue et des titres de guerre à ses membres vérifiés.</li>
              <li>Chaque membre a son lien d&apos;invitation : {euros(INVITE_REWARD_CENTS)} pour chaque personne qui s&apos;abonne grâce à lui.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
