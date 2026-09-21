import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const profileUrls = await getPublicProfileUrls(appUrl);

  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/verification`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/changelog`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/cookies`, changeFrequency: "yearly", priority: 0.1 },
    ...profileUrls,
  ];
}
