import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${appUrl}/legal/cookies`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
