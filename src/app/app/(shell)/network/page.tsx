import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, GraduationCap, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { searchNetwork, getTrendingFounders, getNewestFounders, getNetworkTeaser } from "@/services/network.service";
import { listTrendingTrainings } from "@/services/training.service";
import { NetworkFomoTeaser } from "@/components/fomo/NetworkFomoTeaser";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { TrainingCard } from "@/components/trainings/TrainingCard";
import { NetworkSearchForm } from "./NetworkSearchForm";
import { NetworkResults } from "./NetworkResults";

export const metadata: Metadata = { title: "Réseau" };

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = user ? await getSubscription(user.id) : null;
  const isPro = subscription ? hasProAccess(subscription.tier) : false;
  const isElite = subscription ? hasEliteAccess(subscription.tier) : false;

  // City search is Elite-only — a Pro member's city param is silently
  // dropped server-side (never trusted from the URL alone), not just
  // hidden in the form.
  const cityFilter = isElite ? params.city : undefined;
  const hasFilters = !!(params.q || cityFilter || params.category);

  const [results, trending, newest, teaser, trainings] = await Promise.all([
    isPro && user && hasFilters
      ? searchNetwork({ query: params.q, city: cityFilter, category: params.category }, user.id)
      : Promise.resolve([]),
    isPro && user && !hasFilters ? getTrendingFounders(user.id) : Promise.resolve([]),
    isPro && user && !hasFilters ? getNewestFounders(user.id) : Promise.resolve([]),
    !isPro && user ? getNetworkTeaser(user.id) : Promise.resolve(null),
    // Open to every member: creators get their audience, members discover the offers.
    !hasFilters && user
      ? listTrendingTrainings({ userId: user.id, tier: subscription?.tier ?? null }, 3)
      : Promise.resolve([]),
  ]);

  const trainingsSection =
    trainings.length > 0 ? (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
            <GraduationCap className="h-4 w-4 text-gold" /> Formations à la une
          </h2>
          <Link href="/formations" className="flex items-center gap-1 text-xs font-medium text-gold hover:underline">
            Toutes les formations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainings.map((t) => (
            <TrainingCard key={t.id} training={t} />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <NetworkTabs active="founders" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Réseau</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Les bonnes personnes accélèrent les bons projets.
        </p>
      </div>

      {isPro ? (
        <>
          <NetworkSearchForm
            initialQuery={params.q ?? ""}
            initialCity={cityFilter ?? ""}
            initialCategory={params.category ?? ""}
            cityLocked={!isElite}
          />

          {!hasFilters && trainingsSection}

          {!hasFilters && trending.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
                <Flame className="h-4 w-4 text-gold" /> Tendances
              </h2>
              <NetworkResults results={trending} />
            </section>
          )}

          {!hasFilters && newest.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
                <Sparkles className="h-4 w-4 text-gold" /> Nouveaux membres
              </h2>
              <NetworkResults results={newest} />
            </section>
          )}

          {hasFilters && <NetworkResults results={results} />}
        </>
      ) : (
        <>
          <NetworkFomoTeaser
            totalActive={teaser?.totalActive ?? 0}
            sameCategoryCount={teaser?.sameCategoryCount ?? 0}
            category={teaser?.category ?? null}
          />
          {trainingsSection}
        </>
      )}
    </div>
  );
}
