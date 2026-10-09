import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, CheckCircle2, Coins, Lock, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { ClanEmblem } from "@/components/clans/ClanEmblem";
import { ClanForm } from "@/components/clans/ClanForm";
import { WarBoard } from "@/components/clans/WarBoard";
import { MemberActions } from "@/components/clans/MemberActions";
import { JoinRequestButtons, LeaveClanButton } from "@/components/clans/ClanActionButtons";
import { getProfile } from "@/services/profile.service";
import { getClanMembers, getMembership, listClans, listJoinRequests, pendingRequestClanIds, rankByGrowth } from "@/services/clan.service";
import { getClanWarState } from "@/services/clanWar.service";
import { getEarnings } from "@/services/invite.service";
import { getCreatorForUser } from "@/services/creator.service";
import { ACCESS_LABELS, INVITE_BONUS_CENTS, INVITE_BONUS_EVERY, INVITE_REWARD_CENTS, ROLE_LABELS, WAR_MIN_VERIFIED, bonusProgress, euros, isClanColor, isClanEmblem } from "@/lib/clans";
import { cn, formatPercent, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Ma ligue" };

export default async function LiguePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const userId = data.user.id;
  const [profile, membership, creator] = await Promise.all([getProfile(userId), getMembership(userId), getCreatorForUser(userId)]);
  if (!profile) redirect("/login");
  if (membership) return <MemberView userId={userId} username={profile.username} membership={membership} />;
  // Partner creators open their league without verified revenue: the partnership is the vetting.
  return <NoClanView userId={userId} canCreate={profile.revenueVerified || creator?.status === "active"} />;
}

type MembershipT = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

async function MemberView({ userId, username, membership }: { userId: string; username: string; membership: MembershipT }) {
  const { clan, role } = membership;
  const officer = role === "leader" || role === "coleader";
  const [members, requests, war, earnings] = await Promise.all([
    getClanMembers(clan.id),
    officer ? listJoinRequests(clan.id) : Promise.resolve([]),
    getClanWarState(clan.id, userId),
    getEarnings(userId, username),
  ]);
  const ranked = rankByGrowth(members);
  const progress = bonusProgress(earnings.paidInvites);
  const shownWar = war.current ?? war.outgoing ?? war.incoming[0] ?? war.lastResult;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {shownWar ? (
          <div className="flex flex-col gap-2">
            <WarBoard war={shownWar} ownClanId={clan.id} viewerId={userId} compact />
            <Link href="/app/ligue/guerre" className="flex items-center gap-1 self-end text-sm font-medium text-gold hover:underline">
              Ouvrir le centre de guerre <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Card className="flex flex-col justify-between gap-4 p-5 sm:p-6" elevated>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                <Swords className="h-4 w-4 text-gold" /> Guerre
              </h2>
              <p className="mt-2 text-lg font-semibold text-text-primary">Aucune guerre en cours.</p>
              <p className="mt-1 text-sm text-text-secondary">
                {clan.verifiedCount >= WAR_MIN_VERIFIED
                  ? officer
                    ? "Ta ligue est prête : choisis un adversaire et lance la bataille."
                    : "Ta ligue est prête : le chef ou un adjoint peut déclarer une guerre."
                  : `Il faut ${WAR_MIN_VERIFIED} membres aux revenus vérifiés pour partir en guerre (${clan.verifiedCount}/${WAR_MIN_VERIFIED}).`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-active">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(1, clan.verifiedCount / WAR_MIN_VERIFIED) * 100}%` }} />
              </div>
            </div>
            <Button href="/app/ligue/guerre" variant={officer ? "primary" : "secondary"} className="self-start">
              <Swords className="h-4 w-4" /> {officer ? "Déclarer une guerre" : "Voir le centre de guerre"}
            </Button>
          </Card>
        )}

        <Card className="flex flex-col gap-4 p-5 sm:p-6" elevated>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
              <Coins className="h-4 w-4 text-gold" /> Invite et gagne
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{euros(INVITE_REWARD_CENTS)}</span> pour chaque personne qui s&apos;abonne grâce à toi, et{" "}
              <span className="font-semibold text-text-primary">{euros(INVITE_BONUS_CENTS)}</span> de plus à chaque {INVITE_BONUS_EVERY}e. Elle rejoint ta ligue en s&apos;inscrivant.
            </p>
          </div>
          <CopyField value={earnings.link} label="Ton lien d'invitation" />
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Prochain bonus de {euros(INVITE_BONUS_CENTS)}</span>
              <span className="font-medium tabular-nums text-text-primary">
                {progress.done}/{INVITE_BONUS_EVERY}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-10 gap-1">
              {Array.from({ length: INVITE_BONUS_EVERY }, (_, i) => (
                <span key={i} className={cn("h-2 rounded-full", i < progress.done ? "bg-gold" : "bg-card-active")} />
              ))}
            </div>
          </div>
          <Link href="/app/ligue/gains" className="flex items-center gap-1 text-sm font-medium text-gold hover:underline">
            {earnings.availableCents + earnings.holdingCents > 0 ? `${euros(earnings.availableCents + earnings.holdingCents)} de gains en cours` : "Voir mes gains"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {requests.length > 0 && (
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-sm font-semibold text-text-primary">
            Demandes pour rejoindre la ligue <span className="ml-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">{requests.length}</span>
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {requests.map((r) => {
              const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || `@${r.username}`;
              return (
                <li key={r.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar url={r.avatarUrl} first={r.firstName} last={r.lastName} />
                  <Link href={`/profile/${r.username}`} className="min-w-0 flex-1 truncate text-sm capitalize text-text-primary hover:text-gold">
                    {name}
                  </Link>
                  {r.revenueVerified ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Vérifié
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-text-muted">Non vérifié</span>
                  )}
                  <JoinRequestButtons clanId={clan.id} userId={r.userId} name={name} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="p-5 sm:p-6" elevated>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Classement interne</h2>
          <p className="text-xs text-text-muted">Sur la croissance mensuelle vérifiée : un débutant peut passer devant un plus grand.</p>
        </div>
        <ol className="mt-4 flex flex-col divide-y divide-border">
          {ranked.map((m) => {
            const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || `@${m.username}`;
            return (
              <li key={m.userId} className={cn("flex items-center gap-3 py-2.5", m.userId === userId && "-mx-2 rounded-md bg-gold/5 px-2")}>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                    m.rank === 1 ? "bg-gold text-[#0a0b0d]" : m.rank === 2 ? "bg-[#c9d1d9] text-[#0a0b0d]" : m.rank === 3 ? "bg-[#d08b5b] text-[#0a0b0d]" : "text-text-muted",
                  )}
                >
                  {m.rank ?? "·"}
                </span>
                <Avatar url={m.avatarUrl} first={m.firstName} last={m.lastName} />
                <span className="min-w-0 flex-1">
                  <Link href={`/profile/${m.username}`} className="block truncate text-sm font-medium capitalize text-text-primary hover:text-gold">
                    {name}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    {m.role !== "member" && <span className={m.role === "leader" ? "font-semibold text-gold" : "text-text-secondary"}>{ROLE_LABELS[m.role]}</span>}
                    {m.role !== "member" && "·"}@{m.username}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {!m.revenueVerified ? (
                    <span className="text-xs text-text-muted">Non vérifié</span>
                  ) : m.growthPrivate ? (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Lock className="h-3 w-3" /> Privé
                    </span>
                  ) : (
                    <span className={cn("text-sm font-semibold tabular-nums", m.growthPercent == null ? "text-text-muted" : m.growthPercent >= 0 ? "text-success" : "text-error")}>
                      {m.growthPercent == null ? "—" : formatPercent(m.growthPercent)}
                    </span>
                  )}
                </span>
                {officer && m.userId !== userId && <MemberActions targetId={m.userId} targetName={name} targetRole={m.role} actorRole={role} />}
              </li>
            );
          })}
        </ol>
      </Card>

      {role === "leader" && (
        <Card className="p-5 sm:p-6" elevated>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-text-primary">Réglages de la ligue</summary>
            <div className="mt-5">
              <ClanForm
                clanId={clan.id}
                initial={{
                  name: clan.name,
                  tagline: clan.tagline ?? "",
                  emblem: isClanEmblem(clan.emblem) ? clan.emblem : "shield",
                  color: isClanColor(clan.color) ? clan.color : "gold",
                  access: clan.access,
                }}
              />
            </div>
          </details>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/ligues/${clan.slug}`} className="text-sm text-text-secondary hover:text-gold">
          Page publique de la ligue →
        </Link>
        <LeaveClanButton isLeader={role === "leader"} />
      </div>
    </div>
  );
}

async function NoClanView({ userId, canCreate }: { userId: string; canCreate: boolean }) {
  const [clans, requested] = await Promise.all([listClans({ limit: 30 }), pendingRequestClanIds(userId)]);
  const joinable = clans.filter((c) => c.memberCount < c.maxMembers && c.access !== "invite").slice(0, 8);
  const benefits = [
    { icon: Swords, title: "Des guerres d'une semaine", text: "Ton chef défie une autre ligue : chaque vente et chaque défi rapportent des points." },
    { icon: Coins, title: `${euros(INVITE_REWARD_CENTS)} par filleul abonné`, text: `Et ${euros(INVITE_BONUS_CENTS)} de plus à chaque ${INVITE_BONUS_EVERY}e. Il faut être dans une ligue pour toucher tes gains.` },
    { icon: Trophy, title: "Trophées et titres", text: "Les victoires font grimper ta ligue au classement et débloquent des titres de guerre." },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-lg border border-border bg-card p-4">
            <b.icon className="h-5 w-5 text-gold" />
            <p className="mt-2 text-sm font-semibold text-text-primary">{b.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{b.text}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-lg font-semibold text-text-primary">Ouvre ta ligue</h2>
          <p className="mt-1 text-sm text-text-secondary">Tu en deviens le chef : tu choisis qui entre, tu nommes tes adjoints et tu déclares les guerres.</p>
          {canCreate ? (
            <div className="mt-5">
              <ClanForm />
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-border bg-bg-secondary p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <ShieldCheck className="h-4 w-4 text-gold" /> Réservé aux membres aux revenus vérifiés
              </p>
              <p className="text-sm text-text-secondary">Connecte ta source de revenus en lecture seule : ça prend deux minutes.</p>
              <Button href="/app/settings#comptes-connectes" size="sm">
                Vérifier mes revenus
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6" elevated>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-text-primary">Rejoins une ligue</h2>
            <Link href="/ligues" className="text-sm text-gold hover:underline">
              Classement des ligues
            </Link>
          </div>
          {joinable.length === 0 ? (
            <p className="mt-6 text-sm text-text-secondary">Aucune ligue ouverte pour l&apos;instant : sois le premier à en créer une.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {joinable.map((c) => (
                <li key={c.id}>
                  <Link href={`/ligues/${c.slug}`} className="flex items-center gap-3 rounded-md border border-border-strong p-3 transition-colors hover:border-gold/40">
                    <ClanEmblem emblem={c.emblem} color={c.color} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text-primary">
                        {c.name} {c.isPartner && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Partenaire" />}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                        <span className="flex items-center gap-0.5">
                          <Trophy className="h-3 w-3 text-gold" /> {c.trophies}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" /> {c.memberCount}/{c.maxMembers}
                        </span>
                        <span>{ACCESS_LABELS[c.access].label}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-gold">{requested.includes(c.id) ? "Demande envoyée" : "Voir"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Avatar({ url, first, last }: { url: string | null; first: string | null; last: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-xs font-semibold text-gold">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(first, last)
      )}
    </span>
  );
}
