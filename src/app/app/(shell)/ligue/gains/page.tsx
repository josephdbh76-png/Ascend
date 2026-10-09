import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Coins, Crown, Gift, Hourglass, Landmark, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { getProfile } from "@/services/profile.service";
import { getMembership } from "@/services/clan.service";
import { getEarnings } from "@/services/invite.service";
import { getSellerAccountStatus } from "@/services/marketplace.service";
import { getBetaMode } from "@/services/platform.service";
import { formatPayoutDate, nextSellerPayoutDate } from "@/lib/sellerPayouts";
import {
  INVITE_BONUS_CENTS,
  INVITE_BONUS_EVERY,
  INVITE_REWARD_CENTS,
  INVITE_WINDOW_DAYS,
  LEADER_SHARE,
  MIN_PAYOUT_CENTS,
  REWARD_HOLD_DAYS,
  bonusProgress,
  euros,
} from "@/lib/clans";
import { cn, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes gains · Ma ligue" };

const KIND_LABEL = { invite: "Filleul abonné", invite_bonus: `Bonus des ${INVITE_BONUS_EVERY} filleuls`, leader_share: "Part de chef", leader_bonus: "Part de chef (bonus)" } as const;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export default async function GainsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const profile = await getProfile(data.user.id);
  if (!profile) redirect("/login");
  const [earnings, membership, account, beta] = await Promise.all([
    getEarnings(data.user.id, profile.username),
    getMembership(data.user.id),
    getSellerAccountStatus(data.user.id).catch(() => ({ connected: false, payoutsEnabled: false })),
    getBetaMode(),
  ]);
  const progress = bonusProgress(earnings.paidInvites);
  const nextPayout = formatPayoutDate(nextSellerPayoutDate());
  const waiting = earnings.invitees.filter((i) => i.status === "waiting").length;

  return (
    <div className="flex flex-col gap-6">
      {!membership && (
        <div className="flex items-start gap-3 rounded-lg border border-gold/40 bg-gold/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-medium text-text-primary">Tu n&apos;es dans aucune ligue.</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Tes invitations ne te rapportent rien tant que tu n&apos;en as pas rejoint une : un filleul qui s&apos;abonne pendant que tu es sans ligue ne compte pas.
            </p>
            <Link href="/app/ligue" className="mt-2 inline-block text-sm font-medium text-gold hover:underline">
              Trouver ou créer une ligue →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Amount icon={Wallet} label={`Disponible · versé le ${nextPayout}`} value={earnings.availableCents} accent hint={earnings.availableCents > 0 && earnings.availableCents < MIN_PAYOUT_CENTS ? `Versé à partir de ${euros(MIN_PAYOUT_CENTS)}` : undefined} />
        <Amount icon={Hourglass} label={`En validation · ${REWARD_HOLD_DAYS} jours`} value={earnings.holdingCents} />
        <Amount icon={CheckCircle2} label="Déjà versé" value={earnings.paidCents} hint={earnings.leaderCents > 0 ? `dont ${euros(earnings.leaderCents)} de part de chef` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col gap-4 p-5 sm:p-6" elevated>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <Coins className="h-4 w-4 text-gold" /> Ton lien d&apos;invitation
          </h2>
          <CopyField value={earnings.link} label="Ton lien d'invitation" />
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <Gift className="h-4 w-4 text-gold" /> Bonus de {euros(INVITE_BONUS_CENTS)}
              </p>
              <p className="text-sm tabular-nums text-text-secondary">
                {progress.done}/{INVITE_BONUS_EVERY}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-10 gap-1">
              {Array.from({ length: INVITE_BONUS_EVERY }, (_, i) => (
                <span key={i} className={cn("h-2.5 rounded-full", i < progress.done ? "bg-gold" : "bg-card-active")} />
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Encore {progress.next} filleul{progress.next > 1 ? "s" : ""} abonné{progress.next > 1 ? "s" : ""} pour le prochain bonus · {earnings.paidInvites} au total
            </p>
          </div>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-secondary">
            <li>
              <span className="font-medium text-text-primary">{euros(INVITE_REWARD_CENTS)}</span> pour chaque personne qui prend un abonnement payant dans les {INVITE_WINDOW_DAYS} jours après ton
              invitation, si elle n&apos;était pas déjà abonnée.
            </li>
            <li>
              <span className="font-medium text-text-primary">{euros(INVITE_BONUS_CENTS)}</span> de plus à chaque {INVITE_BONUS_EVERY}e filleul abonné.
            </li>
            <li>
              <Crown className="mr-1 inline h-3.5 w-3.5 text-gold" />
              Le chef de ta ligue touche {Math.round(LEADER_SHARE * 100)} % en plus de ce que tu gagnes, payés par ASCEND : rien n&apos;est retiré de ta part.
            </li>
            <li>Gains validés après {REWARD_HOLD_DAYS} jours, puis versés le 5 du mois dès {euros(MIN_PAYOUT_CENTS)}.</li>
          </ul>
          <p className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
            Tu parles d&apos;ASCEND en échange de ces gains : ajoute la mention <span className="font-medium text-text-primary">« Collaboration commerciale »</span> à tes
            publications (loi du 9 juin 2023), et déclare ces revenus. Ne promets jamais de gains à tes filleuls.
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-5 sm:p-6" elevated>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <Landmark className="h-4 w-4 text-gold" /> Compte de versement
          </h2>
          {beta.enabled ? (
            <p className="text-sm text-text-secondary">Les abonnements payants ouvrent au lancement : ton compte de versement s&apos;active à ce moment-là.</p>
          ) : account.payoutsEnabled ? (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Actif : tes gains arrivent sur ton compte bancaire le 5.
            </p>
          ) : account.connected ? (
            <>
              <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Clock className="h-4 w-4" /> Stripe vérifie tes informations.
              </p>
              <Button href="/api/marketplace/connect?from=gains" variant="secondary" size="sm" className="self-start">
                Compléter mon compte
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">Pour recevoir tes gains, active ton compte de versement : 2 minutes, géré par Stripe, ton IBAN n&apos;est jamais visible par ASCEND.</p>
              <Button href="/api/marketplace/connect?from=gains" size="sm" className="self-start">
                Activer mon compte
              </Button>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6" elevated>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Tes filleuls</h2>
          <p className="text-xs text-text-muted">
            {earnings.invitees.length} invité{earnings.invitees.length > 1 ? "s" : ""}
            {waiting ? ` · ${waiting} pas encore abonné${waiting > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {earnings.invitees.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Personne pour l&apos;instant : partage ton lien en bio et sous tes contenus.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {earnings.invitees.map((i) => (
              <li key={i.username} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-[11px] font-semibold text-gold">
                  {i.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(i.firstName, null)
                  )}
                </span>
                <Link href={`/profile/${i.username}`} className="min-w-0 flex-1 truncate text-sm capitalize text-text-primary hover:text-gold">
                  {i.firstName || `@${i.username}`}
                </Link>
                <span className="shrink-0 text-right text-xs">
                  {i.status === "rewarded" ? (
                    <span className="font-medium text-success">+{euros(INVITE_REWARD_CENTS)}</span>
                  ) : i.status === "lost" ? (
                    <span className="text-text-muted">{i.note}</span>
                  ) : new Date(i.eligibleUntil) < new Date() ? (
                    <span className="text-text-muted">Délai de {INVITE_WINDOW_DAYS} jours passé</span>
                  ) : (
                    <span className="text-text-secondary">Inscrit · abonnement avant le {shortDate(i.eligibleUntil)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {earnings.rewards.length > 0 && (
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-sm font-semibold text-text-primary">Historique</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {earnings.rewards.map((r, idx) => (
              <li key={idx} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs text-text-muted">{shortDate(r.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-text-primary">
                  {KIND_LABEL[r.kind]}
                  {r.invitee && <span className="capitalize text-text-muted"> · {r.invitee}</span>}
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {r.status === "paid" ? "Versé" : r.status === "canceled" ? "Annulé" : new Date(r.availableAt) <= new Date() ? "Disponible" : `Validé le ${shortDate(r.availableAt)}`}
                </span>
                <span className={cn("w-16 shrink-0 text-right font-medium tabular-nums", r.status === "canceled" ? "text-text-muted line-through" : "text-text-primary")}>
                  {euros(r.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Amount({ icon: Icon, label, value, accent, hint }: { icon: typeof Wallet; label: string; value: number; accent?: boolean; hint?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", accent ? "border-gold/40 bg-gold/5" : "border-border bg-card")}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className={cn("mt-1.5 text-3xl font-semibold tabular-nums tracking-tight", accent ? "text-gold" : "text-text-primary")}>{euros(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
