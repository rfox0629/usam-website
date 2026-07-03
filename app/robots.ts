import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getCanonicalSiteUrl();

  return {
    host: siteUrl,
    rules: [
      {
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/auth",
          "/auth/",
          "/dos",
          "/dos/",
          "/login",
          "/missionary-intake",
          "/review",
          "/review/",
          "/testimony",
          "/testimony/",
          "/update-password",
        ],
        userAgent: "*",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
