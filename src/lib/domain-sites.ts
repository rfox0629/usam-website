export type DomainSiteKey = "usam" | "kitchen-table-gospel" | "discipleship-operating-system";

export type DomainSiteIconSet = {
  appleTouch: string;
  faviconIco: string;
  faviconPng16: string;
  faviconPng32: string;
  faviconPng48: string;
  faviconSvg: string;
  icon192: string;
  icon512: string;
  manifest: string;
};

export type DomainSiteConfig = {
  analyticsBrand: string;
  canonicalOrigin: string;
  description: string;
  faviconPath: string;
  icons: DomainSiteIconSet;
  key: DomainSiteKey;
  rootPath: string;
  siteName: string;
  title: string;
  titleTemplate: string;
};

export const domainRouteHeader = "x-usam-domain-route";
export const domainSiteRoutePrefix = "/domain-sites";

function domainSiteIcons(directory: string): DomainSiteIconSet {
  return {
    appleTouch: `/favicons/${directory}/apple-touch-icon.png`,
    faviconIco: `/favicons/${directory}/favicon.ico`,
    faviconPng16: `/favicons/${directory}/favicon-16x16.png`,
    faviconPng32: `/favicons/${directory}/favicon-32x32.png`,
    faviconPng48: `/favicons/${directory}/favicon-48x48.png`,
    faviconSvg: `/favicons/${directory}/favicon.svg`,
    icon192: `/favicons/${directory}/icon-192.png`,
    icon512: `/favicons/${directory}/icon-512.png`,
    manifest: `/favicons/${directory}/site.webmanifest`,
  };
}

const usamIcons = domainSiteIcons("usam");
const kitchenTableGospelIcons = domainSiteIcons("kitchen-table-gospel");
const dosIcons = domainSiteIcons("dos");

export const domainSites = {
  usam: {
    analyticsBrand: "usam",
    canonicalOrigin: "https://usamissionaries.org",
    description: "The Mission Is Active",
    faviconPath: usamIcons.faviconIco,
    icons: usamIcons,
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
    faviconPath: kitchenTableGospelIcons.faviconIco,
    icons: kitchenTableGospelIcons,
    key: "kitchen-table-gospel",
    rootPath: `${domainSiteRoutePrefix}/kitchen-table-gospel`,
    siteName: "Kitchen Table Gospel",
    title: "Kitchen Table Gospel",
    titleTemplate: "%s | Kitchen Table Gospel",
  },
  "discipleship-operating-system": {
    analyticsBrand: "dos",
    canonicalOrigin: "https://discipleshipoperatingsystem.com",
    description: "Discipleship Operating System public site placeholder.",
    faviconPath: dosIcons.faviconIco,
    icons: dosIcons,
    key: "discipleship-operating-system",
    rootPath: `${domainSiteRoutePrefix}/discipleship-operating-system`,
    siteName: "Discipleship Operating System",
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
