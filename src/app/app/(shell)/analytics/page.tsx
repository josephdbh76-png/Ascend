import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Target, TrendingUp, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVerificationStatus, getRevenueHistory } from "@/services/revenue.service";
import { getBenchmarkStats, percentileToWhole } from "@/services/benchmark.service";
import { getSubscription, hasProAccess } from "@/services/subscription.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Analyses" };

function categoryLabel(value: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [verificationStatus, subscription] = await Promise.all([
    getVerificationStatus(user.id),
    getSubscription(user.id),
  ]);
  const isVerified = verificationStatus === "verified";
  const isPro = hasProAccess(subscription.tier);

  const header = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Analyses avancées</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Des statistiques réelles, calculées sur les entreprises vérifiées du réseau — jamais de chiffres inventés.
      </p>
    </div>
  );

  if (!isVerified) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          icon={ShieldCheck}
          title="Vérifie tes revenus pour débloquer tes analyses."
          description="Les benchmarks se calculent à partir de revenus vérifiés — connecte Stripe ou déclare tes revenus pour commencer."
          action={
            <Button href="/app/settings#revenus" size="sm">
              Vérifier mes revenus
            </Button>
          }
        />
      </div>
    );
  }

  const benchmark = await getBenchmarkStats(user.id);
  if (!benchmark) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState title="Pas encore assez de données pour un benchmark." description="Reviens dans quelques jours." />
      </div>
    );
  }

  const useCategory = benchmark.categoryDataReliable;
  const revenuePct = percentileToWhole(useCategory ? benchmark.categoryRevenuePercentile : benchmark.globalRevenuePercentile);
  const growthPct = percentileToWhole(useCategory ? benchmark.categoryGrowthPercentile : benchmark.globalGrowthPercentile);
  const globalRevenuePct = percentileToWhole(benchmark.globalRevenuePercentile);
  const globalGrowthPct = percentileToWhole(benchmark.globalGrowthPercentile);

  if (!isPro) {
    return (
      <div className="flex flex-col gap-8">
        {header}

        <Card className="p-6 text-center sm:p-8" elevated>
          {revenuePct != null ? (
            <p className="text-sm text-text-secondary">
              Tu es devant <span className="text-2xl font-semibold text-gold">{revenuePct}%</span>{" "}
              {useCategory ? `des entreprises ${categoryLabel(benchmark.category)} vérifiées` : "des entrepreneurs vérifiés"}.
            </p>
          ) : (
            <p className="text-sm text-text-secondary">Ton premier benchmark arrive dès ton prochain mois vérifié.</p>
          )}
          <p className="mx-auto mt-3 max-w-sm text-xs text-text-muted">
            Passe Pro pour voir la comparaison détaillée : croissance, médiane de ta catégorie, position mondiale.
          </p>
          <Button href="/app/settings#abonnement" size="sm" className="mt-4">
            Débloquer avec Pro
          </Button>
        </Card>

        <div className="pointer-events-none relative grid grid-cols-1 gap-4 opacity-40 blur-[2px] sm:grid-cols-2">
          <Card className="flex flex-col gap-2 p-6">
            <span className="h-3 w-32 rounded bg-card-elevated" />
            <span className="h-8 w-20 rounded bg-card-elevated" />
            <span className="h-3 w-full rounded bg-card-elevated" />
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <span className="h-3 w-32 rounded bg-card-elevated" />
            <span className="h-8 w-20 rounded bg-card-elevated" />
            <span className="h-3 w-full rounded bg-card-elevated" />
          </Card>
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-6 w-6 text-text-muted" />
          </div>
        </div>
      </div>
    );
  }

  const history = await getRevenueHistory(user.id, 12);

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6" elevated>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Revenu vs {useCategory ? categoryLabel(benchmark.category) : "réseau"}
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gold">{revenuePct != null ? `${revenuePct}%` : "—"}</p>
          <p className="mt-1 text-xs text-text-muted">
            {revenuePct != null ? "de tes pairs ont un revenu inférieur au tien." : "Pas encore assez de données."}
          </p>
        </Card>
        <Card className="p-6" elevated>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Croissance vs {useCategory ? categoryLabel(benchmark.category) : "réseau"}
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-success">{growthPct != null ? `${growthPct}%` : "—"}</p>
          <p className="mt-1 text-xs text-text-muted">
            {growthPct != null ? "de tes pairs ont une croissance inférieure à la tienne." : "Pas assez d'historique."}
          </p>
        </Card>
      </div>

      {benchmark.categoryMedianRevenueCents != null && (
        <Card className="p-6" elevated>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Médiane · {categoryLabel(benchmark.category)}
          </span>
          <p className="mt-2 text-sm text-text-secondary">
            La moitié des entreprises {categoryLabel(benchmark.category)} vérifiées font moins de{" "}
            <span className="font-medium text-text-primary">{formatCurrency(benchmark.categoryMedianRevenueCents)}</span>{" "}
            de revenus mensuels.
          </p>
        </Card>
      )}

      {(globalRevenuePct != null || globalGrowthPct != null) && useCategory && (
        <Card className="p-6" elevated>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Position mondiale</span>
          <p className="mt-2 text-sm text-text-secondary">
            {globalRevenuePct != null && (
              <>
                Devant <span className="font-medium text-text-primary">{globalRevenuePct}%</span> de tous les
                entrepreneurs vérifiés du réseau
              </>
            )}
            {globalGrowthPct != null && (
              <>
                {globalRevenuePct != null ? " · " : "Croissance devant "}
                <span className="font-medium text-text-primary">{globalGrowthPct}%</span> d&apos;entre eux en croissance
              </>
            )}
            .
          </p>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="p-6" elevated>
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Ta trajectoire</span>
          <div className="mt-4">
            <PerformanceChart data={history} />
          </div>
        </Card>
      )}

      <p className="text-xs text-text-muted">
        Basé sur {benchmark.categorySampleSize} entreprise{benchmark.categorySampleSize > 1 ? "s" : ""} vérifiée
        {benchmark.categorySampleSize > 1 ? "s" : ""} en {categoryLabel(benchmark.category)}
        {" · "}
        {benchmark.globalSampleSize} au total sur ASCEND.{" "}
        <Link href="/app/leaderboard" className="text-gold hover:text-gold-light">
          Voir le classement
        </Link>
      </p>
    </div>
  );
}
