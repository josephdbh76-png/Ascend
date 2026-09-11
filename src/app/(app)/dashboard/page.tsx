import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, Globe2, Flag as FlagIcon, Award, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import {
  getRevenueHistory,
  getCurrentRevenue,
  calculateMonthlyGrowth,
  getVerificationStatus,
  nextRevenueMilestone,
} from "@/services/revenue.service";
import { getUserRank, getRankMovement } from "@/services/leaderboard.service";
import { getUserAchievements } from "@/services/achievement.service";
import { getActiveChallengesWithProgress } from "@/services/challenge.service";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

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

  const [history, { current, previous }, verificationStatus, achievements, challenges] = await Promise.all([
    getRevenueHistory(user.id, 12),
    getCurrentRevenue(user.id),
    getVerificationStatus(user.id),
    getUserAchievements(user.id),
    getActiveChallengesWithProgress(user.id),
  ]);

  const growth = calculateMonthlyGrowth(current?.amountCents ?? null, previous?.amountCents ?? null);
  const isVerified = verificationStatus === "verified";

  const globalRank = isVerified ? await getUserRank(user.id, "global", "") : null;
  const countryRank =
    isVerified && profile.country ? await getUserRank(user.id, "country", profile.country) : null;
  const movement =
    isVerified && globalRank ? await getRankMovement(user.id, "global", "", globalRank.rank) : null;

  const milestone = nextRevenueMilestone(current?.amountCents ?? null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Good {timeOfDay()}, {profile.firstName ?? profile.username}.
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {business ? `${business.name} · ${categoryLabel(business.category)}` : "Complete your business profile to get started."}
        </p>
      </div>

      {!isVerified && (
        <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Your performance hasn&apos;t been verified yet.
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Connect Stripe in test mode to verify your revenue and appear on the leaderboard.
            </p>
          </div>
          <Button href="/api/stripe/connect" className="shrink-0">
            <Link2 className="h-4 w-4" /> Connect Stripe
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Revenue"
          value={current ? formatCurrency(current.amountCents) : "—"}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Growth"
          value={growth != null ? formatPercent(growth) : "—"}
          trendPositive={growth != null ? growth >= 0 : undefined}
        />
        <StatCard
          label="Global Rank"
          value={globalRank ? `#${globalRank.rank}` : "—"}
          icon={Globe2}
          trend={movement ? rankMovementLabel(movement) : undefined}
          trendPositive={movement != null ? movement > 0 : undefined}
        />
        <StatCard
          label={profile.country ? `${profile.country} Rank` : "Country Rank"}
          value={countryRank ? `#${countryRank.rank}` : "—"}
          icon={FlagIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2" elevated>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Performance
            </h2>
            <VerificationBadge status={verificationStatus} />
          </div>
          <div className="mt-4">
            {history.length > 0 ? (
              <PerformanceChart data={history} />
            ) : (
              <EmptyState
                title="No revenue history yet."
                description="Once you connect a revenue source, your monthly performance will appear here."
              />
            )}
          </div>
        </Card>

        <Card className="p-6" elevated>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Next Milestone
          </h2>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-text-primary">
                {formatCurrency(current?.amountCents ?? 0)}
              </span>
              <span className="text-sm text-text-muted">/ {formatCurrency(milestone.targetCents)}</span>
            </div>
            <ProgressBar percent={milestone.progressPercent} className="mt-3" />
            <p className="mt-3 text-sm text-text-secondary">
              {formatCurrency(milestone.targetCents)} Monthly Revenue
            </p>
            <p className="text-xs text-text-muted">{milestone.progressPercent.toFixed(0)}% complete</p>
            <Link
              href="/challenges"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:text-gold-light"
            >
              Keep climbing <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6" elevated>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Active Challenges
            </h2>
            <Link href="/challenges" className="text-xs font-medium text-gold hover:text-gold-light">
              View all
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {challenges.length === 0 ? (
              <EmptyState title="New challenges arrive every season." />
            ) : (
              challenges.slice(0, 3).map((c) => (
                <div key={c.id} className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{c.title}</span>
                    <span className="text-xs text-text-muted">{c.progress.toFixed(0)}%</span>
                  </div>
                  <ProgressBar percent={c.progress} className="mt-2" goldFill={c.status === "completed"} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6" elevated>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Achievements
            </h2>
            <Link href="/achievements" className="text-xs font-medium text-gold hover:text-gold-light">
              View all
            </Link>
          </div>
          <div className="mt-4">
            {achievements.length === 0 ? (
              <EmptyState icon={Award} title="Your first achievement is waiting." />
            ) : (
              <div className="flex flex-wrap gap-3">
                {achievements.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    title={a.description}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card text-center"
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

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function rankMovementLabel(movement: number) {
  if (movement === 0) return "No change";
  return movement > 0 ? `↑ ${movement} positions` : `↓ ${Math.abs(movement)} positions`;
}

function categoryLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
