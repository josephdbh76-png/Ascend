import type { Metadata } from "next";
import { Lock, Flame, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, hasEliteAccess } from "@/services/subscription.service";
import { searchNetwork, getTrendingFounders, getNewestFounders } from "@/services/network.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
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
  const isElite = subscription ? hasEliteAccess(subscription.tier) : false;

  const hasFilters = !!(params.q || params.city || params.category);

  const results = isElite && user
    ? await searchNetwork({ query: params.q, city: params.city, category: params.category }, user.id)
    : [];

  const [trending, newest] = isElite && user && !hasFilters
    ? await Promise.all([getTrendingFounders(user.id), getNewestFounders(user.id)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Réseau</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Les bonnes personnes accélèrent les bons projets.
        </p>
      </div>

      {isElite ? (
        <>
          <NetworkSearchForm
            initialQuery={params.q ?? ""}
            initialCity={params.city ?? ""}
            initialCategory={params.category ?? ""}
          />

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
        <EmptyState
          icon={Lock}
          title="Réservé aux membres Elite."
          description="Recherche des fondateurs par nom, ville ou activité, et suis-les — une fonctionnalité Elite."
          action={
            <Button href="/api/stripe/checkout?tier=elite" size="sm">
              Passer Elite
            </Button>
          }
        />
      )}
    </div>
  );
}
