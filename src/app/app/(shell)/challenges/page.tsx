import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Crown, Flag, Gem, Package, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveChallengesWithProgress, getChallengeCompletionRates } from "@/services/challenge.service";
import { refreshMemberProgress } from "@/services/progress.service";
import {
  getActiveSeason,
  getSeasonRewards,
  getSeasonStandings,
  getUserSeasonStanding,
  getUserSeasonResults,
} from "@/services/season.service";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { ShareCardButton } from "@/components/achievements/ShareCardButton";
import { getProfile } from "@/services/profile.service";
import { seasonShortName } from "@/lib/share/params";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { cn, initials } from "@/lib/utils";
import type { SeasonRewardKind } from "@/types/database.types";

export const metadata: Metadata = { title: "Saison et défis" };

const REWARD_ICONS: Record<SeasonRewardKind, typeof Gem> = { title: Gem, trophy: Trophy, physical: Package };

function timeLeft(endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return { days, hours, over: ms === 0 };
}

function rankLabel(from: number, to: number) {
  if (from === to) return from === 1 ? "1re place" : `${from}e place`;
  return `De la ${from}e à la ${to}e place`;
}

export default async function SeasonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Progress is recomputed from server-side data when the page opens.
  await refreshMemberProgress(user.id).catch((err) => console.error("Progress refresh failed:", err));

  const season = await getActiveSeason();
  const [challenges, completionRates, rewards, standings, myStanding, pastResults, profile] = await Promise.all([
    getActiveChallengesWithProgress(user.id, season?.id),
    getChallengeCompletionRates(),
    season ? getSeasonRewards(season.id) : Promise.resolve([]),
    season ? getSeasonStandings(season.id, 10) : Promise.resolve([]),
    season ? getUserSeasonStanding(season.id, user.id) : Promise.resolve(null),
    getUserSeasonResults(user.id),
    getProfile(user.id),
  ]);

  const left = season ? timeLeft(season.endsAt) : null;
  const earnedPoints = challenges.filter((c) => c.status === "completed").reduce((sum, c) => sum + c.points, 0);
  const availablePoints = challenges.reduce((sum, c) => sum + c.points, 0);
  const ahead = myStanding && myStanding.rank > 1 ? standings.find((s) => Number(s.rank) === myStanding.rank - 1) : null;
  const gap = ahead && myStanding ? Number(ahead.points) - myStanding.points + 1 : null;
  const sorted = [...challenges].sort((a, b) => {
    if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
    return b.progress - a.progress;
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-gold/30 bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-[radial-gradient(closest-side,rgba(214,168,79,0.18),transparent)]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">{season?.name ?? "Saison ASCEND"}</span>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">{season?.label ?? "Défis"}</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {season?.description ??
                "Chaque défi réussi pendant la saison rapporte des points. Les mieux classés remportent des récompenses exclusives."}
            </p>
            {left && !left.over && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-gold">
                <Clock className="h-4 w-4" />
                Fin dans {left.days} jour{left.days > 1 ? "s" : ""} et {left.hours} h
              </p>
            )}
          </div>

          {season && (
            <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
              <div className="rounded-md border border-border bg-bg-primary/60 p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Ton rang</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gold">{myStanding ? `#${myStanding.rank}` : "—"}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary/60 p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">Tes points</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{earnedPoints}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary/60 p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">À gagner</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{Math.max(0, availablePoints - earnedPoints)}</p>
              </div>
            </div>
          )}
        </div>
        {season && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {!myStanding
                ? "Réussis ton premier défi pour entrer au classement de la saison."
                : myStanding.rank === 1
                  ? "Tu mènes la saison. Continue pour garder ta place jusqu'au bout."
                  : gap
                    ? `Encore ${gap} point${gap > 1 ? "s" : ""} pour passer #${myStanding.rank - 1}.`
                    : "Chaque défi réussi te fait grimper au classement de la saison."}
            </p>
            {myStanding && profile && (
              <ShareCardButton
                target={{ kind: "season", username: profile.username, id: season.id }}
                itemName={`#${myStanding.rank} de la ${seasonShortName(season.number)}`}
                label="Partager mon rang"
              />
            )}
          </div>
        )}
      </section>

      {rewards.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <Crown className="h-4 w-4 text-gold" /> À gagner en fin de saison
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Object.values(
              rewards.reduce<Record<string, typeof rewards>>((acc, r) => {
                const key = `${r.rankFrom}-${r.rankTo}`;
                (acc[key] ??= []).push(r);
                return acc;
              }, {}),
            ).map((group) => (
              <Card key={`${group[0].rankFrom}-${group[0].rankTo}`} className="flex flex-col gap-2 p-4" elevated>
                <span className="text-xs font-semibold uppercase tracking-wide text-gold">{rankLabel(group[0].rankFrom, group[0].rankTo)}</span>
                <ul className="flex flex-col gap-1.5">
                  {group.map((r) => {
                    const Icon = REWARD_ICONS[r.kind];
                    return (
                      <li key={r.id} className="flex items-start gap-2 text-sm text-text-primary">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {r.label}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
          <Flag className="h-4 w-4 text-gold" /> Défis de la saison
        </h2>
        {sorted.length === 0 ? (
          <EmptyState icon={Flag} title="Le prochain défi arrive bientôt." description="Reviens vite." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((c) => (
              <ChallengeCard key={c.id} challenge={c} completionRate={completionRates[c.id]} />
            ))}
          </div>
        )}
      </section>

      {season && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <Trophy className="h-4 w-4 text-gold" /> Classement de la saison
          </h2>
          {standings.length === 0 ? (
            <EmptyState icon={Trophy} title="Personne n'a encore marqué de points." description="Les premières places sont libres." />
          ) : (
            <ol className="flex flex-col overflow-hidden rounded-lg border border-border">
              {standings.map((s) => (
                <li
                  key={s.user_id}
                  className={cn(
                    "flex items-center gap-3 border-b border-border px-4 py-3 last:border-0",
                    s.is_current_user ? "bg-gold/5" : "bg-card",
                  )}
                >
                  <span className={cn("w-8 text-sm font-semibold tabular-nums", Number(s.rank) <= 3 ? "text-gold" : "text-text-muted")}>
                    #{s.rank}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-elevated text-xs font-semibold text-gold">
                    {s.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(s.first_name, s.last_name)
                    )}
                  </span>
                  <Link href={`/profile/${s.username}`} className="min-w-0 flex-1 truncate text-sm text-text-primary hover:underline">
                    {s.first_name} {s.last_name} {s.is_current_user && <span className="text-xs text-gold">(toi)</span>}
                  </Link>
                  <span className="text-xs text-text-muted">{s.completed_count} défis</span>
                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-text-primary">{s.points} pts</span>
                </li>
              ))}
            </ol>
          )}
          {myStanding && myStanding.rank > standings.length && (
            <p className="mt-2 text-center text-xs text-text-muted">
              Tu es #{myStanding.rank} avec {myStanding.points} points.
            </p>
          )}
        </section>
      )}

      {pastResults.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Tes saisons passées</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pastResults.map((r) => (
              <li key={r.seasonId} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-text-primary">{r.seasonName}</p>
                <p className="text-xs text-text-muted">
                  #{r.rank} · {r.points} points{r.rewards.length > 0 && ` · ${r.rewards.join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
