import { domainSites, normalizeHostname } from "@/src/lib/domain-sites";

/**
 * Mission of Reconciliation runs on its own domain but stays inside this
 * codebase. Kitchen Table Gospel and DOS are single-page domains, so their
 * middleware only rewrites "/" and bounces every other path back to USA
 * Missionaries. Mission of Reconciliation serves a whole section, so it needs a
 * two-way map between the host-native URLs visitors see and the app routes that
 * render them.
 *
 *   www.missionofreconciliation.org/            ->  /mission-of-reconciliation
 *   www.missionofreconciliation.org/stories     ->  /mission-of-reconciliation/stories
 *   www.missionofreconciliation.org/stories/x   ->  /mission-of-reconciliation/stories/x
 *   www.missionofreconciliation.org/restoration ->  /restoration (shared route, one data path)
 *
 * The rewrites are internal, so the browser stays on the Mission of
 * Reconciliation domain throughout.
 */

export const missionCanonicalOrigin = domainSites["mission-of-reconciliation"].canonicalOrigin;

export const missionSectionPrefix = "/mission-of-reconciliation";

/**
 * Next re-runs middleware against the rewritten path. Without a marker, the
 * rewrite from "/" to the section prefix would immediately match the rule that
 * collapses section URLs back to "/", which is an infinite redirect. The
 * domain-site rewrites use the same technique with `domainRouteHeader`.
 */
export const missionRouteHeader = "x-usam-mission-route";

const missionHosts = new Set([
  "missionofreconciliation.org",
  "www.missionofreconciliation.org",
]);

export function isMissionHostname(hostname?: string | null) {
  return missionHosts.has(normalizeHostname(hostname));
}

/** Paths that render as-is on the Mission of Reconciliation domain. */
const sharedPaths = new Set(["/restoration"]);

/**
 * Same-origin infrastructure the browser has to reach directly. Falling through
 * to the USA Missionaries redirect turns a same-origin fetch into a
 * cross-origin one, and the browser blocks it on CORS: the restoration form and
 * the Join the Mission modal both fail with "Load failed" and the submission is
 * lost. Keep any new browser-called endpoint prefix in here.
 */
const sharedPathPrefixes = ["/api/"];

/**
 * Host-native path -> app route. Returns null when the path is not part of the
 * Mission of Reconciliation experience and should fall back to USA Missionaries.
 */
export function resolveMissionAppPath(pathname: string): null | string {
  if (pathname === "/") {
    return missionSectionPrefix;
  }

  if (sharedPaths.has(pathname) || sharedPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return pathname;
  }

  if (pathname === "/stories" || pathname.startsWith("/stories/")) {
    return `${missionSectionPrefix}${pathname}`;
  }

  return null;
}

/**
 * App route -> host-native path, used to collapse `/mission-of-reconciliation/*`
 * requests that arrive on the custom domain, and to build legacy redirects from
 * usamissionaries.org.
 */
export function toMissionNativePath(pathname: string) {
  if (pathname === missionSectionPrefix) {
    return "/";
  }

  if (pathname.startsWith(`${missionSectionPrefix}/`)) {
    return pathname.slice(missionSectionPrefix.length);
  }

  return pathname;
}

export type MissionPaths = {
  home: string;
  restoration: string;
  stories: string;
  storyHref: (slug: string) => string;
};

/**
 * Link targets for the section. On the custom domain these are the clean
 * host-native paths; on usamissionaries.org they stay under the section prefix
 * so the legacy URL keeps working while the domain is still being verified.
 */
export function missionPathsFor(onMissionDomain: boolean): MissionPaths {
  if (onMissionDomain) {
    return {
      home: "/",
      restoration: "/restoration",
      stories: "/stories",
      storyHref: (slug: string) => `/stories/${slug}`,
    };
  }

  return {
    home: missionSectionPrefix,
    restoration: "/restoration",
    stories: `${missionSectionPrefix}/stories`,
    storyHref: (slug: string) => `${missionSectionPrefix}/stories/${slug}`,
  };
}

/** Canonical URLs always point at the custom domain, whichever host served the page. */
export const missionCanonical = {
  home: missionCanonicalOrigin,
  restoration: `${missionCanonicalOrigin}/restoration`,
  stories: `${missionCanonicalOrigin}/stories`,
  story: (slug: string) => `${missionCanonicalOrigin}/stories/${slug}`,
} as const;
