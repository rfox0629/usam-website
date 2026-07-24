export type DomainSiteKey = "usam" | "kitchen-table-gospel" | "discipleship-operating-system";

export type DomainSiteConfig = {
  analyticsBrand: string;
  canonicalOrigin: string;
  description: string;
  faviconPath: string;
  key: DomainSiteKey;
  rootPath: string;
  siteName: string;
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
    title: "USA Missionaries",
    titleTemplate: "%s | USA Missionaries",
  },
  "kitchen-table-gospel": {
    analyticsBrand: "kitchen_table_gospel",
    canonicalOrigin: "https://kitchentablegospel.org",
    description: "Kitchen Table Gospel public site placeholder.",
    faviconPath: "/favicon.ico",
    key: "kitchen-table-gospel",
    rootPath: `${domainSiteRoutePrefix}/kitchen-table-gospel`,
    siteName: "Kitchen Table Gospel",
    title: "Kitchen Table Gospel",
    titleTemplate: "%s | Kitchen Table Gospel",
  },
  "discipleship-operating-system": {
    analyticsBrand: "dos",
    canonicalOrigin: "https://discipleshipoperatingsystem.com",
    description: "DOS is a ministry memory and accountability system: one clear, simple place for the people you're discipling, the prayers you've promised, and the rhythms you share.",
    faviconPath: "/icons/dos-table-icon-1024.png",
    key: "discipleship-operating-system",
    rootPath: `${domainSiteRoutePrefix}/discipleship-operating-system`,
    siteName: "Discipleship Operating System",
    title: "DOS | Never lose a person or a moment that matters",
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
