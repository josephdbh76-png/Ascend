import type { Metadata } from "next";
import { Flame, GraduationCap, Search } from "lucide-react";
import { ViewerShell } from "@/components/layout/ViewerShell";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { TrainingCard } from "@/components/trainings/TrainingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCurrentViewer } from "@/services/viewer.service";
import { listPublishedTrainings, listTrendingTrainings, type TrainingSort } from "@/services/training.service";
import { TRAINING_THEMES, themeLabel, trainingPath } from "@/lib/trainings";
import { getAppUrl } from "@/lib/utils";

const DESCRIPTION =
  "Formations proposées par des entrepreneurs aux revenus vérifiés : acquisition, vente, e-commerce, SaaS, IA. Des prix réservés aux membres ASCEND.";

export const metadata: Metadata = {
  title: "Formations d'entrepreneurs vérifiés",
  description: DESCRIPTION,
  alternates: { canonical: "/formations" },
  openGraph: { title: "Formations d'entrepreneurs vérifiés", description: DESCRIPTION, url: "/formations", type: "website" },
};

const SORTS: { value: string; label: string; sort: TrainingSort }[] = [
  { value: "", label: "Les plus vues", sort: "popular" },
  { value: "recentes", label: "Les plus récentes", sort: "recent" },
  { value: "prix", label: "Prix croissant", sort: "price" },
];

export default async function TrainingsPage({ searchParams }: PageProps<"/formations">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 60) : "";
  const theme = typeof params.theme === "string" ? params.theme : "";
  const sortParam = typeof params.tri === "string" ? params.tri : "";
  const sort = SORTS.find((s) => s.value === sortParam)?.sort ?? "popular";
  const hasFilters = Boolean(q || theme);

  const viewer = await getCurrentViewer();
  const [results, trending] = await Promise.all([
    listPublishedTrainings({ query: q, theme, sort }, viewer),
    hasFilters ? Promise.resolve([]) : listTrendingTrainings(viewer, 3),
  ]);
  const trendingIds = new Set(trending.map((t) => t.id));
  const rest = hasFilters ? results : results.filter((t) => !trendingIds.has(t.id));
  const appUrl = getAppUrl();

  return (
    <ViewerShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Formations sur ASCEND",
          itemListElement: results.slice(0, 30).map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${appUrl}${trainingPath(t.id)}`,
            name: t.title,
          })),
        }}
      />
      <div className="flex flex-col gap-8">
        {viewer.userId && <NetworkTabs active="trainings" />}

        <header className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
            <GraduationCap className="h-4 w-4" /> Formations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Apprendre de ceux qui ont déjà des résultats
          </h1>
          <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
            Chaque formation est proposée par un entrepreneur ASCEND et relue par l&apos;équipe. Les membres profitent de
            prix et de codes qui ne sont publiés nulle part ailleurs.
          </p>
        </header>

        <form method="get" action="/formations" className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_220px_190px_auto]">
          <label className="sr-only" htmlFor="training-q">Rechercher</label>
          <Input id="training-q" name="q" defaultValue={q} placeholder="Sujet, formateur, mot-clé..." />
          <label className="sr-only" htmlFor="training-theme">Thème</label>
          <Select id="training-theme" name="theme" defaultValue={theme}>
            <option value="">Tous les thèmes</option>
            {TRAINING_THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="training-sort">Trier</label>
          <Select id="training-sort" name="tri" defaultValue={sortParam}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button type="submit" className="h-full">
            <Search className="h-4 w-4" /> Rechercher
          </Button>
        </form>

        {trending.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-text-muted">
              <Flame className="h-4 w-4 text-gold" /> À la une cette semaine
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((t) => (
                <TrainingCard key={t.id} training={t} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          {(hasFilters || rest.length > 0) && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {hasFilters
                ? `${results.length} résultat${results.length > 1 ? "s" : ""}${theme ? ` · ${themeLabel(theme)}` : ""}`
                : "Toutes les formations"}
            </h2>
          )}
          {rest.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((t) => (
                <TrainingCard key={t.id} training={t} />
              ))}
            </div>
          ) : (
            (hasFilters || trending.length === 0) && (
              <EmptyState
                icon={GraduationCap}
                title={hasFilters ? "Aucune formation ne correspond." : "Les premières formations arrivent."}
                description={
                  hasFilters
                    ? "Essaie un autre mot-clé ou un autre thème."
                    : "Les membres qui forment d'autres entrepreneurs peuvent proposer la leur dès maintenant."
                }
              />
            )
          )}
        </section>

        <section className="flex flex-col items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Tu formes d&apos;autres entrepreneurs ?</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Présente ta formation aux membres ASCEND : elle apparaît ici et en vitrine sur ton profil.
            </p>
          </div>
          <Button href={viewer.userId ? "/app/settings#formations" : "/signup"} className="shrink-0">
            {viewer.userId ? "Proposer ma formation" : "Rejoindre ASCEND"}
          </Button>
        </section>
      </div>
    </ViewerShell>
  );
}
