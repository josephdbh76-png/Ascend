import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Medal, Swords, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { WarBoard } from "@/components/clans/WarBoard";
import { ClanEmblem } from "@/components/clans/ClanEmblem";
import { CancelDeclarationButton, DeclareWarButton, RespondWarButtons } from "@/components/clans/ClanActionButtons";
import { getMembership } from "@/services/clan.service";
import { getClanWarState, listClanWarHistory, listWarOpponents } from "@/services/clanWar.service";
import {
  WAR_DAYS,
  WAR_MIN_VERIFIED,
  WAR_PREP_HOURS,
  WAR_REMATCH_DAYS,
  WAR_RESPONSE_HOURS,
  WAR_SCORE_PARTS,
  WAR_TITLES,
  WAR_TROPHIES,
  formatPoints,
} from "@/lib/clans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Guerre · Ma ligue" };

export default async function WarCenterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const membership = await getMembership(data.user.id);
  if (!membership) redirect("/app/ligue");
  const { clan, role } = membership;
  const officer = role === "leader" || role === "coleader";
  const [state, history, opponents] = await Promise.all([
    getClanWarState(clan.id, data.user.id),
    listClanWarHistory(clan.id),
    officer ? listWarOpponents(clan.id) : Promise.resolve([]),
  ]);
  const busy = !!state.current || !!state.outgoing;
  const declareBlock = busy
    ? "Une seule guerre à la fois."
    : clan.verifiedCount < WAR_MIN_VERIFIED
      ? `Il faut ${WAR_MIN_VERIFIED} membres vérifiés dans ta ligue (${clan.verifiedCount}/${WAR_MIN_VERIFIED}).`
      : null;

  return (
    <div className="flex flex-col gap-6">
      {state.incoming.map((w) => (
        <WarBoard
          key={w.id}
          war={w}
          ownClanId={clan.id}
          viewerId={data.user!.id}
          actions={
            officer ? (
              <RespondWarButtons warId={w.id} opponent={w.a.clan.name} />
            ) : (
              <p className="text-sm text-text-secondary">{w.a.clan.name} vous défie : le chef ou un adjoint doit répondre.</p>
            )
          }
        />
      ))}

      {state.current && <WarBoard war={state.current} ownClanId={clan.id} viewerId={data.user.id} />}

      {state.outgoing && (
        <WarBoard
          war={state.outgoing}
          ownClanId={clan.id}
          viewerId={data.user.id}
          actions={
            <>
              <p className="text-sm text-text-secondary">En attente de la réponse de {state.outgoing.b.clan.name}.</p>
              {officer && <CancelDeclarationButton warId={state.outgoing.id} />}
            </>
          }
        />
      )}

      {state.lastResult && <WarBoard war={state.lastResult} ownClanId={clan.id} viewerId={data.user.id} />}

      {!busy && (
        <Card className="flex flex-col gap-4 p-5 sm:p-6" elevated>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
              <Swords className="h-5 w-5 text-gold" /> Partir en guerre
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {officer
                ? "Choisis une ligue à défier. Elle a 48 h pour accepter, puis 24 h de préparation avant 7 jours de bataille."
                : "Seuls le chef et les adjoints peuvent déclarer une guerre. Pousse-les à défier une ligue !"}
            </p>
          </div>
          {officer && (
            <div className="flex flex-col items-start gap-2">
              <DeclareWarButton
                opponents={opponents.map((o) => ({
                  id: o.id,
                  name: o.name,
                  emblem: o.emblem,
                  color: o.color,
                  trophies: o.trophies,
                  memberCount: o.memberCount,
                  verifiedCount: o.verifiedCount,
                  blockedBy: o.blockedBy,
                }))}
                disabledReason={declareBlock}
              />
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-sm font-semibold text-text-primary">Comment se calcule le score</h2>
          <p className="mt-1 text-xs text-text-secondary">Sur 100 points, ramenés à la taille de la ligue : une petite ligue active peut battre une grande.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {WAR_SCORE_PARTS.map((p) => (
              <li key={p.key} className="flex gap-3">
                <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/5 text-sm font-semibold tabular-nums text-gold">{p.points}</span>
                <span>
                  <span className="block text-sm font-medium text-text-primary">{p.label}</span>
                  <span className="block text-xs text-text-secondary">{p.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6" elevated>
          <h2 className="text-sm font-semibold text-text-primary">Les règles</h2>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-secondary">
            <li>{WAR_MIN_VERIFIED} membres vérifiés minimum de chaque côté pour pouvoir gagner.</li>
            <li>
              Réponse sous {WAR_RESPONSE_HOURS} h, {WAR_PREP_HOURS} h de préparation, puis {WAR_DAYS} jours de bataille.
            </li>
            <li>Seuls les membres présents au départ combattent.</li>
            <li>Pas de revanche contre la même ligue avant {WAR_REMATCH_DAYS} jours.</li>
            <li>
              Victoire +{WAR_TROPHIES.win} trophées, égalité +{WAR_TROPHIES.draw}, défaite {WAR_TROPHIES.loss}.
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {WAR_TITLES.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 rounded-md border border-border bg-bg-secondary px-3 py-2">
                {i === 2 ? <Crown className="h-4 w-4 text-gold" /> : i === 1 ? <Medal className="h-4 w-4 text-gold" /> : <Trophy className="h-4 w-4 text-gold" />}
                <span className="flex-1 text-sm text-text-primary">{t.name}</span>
                <span className="text-xs text-text-muted">
                  {t.wins} victoire{t.wins > 1 ? "s" : ""}
                </span>
              </div>
            ))}
            <p className="text-xs text-text-muted">Titres réservés aux combattants aux revenus vérifiés.</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6" elevated>
        <h2 className="text-sm font-semibold text-text-primary">Historique des guerres</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Pas encore de guerre terminée.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    "w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold uppercase",
                    h.result === "won" ? "bg-success/15 text-success" : h.result === "lost" ? "bg-error/15 text-error" : "bg-card-active text-text-secondary",
                  )}
                >
                  {h.result === "won" ? "Victoire" : h.result === "lost" ? "Défaite" : "Égalité"}
                </span>
                <ClanEmblem emblem={h.opponent.emblem} color={h.opponent.color} size={24} />
                <Link href={h.opponent.slug ? `/ligues/${h.opponent.slug}` : "#"} className="min-w-0 flex-1 truncate text-sm text-text-primary hover:text-gold">
                  {h.opponent.name}
                </Link>
                <span className="shrink-0 text-sm tabular-nums text-text-secondary">
                  {formatPoints(h.own)} – {formatPoints(h.other)}
                </span>
                <span className={cn("w-12 shrink-0 text-right text-xs font-medium tabular-nums", (h.trophies ?? 0) >= 0 ? "text-success" : "text-error")}>
                  {(h.trophies ?? 0) >= 0 ? "+" : ""}
                  {h.trophies ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
