import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMissionaryDirectory } from "@/src/lib/missionaries/queries";
import { getCanonicalDomainSiteForHostname } from "@/src/lib/domain-sites";
import { caseStudies, caseStudyHref } from "@/src/lib/mission-of-reconciliation/case-studies";

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/system", priority: 0.9 },
  { path: "/missionaries", priority: 0.9 },
  { path: "/mission-of-reconciliation", priority: 0.9 },
  { path: "/mission-of-reconciliation/stories", priority: 0.7 },
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
    ...caseStudies.map((study) => ({
      changeFrequency: "monthly" as const,
      lastModified,
      priority: 0.6,
      url: `${siteUrl}${caseStudyHref(study)}`,
    })),
    ...missionaries.map((missionary) => ({
      changeFrequency: "weekly" as const,
      lastModified,
      priority: 0.8,
      url: `${siteUrl}/missionaries/${missionary.slug}`,
    })),
  ];
}
