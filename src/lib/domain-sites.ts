export type DomainSiteKey =
  | "usam"
  | "kitchen-table-gospel"
  | "discipleship-operating-system"
  | "mission-of-reconciliation";

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
    /** Tracked line above the brand name on the card. Existing site copy only. */
    eyebrow: string;
    height: number;
    path: string;
    tagline: string;
    width: number;
  };
  themeColor: string;
  title: string;
  titleTemplate: string;
};

/**
 * Every brand's social preview is a 1200x630 card drawn at request time by
 * `src/lib/share/share-card.tsx` and served from `/share/<brand>`, so unfurls
 * frame the same way on every platform instead of being cropped per network.
 *
 * The route lives on the USA Missionaries origin for every brand on purpose. A
 * brand host only serves its own pages — `middleware.ts` bounces every other
 * path back to usamissionaries.org — so a card addressed on the brand's own
 * domain would unfurl through a redirect, or not at all.
 */
const socialImageSize = { height: 630, width: 1200 } as const;

const shareCardRoute = (key: DomainSiteKey) => `/share/${key}`;

export const domainRouteHeader = "x-usam-domain-route";
export const domainSiteRoutePrefix = "/domain-sites";

export const domainSites = {
  usam: {
    analyticsBrand: "usam",
    appleTouchIconPath: "/favicons/usam/apple-touch-icon.png",
    canonicalOrigin: "https://usamissionaries.org",
    description: "Sending and supporting missionaries to the mission field of the United States. The Mission Is Active.",
    favicon16Path: "/favicons/usam/favicon-16x16.png",
    favicon32Path: "/favicons/usam/favicon-32x32.png",
    favicon48Path: "/favicons/usam/favicon-48x48.png",
    faviconPath: "/favicons/usam/favicon.ico",
    faviconSvgPath: "/favicons/usam/favicon.svg",
    icon192Path: "/favicons/usam/icon-192.png",
    icon512Path: "/favicons/usam/icon-512.png",
    key: "usam",
    manifestPath: "/favicons/usam/site.webmanifest",
    rootPath: "/",
    siteName: "USA Missionaries",
    socialImage: {
      alt: "USA Missionaries",
      eyebrow: "The Mission Is Active",
      ...socialImageSize,
      path: shareCardRoute("usam"),
      tagline: "Sending and supporting missionaries to the mission field of the United States.",
    },
    themeColor: "#0D0D0D",
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
      alt: "Kitchen Table Gospel",
      eyebrow: "An initiative of USA Missionaries",
      ...socialImageSize,
      path: shareCardRoute("kitchen-table-gospel"),
      tagline: "Learning, obeying, and teaching the commands of Jesus in real relationships.",
    },
    themeColor: "#160F0A",
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
      alt: "Discipleship Operating System",
      eyebrow: "An initiative of USA Missionaries",
      ...socialImageSize,
      path: shareCardRoute("discipleship-operating-system"),
      tagline: "One place for the people you disciple, the prayers you promised, and the rhythms you share.",
    },
    themeColor: "#2563EB",
    title: "DOS | Discipleship Operating System",
    titleTemplate: "%s | DOS",
  },
  "mission-of-reconciliation": {
    analyticsBrand: "mission_of_reconciliation",
    appleTouchIconPath: "/favicons/mission-of-reconciliation/apple-touch-icon.png",
    canonicalOrigin: "https://www.missionofreconciliation.org",
    description: "Mission of Reconciliation equips followers of Jesus across America to come alongside people with love, truth, prayer, and Scripture. In partnership with USA Missionaries.",
    favicon16Path: "/favicons/mission-of-reconciliation/favicon-16x16.png",
    favicon32Path: "/favicons/mission-of-reconciliation/favicon-32x32.png",
    favicon48Path: "/favicons/mission-of-reconciliation/favicon-48x48.png",
    faviconPath: "/favicons/mission-of-reconciliation/favicon.ico",
    faviconSvgPath: "/favicons/mission-of-reconciliation/favicon.svg",
    icon192Path: "/favicons/mission-of-reconciliation/icon-192.png",
    icon512Path: "/favicons/mission-of-reconciliation/icon-512.png",
    key: "mission-of-reconciliation",
    manifestPath: "/favicons/mission-of-reconciliation/site.webmanifest",
    /**
     * Unlike the single-page domain sites, Mission of Reconciliation serves a
     * whole section, so its root is the real route rather than a
     * `/domain-sites` landing. See src/lib/mission-of-reconciliation/domain.ts
     * for the host-native path map.
     */
    rootPath: "/mission-of-reconciliation",
    siteName: "Mission of Reconciliation",
    socialImage: {
      alt: "Mission of Reconciliation, in partnership with USA Missionaries",
      eyebrow: "In partnership with USA Missionaries",
      ...socialImageSize,
      path: shareCardRoute("mission-of-reconciliation"),
      tagline: "People coming alongside people with love, truth, prayer, and Scripture.",
    },
    themeColor: "#FCFAF6",
    title: "Mission of Reconciliation",
    titleTemplate: "%s | Mission of Reconciliation",
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
  "missionofreconciliation.org",
  "www.missionofreconciliation.org",
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
  "missionofreconciliation.org": domainSites["mission-of-reconciliation"],
  "www.missionofreconciliation.org": domainSites["mission-of-reconciliation"],
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
