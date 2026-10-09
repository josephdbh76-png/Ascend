import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, Gift, Megaphone, MousePointerClick, Swords, UserPlus, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { getAppUrl, cn } from "@/lib/utils";
import { exactEuros, formatPayoutDate, nextSellerPayoutDate, SELLER_PAYOUT_DAY } from "@/lib/sellerPayouts";
import { CREATOR_BONUS_EUROS, CREATOR_BONUS_VERIFIED, getCreatorDashboard, getCreatorForUser } from "@/services/creator.service";
import { getClanWarState } from "@/services/clanWar.service";
import { WarBoard } from "@/components/clans/WarBoard";
import { CopyField } from "@/components/ui/CopyField";

export const metadata: Metadata = { title: "Espace créateur" };

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));

export default async function CreatorPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const creator = await getCreatorForUser(auth.user.id);
  if (!creator) redirect("/app/dashboard");

  const dashboard = await getCreatorDashboard(creator);
  const war = dashboard.league ? (await getClanWarState(dashboard.league.id, auth.user.id)).current : null;
  const link = `${getAppUrl()}/c/${creator.code.toLowerCase()}`;
  const rate = Math.round(creator.commissionRate * 100);
  const term = creator.commissionMonths == null ? "à vie" : `pendant ${creator.commissionMonths} mois`;
  const nextPayout = formatPayoutDate(nextSellerPayoutDate());
  const bonusProgress = Math.min(dashboard.verified, CREATOR_BONUS_VERIFIED);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text-primary">
          <Megaphone className="h-6 w-6 text-gold" /> Espace créateur
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Ce que ton lien a apporté, en direct. Tu touches {rate} % de chaque paiement de tes membres {term}
          {creator.status === "inactive" && " (partenariat en pause)"}.
        </p>
      </div>

      <Card className="flex flex-col gap-5 p-5 sm:p-6" elevated>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Ton lien</h2>
          <p className="mb-2 text-xs text-text-muted">
            À mettre en bio et sous tes vidéos. Il range tes abonnés dans ta ligue et te les attribue pour de bon, même s&apos;ils
            oublient le code.
          </p>
          <CopyField value={link} label="Ton lien créateur" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Ton code promo</h2>
          <p className="mb-2 text-xs text-text-muted">
            −{creator.discountPercent} % pour ton audience {creator.duration === "forever" ? "sur chaque mois d'abonnement" : "sur le premier paiement"}.
          </p>
          <CopyField value={creator.code} label="Ton code promo" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MousePointerClick} label="Clics sur ton lien" value={creator.linkClicks} />
        <Stat icon={UserPlus} label="Inscrits" value={dashboard.signups} />
        <Stat icon={BadgeCheck} label="Revenus vérifiés" value={dashboard.verified} />
        <Stat icon={CreditCard} label="Abonnés payants" value={dashboard.paying} />
      </div>

      <Card className="flex flex-col gap-4 p-5 sm:p-6" elevated>
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Wallet className="h-4 w-4 text-gold" /> Tes commissions
          </h2>
          <p className="text-xs text-text-secondary">
            Versées <span className="font-medium text-text-primary">une fois par mois, le {SELLER_PAYOUT_DAY}</span>, pour les
            commissions du mois précédent.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Amount label={`À verser le ${nextPayout}`} value={dashboard.dueCents} accent />
          <Amount label="Ce mois-ci" value={dashboard.monthCents} />
          <Amount label="Déjà versé" value={dashboard.paidCents} />
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5 sm:p-6" elevated>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Gift className="h-4 w-4 text-gold" /> Prime de lancement
        </h2>
        <p className="text-xs text-text-secondary">
          {CREATOR_BONUS_EUROS} € au {CREATOR_BONUS_VERIFIED}e membre aux revenus vérifiés inscrit avec ton lien, versés au lancement.
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-card-active" role="progressbar" aria-valuemin={0} aria-valuemax={CREATOR_BONUS_VERIFIED} aria-valuenow={bonusProgress}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${(bonusProgress / CREATOR_BONUS_VERIFIED) * 100}%` }} />
        </div>
        <p className="text-xs text-text-muted">
          {bonusProgress >= CREATOR_BONUS_VERIFIED
            ? "Objectif atteint : la prime t'est acquise."
            : `${bonusProgress} sur ${CREATOR_BONUS_VERIFIED} membres vérifiés`}
        </p>
      </Card>

      {dashboard.league ? (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6" elevated>
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Swords className="h-4 w-4 text-gold" /> {dashboard.league.name}
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                {dashboard.league.memberCount} membre{dashboard.league.memberCount > 1 ? "s" : ""} · ta page publique, à partager pour la
                prochaine guerre
              </p>
            </div>
            <Link href={`/ligues/${dashboard.league.slug}`} className="flex items-center gap-1 text-sm font-medium text-gold hover:underline">
              Voir ma ligue <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          {war && <WarBoard war={war} ownClanId={dashboard.league.id} viewerId={auth.user.id} compact />}
        </div>
      ) : (
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Swords className="h-4 w-4 text-gold" /> Ta ligue
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Ta ligue n&apos;est pas encore ouverte. Crée-la depuis{" "}
            <Link href="/app/ligue" className="text-gold hover:underline">
              Ma ligue
            </Link>{" "}
            : elle portera le badge Partenaire, et tes abonnés y entreront automatiquement en s&apos;inscrivant avec ton lien.
          </p>
        </Card>
      )}

      {dashboard.recent.length > 0 && (
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-sm font-semibold text-text-primary">Derniers inscrits</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {dashboard.recent.map((m) => (
              <li key={m.username} className="flex items-center gap-3 py-2.5 text-sm">
                <Link href={`/profile/${m.username}`} className="min-w-0 flex-1 truncate text-text-primary hover:text-gold">
                  {m.firstName ? <span className="capitalize">{m.firstName}</span> : `@${m.username}`}
                </Link>
                {m.paying && <span className="shrink-0 text-xs font-medium text-gold">Abonné</span>}
                <span className={cn("flex shrink-0 items-center gap-1 text-xs", m.verified ? "text-success" : "text-text-muted")}>
                  {m.verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  {m.verified ? "Vérifié" : "À vérifier"}
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-text-muted">{shortDate(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 sm:p-6" elevated>
        <h2 className="text-sm font-semibold text-text-primary">Ton kit créateur</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-text-secondary">
          <li>
            <span className="font-medium text-text-primary">Mentionne « Collaboration commerciale »</span> dans chaque contenu qui parle
            d&apos;ASCEND : c&apos;est obligatoire depuis la loi du 9 juin 2023 sur l&apos;influence commerciale.
          </li>
          <li>
            <span className="font-medium text-text-primary">Ne promets jamais de gains</span> : ni revenus garantis, ni bénéfice sur les
            titres. Parle de ce que tu montres : tes chiffres, vérifiés.
          </li>
          <li>
            <span className="font-medium text-text-primary">Montre ton profil vérifié</span> : c&apos;est la preuve qui convainc le plus.
            Ajoute aussi ton{" "}
            <Link href="/app/settings#badge" className="text-gold hover:underline">
              badge « Revenus vérifiés »
            </Link>{" "}
            sur ton site.
          </li>
          <li>
            <span className="font-medium text-text-primary">Ton accès Elite</span> reste offert tant que le partenariat est actif.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-text-muted" />
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function Amount({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-md border p-3", accent ? "border-gold/30 bg-gold/5" : "border-border-strong bg-card-elevated")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", accent ? "text-gold" : "text-text-primary")}>
        {exactEuros(value)}
      </p>
    </div>
  );
}
