import {
  ga4CrossDomainHosts,
  getCanonicalDomainSiteForHostname,
  normalizeHostname,
} from "@/src/lib/domain-sites";

export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
export const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";
export const analyticsCrossDomainHosts = [...ga4CrossDomainHosts];

export const analyticsEvents = {
  becomeMissionaryClick: "become_missionary_click",
  donateClick: "donate_click",
  joinMissionClick: "join_mission_click",
  partnerSiteClick: "partner_site_click",
  prayerRequestClick: "prayer_request_click",
  videoPlayClick: "video_play_click",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;

export const excludedAnalyticsRoutePrefixes = [
  "/dos",
  "/admin",
  "/api",
  "/auth",
  "/application",
  "/applications",
  "/board-briefing",
  "/login",
  "/join",
  "/missionary-intake",
  "/ncc",
  "/partners",
  "/prayer/apply",
  "/review",
  "/testimony",
  "/update-password",
  "/system/preview",
] as const;

export const excludedClarityRoutePrefixes = [
  ...excludedAnalyticsRoutePrefixes,
  "/financialfreedom",
  "/missionaries/",
  "/support",
] as const;

declare global {
  interface Window {
    clarity?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled() {
  return process.env.NODE_ENV === "production" && Boolean(gaMeasurementId || clarityProjectId);
}

function normalizedAnalyticsPath(pathname?: string | null) {
  const path = pathname?.split(/[?#]/)[0] || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function isPublicAnalyticsPath(pathname?: string | null) {
  const normalizedPath = normalizedAnalyticsPath(pathname);

  return !excludedAnalyticsRoutePrefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

export function isClarityAnalyticsPath(pathname?: string | null) {
  const normalizedPath = normalizedAnalyticsPath(pathname);

  return !excludedClarityRoutePrefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

function getCurrentHostname() {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeHostname(window.location.hostname);
}

function getCurrentBrowserPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function getAnalyticsSiteContext(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname) || getCurrentHostname();
  const site = getCanonicalDomainSiteForHostname(normalizedHostname);

  return {
    site_brand: site.analyticsBrand,
    site_hostname: normalizedHostname || "unknown",
  };
}

function pageViewParams(path: string) {
  return {
    ...getAnalyticsSiteContext(),
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  };
}

export function trackPageView(path: string) {
  const browserPath = getCurrentBrowserPath();

  if (!isAnalyticsEnabled() || typeof window === "undefined" || !gaMeasurementId || !window.gtag || !isPublicAnalyticsPath(browserPath)) {
    return;
  }

  window.gtag("config", gaMeasurementId, pageViewParams(browserPath || path));
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !isPublicAnalyticsPath(window.location.pathname)) {
    return;
  }

  const cleanParams = Object.fromEntries(
    Object.entries({
      ...params,
      ...getAnalyticsSiteContext(),
      page_path: getCurrentBrowserPath(),
    }).filter(([, value]) => value !== undefined && value !== null),
  );

  if (gaMeasurementId && window.gtag) {
    window.gtag("event", eventName, cleanParams);
  }

  if (clarityProjectId && window.clarity && isClarityAnalyticsPath(window.location.pathname)) {
    window.clarity("event", eventName);
  }
}
