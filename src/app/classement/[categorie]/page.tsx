import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicLeaderboard } from "@/services/leaderboard.service";
import { PublicLeaderboardView } from "@/components/leaderboard/PublicLeaderboardView";
import { CATEGORY_PAGES, categoryPageBySlug } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

/** Below this, a page is too thin to be worth indexing (it stays reachable). */
const MIN_INDEXABLE_ROWS = 3;

export function generateStaticParams() {
  return CATEGORY_PAGES.map((c) => ({ categorie: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/classement/[categorie]">): Promise<Metadata> {
  const { categorie } = await params;
  const category = categoryPageBySlug(categorie);
  if (!category) return {};
  const rows = await getPublicLeaderboard("category", category.value, 50);
  const title = `Classement des ${category.audience}`;
  const path = `/classement/${category.slug}`;
  return {
    title,
    description: category.intro,
    alternates: { canonical: path },
    robots: rows.length < MIN_INDEXABLE_ROWS ? { index: false, follow: true } : undefined,
    openGraph: { title, description: category.intro, url: path, type: "website" },
  };
}

export default async function CategoryLeaderboardPage({ params }: PageProps<"/classement/[categorie]">) {
  const { categorie } = await params;
  const category = categoryPageBySlug(categorie);
  if (!category) notFound();
  const rows = await getPublicLeaderboard("category", category.value, 50);
  return <PublicLeaderboardView rows={rows} category={category} />;
}
