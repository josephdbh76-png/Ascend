import Link from "next/link";
import { Swords, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WAR_MIN_VERIFIED, WAR_SCORE_PARTS } from "@/lib/creatorLeagues";
import type { LeagueWar, LeagueWarSide } from "@/services/creatorLeague.service";

const STATUS: Record<LeagueWar["status"], { label: string; className: string }> = {
  upcoming: { label: "À venir", className: "border-border-strong text-text-secondary" },
  live: { label: "En cours", className: "border-gold/50 bg-gold/10 text-gold" },
  ended: { label: "Résultat en cours de validation", className: "border-border-strong text-text-secondary" },
  closed: { label: "Terminée", className: "border-border-strong text-text-muted" },
};

const day = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

const points = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

function Side({ side, won, align }: { side: LeagueWarSide; won: boolean; align: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-1", align === "right" && "items-end text-right")}>
      <Link href={`/ligues/${side.league.slug}`} className="line-clamp-2 break-words text-sm font-semibold text-text-primary hover:text-gold">
        {side.league.name}
      </Link>
      <span className={cn("text-3xl font-semibold tabular-nums", won ? "text-gold" : "text-text-primary")}>{points(side.total)}</span>
      {won && (
        <span className="flex items-center gap-1 text-xs font-medium text-gold">
          <Crown className="h-3.5 w-3.5" /> {side.score ? "En tête" : "Vainqueur"}
        </span>
      )}
      {side.score && !side.score.eligible && (
        <span className="text-xs text-text-muted">
          {side.score.verifiedMembers}/{WAR_MIN_VERIFIED} membres vérifiés pour pouvoir gagner
        </span>
      )}
    </div>
  );
}

/** The war in progress (live score and how it's made), coming up, or its result. */
export function LeagueWarCard({ war }: { war: LeagueWar }) {
  const status = STATUS[war.status];
  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Swords className="h-4 w-4 text-gold" /> Guerre de ligues
        </h2>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Du {day(war.startsAt)} au {day(war.endsAt)}
      </p>

      <div className="mt-5 flex items-start gap-4">
        <Side side={war.a} won={war.winner === "a"} align="left" />
        <span className="mt-8 shrink-0 text-xs font-semibold uppercase text-text-muted">contre</span>
        <Side side={war.b} won={war.winner === "b"} align="right" />
      </div>

      {war.a.score && war.b.score && (
        <dl className="mt-5 grid gap-2 border-t border-border pt-4 text-xs">
          {WAR_SCORE_PARTS.map((part) => (
            <div key={part.key} className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
              <dd className="tabular-nums text-text-primary">{points(war.a.score![part.key])}</dd>
              <dt className="text-center text-text-muted">
                {part.label} <span className="hidden sm:inline">· {part.points} pts</span>
              </dt>
              <dd className="text-right tabular-nums text-text-primary">{points(war.b.score![part.key])}</dd>
            </div>
          ))}
        </dl>
      )}
      {war.status === "upcoming" && (
        <p className="mt-4 text-xs text-text-secondary">
          Seuls les membres présents au début de la guerre comptent : c&apos;est le moment de faire venir ta communauté.
        </p>
      )}
    </div>
  );
}
