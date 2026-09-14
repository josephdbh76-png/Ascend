import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/cookies`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
