export type DomainSiteKey = "usam" | "kitchen-table-gospel" | "discipleship-operating-system";

export type DomainSiteConfig = {
  analyticsBrand: string;
  canonicalOrigin: string;
  description: string;
  faviconPath: string;
  key: DomainSiteKey;
  rootPath: string;
  siteName: string;
  socialImage?: {
    alt: string;
    height: number;
    path: string;
    width: number;
  };
  title: string;
  titleTemplate: string;
};

export const domainRouteHeader = "x-usam-domain-route";
export const domainSiteRoutePrefix = "/domain-sites";

export const domainSites = {
  usam: {
    analyticsBrand: "usam",
    canonicalOrigin: "https://usamissionaries.org",
    description: "The Mission Is Active",
    faviconPath: "/favicon.ico",
    key: "usam",
    rootPath: "/",
    siteName: "USA Missionaries",
    socialImage: {
      alt: "USA Missionaries mountain landscape.",
      height: 916,
      path: "/images/usam/default-hero-background.png",
      width: 1718,
    },
    title: "USA Missionaries",
    titleTemplate: "%s | USA Missionaries",
  },
  "kitchen-table-gospel": {
    analyticsBrand: "kitchen_table_gospel",
    canonicalOrigin: "https://kitchentablegospel.org",
    description: "Kitchen Table Gospel is a USA Missionaries initiative for clear, table-centered gospel conversations.",
    faviconPath: "/favicon.ico",
    key: "kitchen-table-gospel",
    rootPath: `${domainSiteRoutePrefix}/kitchen-table-gospel`,
    siteName: "Kitchen Table Gospel",
    socialImage: {
      alt: "Kitchen Table Gospel gathering.",
      height: 1536,
      path: "/images/vision/kitchen-table-01.jpg",
      width: 2048,
    },
    title: "Kitchen Table Gospel",
    titleTemplate: "%s | Kitchen Table Gospel",
  },
  "discipleship-operating-system": {
    analyticsBrand: "dos",
    canonicalOrigin: "https://discipleshipoperatingsystem.com",
    description: "Discipleship Operating System is a USA Missionaries product for follow up, prayer, and disciple-making movement.",
    faviconPath: "/favicon.ico",
    key: "discipleship-operating-system",
    rootPath: `${domainSiteRoutePrefix}/discipleship-operating-system`,
    siteName: "Discipleship Operating System",
    socialImage: {
      alt: "Discipleship Operating System meeting screen.",
      height: 1150,
      path: "/images/vision/dos-meetings.jpg",
      width: 750,
    },
    title: "Discipleship Operating System",
    titleTemplate: "%s | Discipleship Operating System",
  },
} as const satisfies Record<DomainSiteKey, DomainSiteConfig>;

export const ga4CrossDomainHosts = [
  "usamissionaries.org",
  "www.usamissionaries.org",
  "kitchentablegospel.org",
  "www.kitchentablegospel.org",
  "discipleshipoperatingsystem.com",
  "www.discipleshipoperatingsystem.com",
];

const siteByHostname: Record<string, DomainSiteConfig> = {
  "usamissionaries.org": domainSites.usam,
  "www.usamissionaries.org": domainSites.usam,
  "kitchentablegospel.org": domainSites["kitchen-table-gospel"],
  "www.kitchentablegospel.org": domainSites["kitchen-table-gospel"],
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
