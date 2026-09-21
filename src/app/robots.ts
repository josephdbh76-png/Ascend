import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/onboarding", "/api", "/mfa-challenge"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
