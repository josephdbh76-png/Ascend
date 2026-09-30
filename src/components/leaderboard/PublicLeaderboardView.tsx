import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PublicNav } from "@/components/layout/PublicNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { PublicLeaderboard } from "@/components/leaderboard/PublicLeaderboard";
import { CATEGORY_PAGES, LEADERBOARD_FAQ, type CategoryPage } from "@/lib/seo";
import { getAppUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/types/database.types";

export function PublicLeaderboardView({ rows, category }: { rows: LeaderboardRow[]; category?: CategoryPage }) {
  const appUrl = getAppUrl();
  const path = category ? `/classement/${category.slug}` : "/classement";
  const heading = category ? `Classement des ${category.audience}` : "Classement des entrepreneurs aux revenus vérifiés";
  const intro = category
    ? category.intro
    : "Fondateurs SaaS, e-commerçants, marques, agences et créateurs, classés sur leurs revenus mensuels vérifiés à la source. Pas de captures d'écran retouchées ni de chiffres arrondis : chaque montant vient directement de Stripe, Shopify, PayPal, Lemon Squeezy ou de la banque du membre.";

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ASCEND", item: appUrl },
        { "@type": "ListItem", position: 2, name: "Classement", item: `${appUrl}/classement` },
        ...(category ? [{ "@type": "ListItem", position: 3, name: heading, item: `${appUrl}${path}` }] : []),
      ],
    },
    ...(rows.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: heading,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            numberOfItems: rows.length,
            itemListElement: rows.slice(0, 50).map((r) => ({
              "@type": "ListItem",
              position: r.rank,
              url: `${appUrl}/profile/${r.username}`,
              name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
            })),
          },
        ]
      : []),
    ...(!category
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: LEADERBOARD_FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <JsonLd data={structuredData} />
      <PublicNav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 sm:px-6 lg:px-8">
            <nav aria-label="Fil d'Ariane" className="text-xs text-text-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-text-primary">
                    Accueil
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  {category ? (
                    <Link href="/classement" className="hover:text-text-primary">
                      Classement
                    </Link>
                  ) : (
                    <span className="text-text-secondary">Classement</span>
                  )}
                </li>
                {category && (
                  <>
                    <li aria-hidden>/</li>
                    <li className="text-text-secondary">
                      {category.audience.charAt(0).toUpperCase() + category.audience.slice(1)}
                    </li>
                  </>
                )}
              </ol>
            </nav>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{heading}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">{intro}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-text-muted">
              <ShieldCheck className="h-4 w-4 text-gold" /> Revenus vérifiés à la source · mis à jour toutes les heures
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {/* One swipeable row on phones, wrapped on larger screens. */}
          <div
            className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Classements par activité"
          >
            <Link
              href="/classement"
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                !category ? "border-gold/60 bg-gold/10 text-gold" : "border-border text-text-secondary hover:border-border-strong",
              )}
            >
              Tous
            </Link>
            {CATEGORY_PAGES.map((c) => (
              <Link
                key={c.slug}
                href={`/classement/${c.slug}`}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  category?.slug === c.slug
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-border text-text-secondary hover:border-border-strong",
                )}
              >
                {c.audience.charAt(0).toUpperCase() + c.audience.slice(1)}
              </Link>
            ))}
          </div>

          <PublicLeaderboard rows={rows} showCategory={!category} />

          <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-6 py-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">Et toi, tu serais à quelle place ?</h2>
            <p className="max-w-md text-sm text-text-secondary">
              Connecte ta source de revenus en lecture seule et découvre ton rang en deux minutes. Tu choisis ce qui
              s&apos;affiche : montant exact, fourchette ou privé.
            </p>
            <Button href="/signup" size="lg">
              Rejoindre le classement <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-text-muted">Gratuit · sans carte bancaire</p>
          </div>
        </section>

        {!category && (
          <section className="border-t border-border">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold text-text-primary">Questions fréquentes sur le classement</h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                {LEADERBOARD_FAQ.map((f) => (
                  <div key={f.q}>
                    <dt className="text-sm font-semibold text-text-primary">{f.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-text-secondary">{f.a}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-8 text-sm text-text-secondary">
                Pour le détail des méthodes, lis{" "}
                <Link href="/verification" className="text-gold hover:underline">
                  comment ASCEND vérifie les revenus
                </Link>
                .
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
