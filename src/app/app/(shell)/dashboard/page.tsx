import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, Globe2, Flag as FlagIcon, Award, Users, ShoppingBag } from "lucide-react";
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
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { RankTransition } from "@/components/motion/RankTransition";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("name, category")
    .eq("user_id", user.id)
    .maybeSingle();

  const [history, { current, previous }, verificationStatus, achievements, challenges, unreadAchievement, { count: memberCount }] =
    await Promise.all([
      getRevenueHistory(user.id, 12),
      getCurrentRevenue(user.id),
      getVerificationStatus(user.id),
      getUserAchievements(user.id),
      getActiveChallengesWithProgress(user.id),
      getLatestUnreadOfType(user.id, "achievement_unlocked"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_demo", false),
    ]);

  const growth = calculateMonthlyGrowth(current?.amountCents ?? null, previous?.amountCents ?? null);
  const isVerified = verificationStatus === "verified";

  const globalRank = isVerified ? await getUserRank(user.id, "global", "") : null;
  const countryRank =
    isVerified && profile.country ? await getUserRank(user.id, "country", profile.country) : null;
  const movement =
    isVerified && globalRank ? await getRankMovement(user.id, "global", "", globalRank.rank) : null;
  const benchmark = isVerified ? await getBenchmarkStats(user.id) : null;

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

  let foundingSupply: number | null = null;
  let remainingFoundingSlots: number | null = null;
  if (!isVerified) {
    const { data: foundingTitle } = await supabase
      .from("titles")
      .select("supply, remaining_supply")
      .eq("id", "founding-member")
      .maybeSingle();
    foundingSupply = foundingTitle?.supply ?? null;
    remainingFoundingSlots = foundingTitle?.remaining_supply ?? null;
  }

  let unlockedAchievement: { id: string; name: string; description: string } | null = null;
  if (unreadAchievement) {
    const achievementId = unreadAchievement.metadata.achievement_id as string | undefined;
    if (achievementId) {
      const catalog = await getAllAchievementCatalog();
      const def = catalog.find((a) => a.id === achievementId);
      if (def) unlockedAchievement = { id: def.id, name: def.name, description: def.description };
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <StripeStatusToast />
      </Suspense>

      {!profile.hasSeenTutorial && (
        <OnboardingTour firstName={profile.firstName} memberCount={memberCount ?? 0} isVerified={isVerified} />
      )}

      {unlockedAchievement && (
        <AchievementUnlockGate
          notificationId={unreadAchievement!.id}
          achievementName={unlockedAchievement.name}
          achievementDescription={unlockedAchievement.description}
          username={profile.username}
        />
      )}

      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-text-primary">
          {timeOfDayGreeting()}, {profile.firstName ?? profile.username} 👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {business
            ? `${business.name} · ${categoryLabel(business.category)}`
            : "Voici l'évolution de ton activité."}
        </p>
      </div>

      {!isVerified && (
        <VerificationCTA remainingFoundingSlots={remainingFoundingSlots} foundingSupply={foundingSupply} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenus mensuels"
          value={current ? formatCurrency(current.amountCents) : "—"}
          icon={TrendingUp}
          trend={previous ? `${formatCurrency(previous.amountCents)} le mois dernier` : undefined}
          accent
        />
        <StatCard
          label="Croissance"
          value={growth != null ? formatPercent(growth) : "—"}
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
          value={countryRank ? `#${countryRank.rank}` : "—"}
          icon={FlagIcon}
        />
      </div>

      {benchmark && <BenchmarkCard stats={benchmark} />}

      {(current?.customerCount != null || avgBasketCents != null) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Clients ce mois-ci"
            value={current?.customerCount != null ? current.customerCount.toLocaleString("fr-FR") : "—"}
            icon={Users}
          />
          <StatCard
            label="Panier moyen"
            value={avgBasketCents != null ? formatCurrency(avgBasketCents) : "—"}
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
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Performance</h2>
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
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Prochain palier</h2>
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
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Défis en cours</h2>
            <Link href="/app/challenges" className="text-xs font-medium text-gold hover:text-gold-light">
              Tout voir
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {challenges.length === 0 ? (
              <EmptyState title="Le prochain défi arrive bientôt." />
            ) : (
              challenges.slice(0, 3).map((c) => (
                <div key={c.id} className="border border-border bg-card p-4 transition-colors duration-200 ease-out hover:border-gold/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{c.title}</span>
                    <span className="text-xs text-text-muted">{c.progress.toFixed(0)} %</span>
                  </div>
                  <ProgressBar percent={c.progress} className="mt-2" goldFill={c.status === "completed"} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6" elevated hover>
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Accomplissements</h2>
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
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 border border-border bg-card text-center transition-colors duration-200 ease-out hover:border-gold/40 hover:bg-gold/5"
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

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}

function rankMovementLabel(movement: number) {
  if (movement === 0) return "Aucun changement";
  return movement > 0 ? `↑ ${movement} places` : `↓ ${Math.abs(movement)} places`;
}

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
