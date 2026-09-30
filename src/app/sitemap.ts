import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicLeaderboard } from "@/services/leaderboard.service";
import { CATEGORY_PAGES } from "@/lib/seo";

// New verified members and newly populated categories show up within the hour.
export const revalidate = 3600;

/**
 * Verified public profiles are real, indexable content (a founder's
 * track record) — worth surfacing to search engines. Demo accounts and
 * anyone who hasn't finished onboarding are excluded; a username alone
 * with no verified activity isn't worth ranking.
 */
async function getPublicProfileUrls(appUrl: string): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("username, updated_at")
    .eq("is_demo", false)
    .eq("revenue_verified", true)
    .eq("onboarding_step", "done");

  return (data ?? []).map((p) => ({
    url: `${appUrl}/profile/${p.username}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}

async function getTrainingUrls(appUrl: string): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const { data } = await admin.from("trainings").select("id, updated_at").eq("status", "published").limit(1000);
  return (data ?? []).map((t) => ({
    url: `${appUrl}/formations/${t.id}`,
    lastModified: t.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
}

/** Category leaderboards are listed once they hold enough members to be indexable. */
async function getCategoryUrls(appUrl: string): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all(
    CATEGORY_PAGES.map(async (c) => ((await getPublicLeaderboard("category", c.value, 3)).length >= 3 ? c : null)),
  );
  return pages
    .filter((c) => c !== null)
    .map((c) => ({ url: `${appUrl}/classement/${c.slug}`, changeFrequency: "daily" as const, priority: 0.6 }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const [profileUrls, categoryUrls, trainingUrls] = await Promise.all([
    getPublicProfileUrls(appUrl),
    getCategoryUrls(appUrl),
    getTrainingUrls(appUrl).catch(() => []),
  ]);

  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/classement`, changeFrequency: "daily", priority: 0.9 },
    ...categoryUrls,
    { url: `${appUrl}/formations`, changeFrequency: "daily", priority: 0.8 },
    ...trainingUrls,
    { url: `${appUrl}/verification`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/changelog`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/legal/mentions`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/cookies`, changeFrequency: "yearly", priority: 0.1 },
    ...profileUrls,
  ];
}
