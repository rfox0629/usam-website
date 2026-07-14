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
          "/board-briefing",
          "/board-briefing/",
          "/dos",
          "/dos/",
          "/vision",
          "/vision/",
          "/login",
          "/missionary-intake",
          "/partners",
          "/partners/",
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
