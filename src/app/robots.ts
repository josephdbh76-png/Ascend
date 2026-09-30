import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        // Share cards are link-preview images: LinkedIn and X honour robots.txt.
        allow: ["/", "/api/share/"],
        disallow: ["/app", "/onboarding", "/api", "/mfa-challenge"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
