import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, Globe2, Flag as FlagIcon, Award, Users, ShoppingBag, Eye, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import {
  getRevenueHistory,
  getCurrentRevenue,
  calculateMonthlyGrowth,
  getVerificationStatus,
  nextRevenueMilestone,
  estimateMonthsToMilestone,
} from "@/services/revenue.service";
import { getUserRank, getRankMovement } from "@/services/leaderboard.service";
import { getBenchmarkStats } from "@/services/benchmark.service";
import { getUserAchievements, getAllAchievementCatalog } from "@/services/achievement.service";
import { getActiveChallengesWithProgress } from "@/services/challenge.service";
import { getLatestUnreadOfType } from "@/services/notification.service";
import { getProfileViewCount } from "@/services/profileView.service";
import { getRecentFollowerCount } from "@/services/network.service";
import { listActiveBanners } from "@/services/banner.service";
import { getSubscription } from "@/services/subscription.service";
import { getActiveSeason, getUserSeasonStanding } from "@/services/season.service";
import { getSeasonLeague } from "@/services/league.service";
import { league as leagueDef } from "@/lib/leagues";
import { DashboardBannerCarousel } from "@/components/dashboard/DashboardBannerCarousel";
import { AutoRevenueSync } from "@/components/dashboard/AutoRevenueSync";
import { isRevenueSyncStale, AUTO_SYNC_PROVIDERS } from "@/lib/revenueSync";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { BenchmarkCard } from "@/components/dashboard/BenchmarkCard";
import { StripeStatusToast } from "@/components/dashboard/StripeStatusToast";
import { VerificationCTA } from "@/components/dashboard/VerificationCTA";
import { AchievementUnlockGate } from "@/components/dashboard/AchievementUnlockGate";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { BetaNotice } from "@/components/dashboard/BetaNotice";
import { getBetaMode } from "@/services/platform.service";
import { LEGAL } from "@/lib/legal";
import { RankTransition } from "@/components/motion/RankTransition";
import { CurrencyCountUp, PercentCountUp, PlainCountUp, RankCountUp } from "@/components/motion/CountUp";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { AchievementRarity } from "@/types/database.types";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: PageProps<"/app/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const [
    { data: business },
    history,
    { current, previous, inProgress },
    verificationStatus,
    achievements,
    challenges,
    unreadAchievement,
    { count: memberCount },
    profileViews,
    recentFollowers,
    banners,
    { data: connectedSources },
  ] = await Promise.all([
    supabase.from("businesses").select("name, category").eq("user_id", user.id).maybeSingle(),
    getRevenueHistory(user.id, 12),
    getCurrentRevenue(user.id),
    getVerificationStatus(user.id),
    getUserAchievements(user.id),
    getActiveChallengesWithProgress(user.id),
    getLatestUnreadOfType(user.id, "achievement_unlocked"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_demo", false),
    getProfileViewCount(user.id, 7),
    getRecentFollowerCount(user.id, 7),
    getSubscription(user.id).then((sub) => listActiveBanners(sub.tier)),
    supabase
      .from("revenue_sources")
      .select("last_synced_at")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .in("provider", [...AUTO_SYNC_PROVIDERS]),
  ]);
  const hasStaleSource = (connectedSources ?? []).some((s) => isRevenueSyncStale(s.last_synced_at));
  const replayTour = (await searchParams).visite === "1";
  const beta = await getBetaMode();
  const showTour = replayTour || !profile.hasSeenTutorial;
  const season = await getActiveSeason();
  const [seasonStanding, seasonPlacement] = season
    ? await Promise.all([getUserSeasonStanding(season.id, user.id), getSeasonLeague(user.id, season)])
    : [null, null];
  const seasonLeague = seasonPlacement ? leagueDef(seasonPlacement.league) : null;
  const seasonDaysLeft = season ? daysUntil(season.endsAt) : null;
  const nextChallenges = challenges
    .filter((c) => c.status !== "completed" && (!season || c.seasonId === season.id))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  const growth = calculateMonthlyGrowth(current?.amountCents ?? null, previous?.amountCents ?? null);
  const isVerified = verificationStatus === "verified";

  const [globalRank, countryRank, benchmark] = await Promise.all([
    isVerified ? getUserRank(user.id, "global", "") : Promise.resolve(null),
    isVerified && profile.country ? getUserRank(user.id, "country", profile.country) : Promise.resolve(null),
    isVerified ? getBenchmarkStats(user.id) : Promise.resolve(null),
  ]);
  const movement =
    isVerified && globalRank ? await getRankMovement(user.id, "global", "", globalRank.rank) : null;

  const milestone = nextRevenueMilestone(current?.amountCents ?? null);
  const remainingToMilestone = current ? milestone.targetCents - current.amountCents : milestone.targetCents;
  const monthsToMilestone = estimateMonthsToMilestone(
    current?.amountCents ?? null,
    previous?.amountCents ?? null,
    remainingToMilestone,
  );
  const avgBasketCents =
    current?.transactionCount != null && current.transactionCount > 0
      ? Math.round(current.amountCents / current.transactionCount)
      : null;


  let unlockedAchievement: { id: string; name: string; description: string; rarity: AchievementRarity } | null = null;
  if (unreadAchievement) {
    const achievementId = unreadAchievement.metadata.achievement_id as string | undefined;
    if (achievementId) {
      const catalog = await getAllAchievementCatalog();
      const def = catalog.find((a) => a.id === achievementId);
      if (def) unlockedAchievement = { id: def.id, name: def.name, description: def.description, rarity: def.rarity };
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <StripeStatusToast />
      </Suspense>
      {hasStaleSource && <AutoRevenueSync />}

      {beta.enabled && <BetaNotice since={beta.since} contactEmail={LEGAL.contactEmail} />}

      {showTour && (
        <ProductTour
          firstName={profile.firstName}
          memberCount={memberCount ?? 0}
          isVerified={isVerified}
          seasonDaysLeft={seasonDaysLeft}
          replay={replayTour}
        />
      )}

      {/* Never two overlays at once: the celebration waits for the next visit. */}
      {unlockedAchievement && !showTour && (
        <AchievementUnlockGate
          notificationId={unreadAchievement!.id}
          achievementId={unlockedAchievement.id}
          achievementName={unlockedAchievement.name}
          achievementDescription={unlockedAchievement.description}
          achievementRarity={unlockedAchievement.rarity}
          username={profile.username}
        />
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {timeOfDayGreeting()}, {profile.firstName ?? profile.username}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {business
            ? `${business.name} · ${categoryLabel(business.category)}`
            : "Voici l'évolution de ton activité."}
        </p>
      </div>

      <DashboardBannerCarousel banners={banners} />

      <ActivationChecklist
        items={[
          { label: "Ajoute une bio et le nom de ton activité", done: !!profile.bio && !!business?.name, href: "/app/settings" },
          { label: "Vérifie tes revenus", done: isVerified, href: "/app/settings#comptes-connectes" },
          { label: "Ajoute tes compétences", done: profile.skills.length > 0, href: "/app/settings" },
          { label: "Débloque ton premier accomplissement", done: achievements.length > 0, href: "/app/achievements" },
        ]}
      />

      {!isVerified && (
        <VerificationCTA foundingMemberNumber={profile.foundingMemberNumber} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={current ? `Revenus · ${monthName(current.period)}` : "Revenus mensuels"}
          value={current ? <CurrencyCountUp value={current.amountCents} /> : "—"}
          icon={TrendingUp}
          trend={
            inProgress
              ? `${capitalize(monthName(inProgress.period))} en cours : ${formatCurrency(inProgress.amountCents)}`
              : previous
                ? `${formatCurrency(previous.amountCents)} le mois précédent`
                : undefined
          }
          accent
        />
        <StatCard
          label="Croissance"
          value={growth != null ? <PercentCountUp value={growth} decimals={1} /> : "—"}
          trendPositive={growth != null ? growth >= 0 : undefined}
        />
        <StatCard
          label="Classement mondial"
          value={
            globalRank ? (
              <RankTransition from={movement ? globalRank.rank + movement : null} to={globalRank.rank} />
            ) : (
              "—"
            )
          }
          icon={Globe2}
          trend={movement ? rankMovementLabel(movement) : undefined}
          trendPositive={movement != null ? movement > 0 : undefined}
        />
        <StatCard
          label={profile.country ? `Classement ${profile.country}` : "Classement pays"}
          value={countryRank ? <RankCountUp value={countryRank.rank} /> : "—"}
          icon={FlagIcon}
        />
      </div>

      {benchmark && <BenchmarkCard stats={benchmark} />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Vues de ton profil (7 jours)"
          value={<PlainCountUp value={profileViews} />}
          icon={Eye}
        />
        <StatCard
          label="Nouveaux abonnés (7 jours)"
          value={<PlainCountUp value={recentFollowers} />}
          icon={UserPlus}
        />
      </div>

      {(current?.customerCount != null || avgBasketCents != null) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Clients ce mois-ci"
            value={
              current?.customerCount != null ? (
                <PlainCountUp value={current.customerCount} />
              ) : (
                "—"
              )
            }
            icon={Users}
          />
          <StatCard
            label="Panier moyen"
            value={avgBasketCents != null ? <CurrencyCountUp value={avgBasketCents} /> : "—"}
            icon={ShoppingBag}
            trend={
              current?.transactionCount != null
                ? `${current.transactionCount} transaction${current.transactionCount > 1 ? "s" : ""} ce mois-ci`
                : undefined
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2" elevated hover>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Performance</h2>
            <VerificationBadge status={verificationStatus} />
          </div>
          <div className="mt-4">
            {history.length > 0 ? (
              <PerformanceChart data={history} />
            ) : (
              <EmptyState
                title="Pas encore d'historique de revenus."
                description="Une fois ta source de revenus connectée, ta performance mensuelle apparaîtra ici."
              />
            )}
          </div>
        </Card>

        <Card className="p-6" elevated hover>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Prochain palier</h2>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-text-primary">
                {formatCurrency(current?.amountCents ?? 0)}
              </span>
              <span className="text-sm text-text-muted">/ {formatCurrency(milestone.targetCents)}</span>
            </div>
            <ProgressBar percent={milestone.progressPercent} className="mt-3" />
            {current && remainingToMilestone > 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                Encore <span className="font-medium text-gold">{formatCurrency(remainingToMilestone)}</span> pour
                atteindre ton prochain palier.
              </p>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                Palier des {formatCurrency(milestone.targetCents)} mensuels
              </p>
            )}
            <p className="text-xs text-text-muted">{milestone.progressPercent.toFixed(0)} % atteint</p>
            {monthsToMilestone != null && (
              <p className="mt-1 text-xs text-text-muted">
                À ce rythme : {monthsToMilestone} mois avant ce palier
              </p>
            )}
            <Link
              href="/app/challenges"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:text-gold-light"
            >
              Continue de grimper <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6" elevated hover>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {season ? season.name : "Défis en cours"}
            </h2>
            <Link href="/app/challenges" className="text-xs font-medium text-gold hover:text-gold-light">
              Voir la saison
            </Link>
          </div>
          {season && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {seasonLeague && (
                <span className={`self-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${seasonLeague.tone}`}>
                  Ligue {seasonLeague.name}
                </span>
              )}
              <span className="text-2xl font-semibold tabular-nums text-gold">{seasonStanding ? `#${seasonStanding.rank}` : "—"}</span>
              <span className="text-sm text-text-secondary">
                {seasonStanding ? `${seasonStanding.points} points` : "Pas encore de points"}
              </span>
              {seasonDaysLeft != null && (
                <span className="text-xs text-text-muted">
                  Fin dans {seasonDaysLeft} jour{seasonDaysLeft > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {nextChallenges.length === 0 ? (
              <EmptyState title={challenges.length > 0 ? "Tous les défis de la saison sont réussis." : "Le prochain défi arrive bientôt."} />
            ) : (
              nextChallenges.map((c) => (
                <div key={c.id} className="rounded-md border border-border bg-card p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-gold/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">{c.title}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {c.points > 0 && <span className="mr-2 font-semibold text-gold">+{c.points} pts</span>}
                      {c.progress.toFixed(0)} %
                    </span>
                  </div>
                  <ProgressBar percent={c.progress} className="mt-2" />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6" elevated hover>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Accomplissements</h2>
            <Link href="/app/achievements" className="text-xs font-medium text-gold hover:text-gold-light">
              Tout voir
            </Link>
          </div>
          <div className="mt-4">
            {achievements.length === 0 ? (
              <EmptyState icon={Award} title="Ton premier accomplissement t'attend." />
            ) : (
              <div className="flex flex-wrap gap-3">
                {achievements.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    title={a.description}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-gold/40 hover:bg-gold/5"
                  >
                    <Award className="h-4 w-4 text-gold" />
                    <span className="px-1 text-[9px] leading-tight text-text-secondary">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function monthName(period: string) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(`${period}T00:00:00Z`));
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function timeOfDayGreeting() {
  // Rendered on the server (UTC): use the members' time zone, not the machine's.
  const h = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).format(new Date()));
  return h >= 5 && h < 18 ? "Bonjour" : "Bonsoir";
}

function rankMovementLabel(movement: number) {
  if (movement === 0) return "Aucun changement";
  return movement > 0 ? `↑ ${movement} places` : `↓ ${Math.abs(movement)} places`;
}

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
