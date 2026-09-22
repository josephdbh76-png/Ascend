import type { Metadata } from "next";
import { Flame, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasProAccess, hasEliteAccess } from "@/services/subscription.service";
import { searchNetwork, getTrendingFounders, getNewestFounders, getNetworkTeaser } from "@/services/network.service";
import { listActiveDeals } from "@/services/deal.service";
import { NetworkFomoTeaser } from "@/components/fomo/NetworkFomoTeaser";
import { DealsSection } from "@/components/network/DealsSection";
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

  const results = isPro && user
    ? await searchNetwork({ query: params.q, city: cityFilter, category: params.category }, user.id)
    : [];

  const [trending, newest] = isPro && user && !hasFilters
    ? await Promise.all([getTrendingFounders(user.id), getNewestFounders(user.id)])
    : [[], []];

  const teaser = !isPro && user ? await getNetworkTeaser(user.id) : null;
  const deals = isElite ? await listActiveDeals() : [];

  return (
    <div className="flex flex-col gap-6">
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

          {isElite && !hasFilters && <DealsSection deals={deals} />}

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
        <NetworkFomoTeaser
          totalActive={teaser?.totalActive ?? 0}
          sameCategoryCount={teaser?.sameCategoryCount ?? 0}
          category={teaser?.category ?? null}
        />
      )}
    </div>
  );
}
