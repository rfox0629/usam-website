import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getCanonicalDomainSiteForHostname } from "@/src/lib/domain-sites";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerList = await headers();
  const site = getCanonicalDomainSiteForHostname(headerList.get("x-forwarded-host") ?? headerList.get("host"));
  const siteUrl = site.canonicalOrigin;

  if (site.key !== "usam") {
    return {
      host: siteUrl,
      rules: [
        {
          disallow: "/",
          userAgent: "*",
        },
      ],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

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
          "/login",
          "/missionary-intake",
          "/ncc",
          "/ncc/",
          "/partners",
          "/partners/",
          "/prayer/apply",
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
