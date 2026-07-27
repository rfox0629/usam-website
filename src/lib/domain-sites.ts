export type DomainSiteKey = "usam" | "kitchen-table-gospel" | "discipleship-operating-system";

export type DomainSiteConfig = {
  analyticsBrand: string;
  appleTouchIconPath: string;
  canonicalOrigin: string;
  description: string;
  favicon16Path: string;
  favicon32Path: string;
  favicon48Path: string;
  faviconPath: string;
  faviconSvgPath: string;
  icon192Path: string;
  icon512Path: string;
  key: DomainSiteKey;
  manifestPath: string;
  rootPath: string;
  siteName: string;
  socialImage: {
    alt: string;
    height: number;
    path: string;
    width: number;
  };
  title: string;
  titleTemplate: string;
};

const usamSocialImage = {
  alt: "USA Missionaries field landscape",
  height: 916,
  path: "/images/usam/default-hero-background.png",
  width: 1718,
} as const;

export const domainRouteHeader = "x-usam-domain-route";
export const domainSiteRoutePrefix = "/domain-sites";

export const domainSites = {
  usam: {
    analyticsBrand: "usam",
    appleTouchIconPath: "/apple-touch-icon.png",
    canonicalOrigin: "https://usamissionaries.org",
    description: "The Mission Is Active",
    favicon16Path: "/favicon-16x16.png",
    favicon32Path: "/favicon-32x32.png",
    favicon48Path: "/favicon-48x48.png",
    faviconPath: "/favicon.ico",
    faviconSvgPath: "/favicon.svg",
    icon192Path: "/icon-192.png",
    icon512Path: "/icon-512.png",
    key: "usam",
    manifestPath: "/site.webmanifest",
    rootPath: "/",
    siteName: "USA Missionaries",
    socialImage: usamSocialImage,
    title: "USA Missionaries",
    titleTemplate: "%s | USA Missionaries",
  },
  "kitchen-table-gospel": {
    analyticsBrand: "kitchen_table_gospel",
    appleTouchIconPath: "/favicons/kitchen-table-gospel/apple-touch-icon.png",
    canonicalOrigin: "https://kitchentablegospel.org",
    description: "Practical, table-shaped discipleship: learning, obeying, and teaching the commands of Jesus in real relationships.",
    favicon16Path: "/favicons/kitchen-table-gospel/favicon-16x16.png",
    favicon32Path: "/favicons/kitchen-table-gospel/favicon-32x32.png",
    favicon48Path: "/favicons/kitchen-table-gospel/favicon-48x48.png",
    faviconPath: "/favicons/kitchen-table-gospel/favicon.ico",
    faviconSvgPath: "/favicons/kitchen-table-gospel/favicon.svg",
    icon192Path: "/favicons/kitchen-table-gospel/icon-192.png",
    icon512Path: "/favicons/kitchen-table-gospel/icon-512.png",
    key: "kitchen-table-gospel",
    manifestPath: "/favicons/kitchen-table-gospel/site.webmanifest",
    rootPath: `${domainSiteRoutePrefix}/kitchen-table-gospel`,
    siteName: "Kitchen Table Gospel",
    socialImage: {
      alt: "Kitchen Table Gospel gathering around a table",
      height: 1536,
      path: "/images/vision/kitchen-table-01.jpg",
      width: 2048,
    },
    title: "Kitchen Table Gospel",
    titleTemplate: "%s | Kitchen Table Gospel",
  },
  "discipleship-operating-system": {
    analyticsBrand: "dos",
    appleTouchIconPath: "/favicons/dos/apple-touch-icon.png",
    canonicalOrigin: "https://discipleshipoperatingsystem.com",
    description: "DOS is a ministry memory and accountability system: one clear, simple place for the people you're discipling, the prayers you've promised, and the rhythms you share.",
    favicon16Path: "/favicons/dos/favicon-16x16.png",
    favicon32Path: "/favicons/dos/favicon-32x32.png",
    favicon48Path: "/favicons/dos/favicon-48x48.png",
    faviconPath: "/favicons/dos/favicon.ico",
    faviconSvgPath: "/favicons/dos/favicon.svg",
    icon192Path: "/favicons/dos/icon-192.png",
    icon512Path: "/favicons/dos/icon-512.png",
    key: "discipleship-operating-system",
    manifestPath: "/favicons/dos/site.webmanifest",
    rootPath: `${domainSiteRoutePrefix}/discipleship-operating-system`,
    siteName: "Discipleship Operating System",
    socialImage: {
      alt: "Discipleship Operating System mobile interface preview",
      height: 1450,
      path: "/images/vision/dos-circles.jpg",
      width: 750,
    },
    title: "DOS | Never lose a person or a moment that matters",
    titleTemplate: "%s | Discipleship Operating System",
  },
} as const satisfies Record<DomainSiteKey, DomainSiteConfig>;

export const ga4CrossDomainHosts = [
  "usamissionaries.org",
  "www.usamissionaries.org",
  "usamissionaries.com",
  "www.usamissionaries.com",
  "kitchentablegospel.org",
  "www.kitchentablegospel.org",
  "ktgospel.com",
  "www.ktgospel.com",
  "discipleshipoperatingsystem.com",
  "www.discipleshipoperatingsystem.com",
];

const siteByHostname: Record<string, DomainSiteConfig> = {
  "usamissionaries.org": domainSites.usam,
  "www.usamissionaries.org": domainSites.usam,
  "usamissionaries.com": domainSites.usam,
  "www.usamissionaries.com": domainSites.usam,
  "kitchentablegospel.org": domainSites["kitchen-table-gospel"],
  "www.kitchentablegospel.org": domainSites["kitchen-table-gospel"],
  "ktgospel.com": domainSites["kitchen-table-gospel"],
  "www.ktgospel.com": domainSites["kitchen-table-gospel"],
  "discipleshipoperatingsystem.com": domainSites["discipleship-operating-system"],
  "www.discipleshipoperatingsystem.com": domainSites["discipleship-operating-system"],
};

export function normalizeHostname(hostname?: string | null) {
  const normalized = hostname
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("[")) {
    return normalized.replace(/^\[|\](?::\d+)?$/g, "");
  }

  return normalized.split(":")[0] ?? "";
}

export function getDomainSiteByHostname(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);

  return siteByHostname[normalizedHostname] ?? null;
}

export function getCanonicalDomainSiteForHostname(hostname?: string | null) {
  return getDomainSiteByHostname(hostname) ?? domainSites.usam;
}

export function getAlternateDomainSiteByHostname(hostname?: string | null) {
  const site = getDomainSiteByHostname(hostname);

  return site && site.key !== "usam" ? site : null;
}
