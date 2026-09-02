import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMissionaryDirectory } from "@/src/lib/missionaries/queries";
import { getCanonicalDomainSiteForHostname } from "@/src/lib/domain-sites";
import { caseStudies } from "@/src/lib/mission-of-reconciliation/case-studies";

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/system", priority: 0.9 },
  { path: "/missionaries", priority: 0.9 },
  { path: "/support", priority: 0.8 },
  { path: "/financialfreedom", priority: 0.7 },
  { path: "/join", priority: 0.7 },
  { path: "/prayer", priority: 0.6 },
  { path: "/briefing", priority: 0.6 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = await headers();
  const site = getCanonicalDomainSiteForHostname(headerList.get("x-forwarded-host") ?? headerList.get("host"));
  const siteUrl = site.canonicalOrigin;
  const lastModified = new Date();

  // Mission of Reconciliation serves a whole section, so its sitemap lists the
  // host-native routes rather than just the origin.
  if (site.key === "mission-of-reconciliation") {
    return [
      { changeFrequency: "weekly" as const, lastModified, priority: 1, url: siteUrl },
      { changeFrequency: "monthly" as const, lastModified, priority: 0.8, url: `${siteUrl}/stories` },
      ...caseStudies.map((study) => ({
        changeFrequency: "monthly" as const,
        lastModified,
        priority: 0.7,
        url: `${siteUrl}/stories/${study.id}`,
      })),
      // /restoration is intentionally noindex, so it stays out of the sitemap.
    ];
  }

  if (site.key !== "usam") {
    return [
      {
        changeFrequency: "weekly" as const,
        lastModified,
        priority: 1,
        url: siteUrl,
      },
    ];
  }

  const missionaries = await getMissionaryDirectory();

  return [
    ...staticRoutes.map((route) => ({
      changeFrequency: "weekly" as const,
      lastModified,
      priority: route.priority,
      url: `${siteUrl}${route.path}`,
    })),
    ...missionaries.map((missionary) => ({
      changeFrequency: "weekly" as const,
      lastModified,
      priority: 0.8,
      url: `${siteUrl}/missionaries/${missionary.slug}`,
    })),
  ];
}
