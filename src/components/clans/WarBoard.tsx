import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Crown, Flame, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { WAR_DAYS, WAR_SCORE_PARTS, clanColor, formatPoints } from "@/lib/clans";
import type { FighterView, WarSideView, WarView } from "@/services/clanWar.service";
import { ClanEmblem } from "./ClanEmblem";
import { Countdown } from "./Countdown";
import { WarChart } from "./WarChart";

const PHASE: Record<WarView["phase"], { label: string; tone: string }> = {
  proposed: { label: "Déclaration en attente", tone: "border-gold/50 bg-gold/10 text-gold" },
  preparing: { label: "Préparation", tone: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  starting: { label: "La bataille commence", tone: "border-gold/50 bg-gold/10 text-gold" },
  live: { label: "En cours", tone: "border-error/40 bg-error/10 text-error" },
  ending: { label: "Résultat en cours de calcul", tone: "border-border-strong text-text-secondary" },
  closed: { label: "Terminée", tone: "border-border-strong text-text-muted" },
  declined: { label: "Refusée", tone: "border-border-strong text-text-muted" },
  expired: { label: "Sans réponse", tone: "border-border-strong text-text-muted" },
  canceled: { label: "Annulée", tone: "border-border-strong text-text-muted" },
};

function PhaseLine({ war }: { war: WarView }) {
  if (war.phase === "proposed") return <>Réponse attendue sous <Countdown to={war.respondBy} className="font-medium text-text-primary" /></>;
  if (war.phase === "preparing" && war.startsAt) return <>La bataille commence dans <Countdown to={war.startsAt} className="font-medium text-text-primary" /></>;
  if (war.phase === "live" && war.endsAt) return <>Fin dans <Countdown to={war.endsAt} className="font-medium text-text-primary" /></>;
  if (war.phase === "starting") return <>Les effectifs sont figés dans quelques minutes.</>;
  if (war.phase === "ending") return <>Les derniers chiffres arrivent : résultat dans moins d&apos;une heure.</>;
  if (war.startsAt && war.endsAt) {
    const d = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
    return <>Du {d(war.startsAt)} au {d(war.endsAt)}</>;
  }
  return null;
}

function Avatar({ f, size = 28 }: { f: Pick<FighterView, "avatarUrl" | "firstName" | "lastName">; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-card-elevated text-[10px] font-semibold text-gold"
      style={{ width: size, height: size }}
    >
      {f.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(f.firstName, f.lastName)
      )}
    </span>
  );
}

const name = (f: FighterView) => [f.firstName, f.lastName].filter(Boolean).join(" ") || `@${f.username}`;

function SideHead({ side, won, align, phase }: { side: WarSideView; won: boolean; align: "left" | "right"; phase: WarView["phase"] }) {
  const started = phase === "live" || phase === "ending" || phase === "closed";
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2", align === "right" ? "items-end text-right" : "items-start")}>
      <Link
        href={side.clan.slug ? `/ligues/${side.clan.slug}` : "#"}
        className={cn("flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3", align === "right" ? "items-end sm:flex-row-reverse" : "items-start")}
      >
        <ClanEmblem emblem={side.clan.emblem} color={side.clan.color} size={52} />
        <span className="min-w-0">
          <span className="line-clamp-2 break-words text-sm font-semibold text-text-primary sm:text-base">{side.clan.name}</span>
          <span className={cn("mt-0.5 flex items-center gap-1 text-xs text-text-muted", align === "right" && "justify-end")}>
            <Trophy className="h-3 w-3 text-gold" /> {side.clan.trophies}
          </span>
        </span>
      </Link>
      {started && (
        <span className={cn("text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl", won ? "text-gold" : "text-text-primary")}>
          {formatPoints(side.total)}
        </span>
      )}
      {won && started && (
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gold">
          <Crown className="h-3.5 w-3.5" /> {phase === "closed" ? "Victoire" : "En tête"}
        </span>
      )}
      {phase === "closed" && side.trophiesDelta != null && (
        <span className={cn("text-xs font-medium", side.trophiesDelta > 0 ? "text-success" : side.trophiesDelta < 0 ? "text-error" : "text-text-muted")}>
          {side.trophiesDelta > 0 ? "+" : ""}
          {side.trophiesDelta} trophée{Math.abs(side.trophiesDelta) > 1 ? "s" : ""}
        </span>
      )}
      {!side.canWin && (phase === "live" || phase === "ending") && (
        <span className="text-[11px] text-text-muted">Moins de 5 vérifiés au départ : ne peut pas gagner</span>
      )}
    </div>
  );
}

function TugBar({ a, b, colorA, colorB }: { a: number; b: number; colorA: string; colorB: string }) {
  const share = a + b > 0 ? (a / (a + b)) * 100 : 50;
  return (
    <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-card-active" role="img" aria-label={`Rapport de force : ${Math.round(share)} % contre ${Math.round(100 - share)} %`}>
      <div
        className="absolute inset-y-0 left-0 rounded-l-full transition-[width] duration-700"
        style={{ width: `${share}%`, background: `linear-gradient(90deg, ${clanColor(colorA).to}, ${clanColor(colorA).from})` }}
      />
      <div
        className="absolute inset-y-0 right-0 rounded-r-full transition-[width] duration-700"
        style={{ width: `${100 - share}%`, background: `linear-gradient(270deg, ${clanColor(colorB).to}, ${clanColor(colorB).from})` }}
      />
      <div className="absolute inset-y-0 w-1 -translate-x-1/2 bg-bg-primary" style={{ left: `${share}%` }} />
    </div>
  );
}

function Parts({ a, b }: { a: WarSideView; b: WarSideView }) {
  if (!a.score || !b.score) return null;
  return (
    <dl className="mt-5 grid gap-3">
      {WAR_SCORE_PARTS.map((part) => {
        const va = a.score![part.key];
        const vb = b.score![part.key];
        return (
          <div key={part.key}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <dd className="w-12 tabular-nums font-medium text-text-primary">{formatPoints(va)}</dd>
              <dt className="text-center text-text-muted">
                {part.label} <span className="text-text-muted/70">· {part.points} pts</span>
              </dt>
              <dd className="w-12 text-right tabular-nums font-medium text-text-primary">{formatPoints(vb)}</dd>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <div className="flex h-1.5 justify-end overflow-hidden rounded-full bg-card-active">
                <div className="h-full rounded-full" style={{ width: `${(va / part.points) * 100}%`, background: clanColor(a.clan.color).from }} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-active">
                <div className="h-full rounded-full" style={{ width: `${(vb / part.points) * 100}%`, background: clanColor(b.clan.color).from }} />
              </div>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function MyContribution({ me, side }: { me: FighterView; side: WarSideView }) {
  if (!side.score) return null;
  const n = Math.max(1, side.score.fighters);
  const perChallenge = 25 / (3 * n);
  const perfMax = side.score.revenueFighters ? 60 / side.score.revenueFighters : 0;
  return (
    <div className="mt-6 rounded-lg border border-gold/30 bg-gold/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Ta contribution</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{formatPoints(me.points)}</p>
          <p className="text-xs text-text-muted">pts rapportés</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{me.pace == null ? "—" : `${Math.round(me.pace * 100)} %`}</p>
          <p className="text-xs text-text-muted">de ton rythme habituel</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-text-primary">{Math.min(3, me.challenges)}/3</p>
          <p className="text-xs text-text-muted">défis comptés</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 text-xs text-text-secondary">
        {me.challenges < 3 && (
          <li className="flex gap-1.5">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <span>
              Chaque défi réussi rapporte <span className="font-medium text-text-primary">+{formatPoints(perChallenge)} pts</span> à ta ligue.{" "}
              <Link href="/app/challenges" className="text-gold hover:underline">
                Voir les défis
              </Link>
            </span>
          </li>
        )}
        {me.revenueEligible ? (
          <li className="flex gap-1.5">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <span>
              À 2 fois ton rythme habituel, tes ventes rapportent jusqu&apos;à <span className="font-medium text-text-primary">{formatPoints(perfMax)} pts</span>.
            </span>
          </li>
        ) : (
          <li className="flex gap-1.5">
            <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <span>Tes ventes ne comptent pas encore : il faut une source qui se synchronise seule (Stripe, Shopify…) et un mois vérifié avant la guerre.</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function Fighters({ side, viewerId, limit }: { side: WarSideView; viewerId?: string | null; limit: number }) {
  const list = side.fighters.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <ClanEmblem emblem={side.clan.emblem} color={side.clan.color} size={14} /> {side.clan.name}
      </p>
      <ol className="flex flex-col gap-1.5">
        {list.map((f, i) => (
          <li
            key={f.userId}
            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm", f.userId === viewerId ? "bg-gold/10" : "bg-card-elevated/60")}
          >
            <span className="w-4 text-center text-xs font-semibold tabular-nums text-text-muted">{i + 1}</span>
            <Avatar f={f} />
            <Link href={`/profile/${f.username}`} className="min-w-0 flex-1 truncate capitalize text-text-primary hover:text-gold">
              {name(f)}
            </Link>
            {f.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Revenus vérifiés" />}
            {f.points != null && <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-text-secondary">{formatPoints(f.points)}</span>}
          </li>
        ))}
      </ol>
      {side.fighters.length > limit && <p className="mt-1.5 text-xs text-text-muted">
          et {side.fighters.length - limit} autre{side.fighters.length - limit > 1 ? "s" : ""}
        </p>}
    </div>
  );
}

/**
 * A war, from `ownClanId`'s side when given (their league on the left):
 * the score, how it's made, day after day, the viewer's own share.
 */
export function WarBoard({
  war,
  ownClanId,
  viewerId,
  actions,
  compact = false,
}: {
  war: WarView;
  ownClanId?: string | null;
  viewerId?: string | null;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const flip = ownClanId === war.b.clan.id;
  const left = flip ? war.b : war.a;
  const right = flip ? war.a : war.b;
  const leftWon = war.winner === (flip ? "b" : "a");
  const rightWon = war.winner === (flip ? "a" : "b");
  const started = war.phase === "live" || war.phase === "ending" || war.phase === "closed";
  const me = viewerId ? left.fighters.find((f) => f.userId === viewerId) : undefined;
  const phase = PHASE[war.phase];
  const days = flip ? war.days.map((d) => ({ day: d.day, a: d.b, b: d.a })) : war.days;

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
        style={{
          background: `radial-gradient(60% 100% at 0% 0%, ${clanColor(left.clan.color).to}33, transparent), radial-gradient(60% 100% at 100% 0%, ${clanColor(right.clan.color).to}33, transparent)`,
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <Swords className="h-4 w-4 text-gold" /> Guerre de ligues
          </h2>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", phase.tone)}>
            {war.phase === "live" && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-error align-middle" />}
            {phase.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          <PhaseLine war={war} />
        </p>

        <div className="mt-6 flex items-start gap-3 sm:gap-6">
          <SideHead side={left} won={leftWon} align="left" phase={war.phase} />
          <span className="mt-4 shrink-0 rounded-full border border-border-strong bg-bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            VS
          </span>
          <SideHead side={right} won={rightWon} align="right" phase={war.phase} />
        </div>

        {started && left.total != null && right.total != null && (
          <TugBar a={left.total} b={right.total} colorA={left.clan.color} colorB={right.clan.color} />
        )}
        {!compact && <Parts a={left} b={right} />}
        {!compact && started && <WarChart days={days} colorA={left.clan.color} colorB={right.clan.color} />}
        {!compact && me && war.phase === "live" && <MyContribution me={me} side={left} />}

        {!compact && (left.fighters.length > 0 || right.fighters.length > 0) && (
          <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <Fighters side={left} viewerId={viewerId} limit={started ? 8 : 6} />
            <Fighters side={right} viewerId={viewerId} limit={started ? 8 : 6} />
          </div>
        )}
        {war.phase === "preparing" && (
          <p className="mt-5 rounded-md border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
            Seuls les membres présents au départ combattront pendant {WAR_DAYS} jours : c&apos;est le moment de faire venir ta communauté.
          </p>
        )}
        {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}
