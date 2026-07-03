import type { MetadataRoute } from "next";
import { getMissionaryDirectory } from "@/src/lib/missionaries/queries";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

const staticRoutes = [
  { path: "/", priority: 1 },
  { path: "/missionaries", priority: 0.9 },
  { path: "/support", priority: 0.8 },
  { path: "/financialfreedom", priority: 0.7 },
  { path: "/join", priority: 0.7 },
  { path: "/prayer", priority: 0.6 },
  { path: "/briefing", priority: 0.6 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl();
  const lastModified = new Date();
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
