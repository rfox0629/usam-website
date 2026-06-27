export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
export const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";

export const analyticsEvents = {
  becomeMissionaryClick: "become_missionary_click",
  donateClick: "donate_click",
  joinMissionClick: "join_mission_click",
  prayerRequestClick: "prayer_request_click",
  videoPlayClick: "video_play_click",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;

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

  return [
    "/",
    "/briefing",
    "/financialfreedom",
    "/mission",
    "/missionaries",
    "/prayer",
    "/support",
    "/system",
  ].includes(normalizedPath)
    || [
      "/briefing/assignments/",
      "/guide/",
      "/missionaries/",
    ].some((prefix) => normalizedPath.startsWith(prefix));
}

export function trackPageView(path: string) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !gaMeasurementId || !window.gtag || !isPublicAnalyticsPath(path)) {
    return;
  }

  window.gtag("config", gaMeasurementId, {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  });
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !isPublicAnalyticsPath(window.location.pathname)) {
    return;
  }

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  );

  if (gaMeasurementId && window.gtag) {
    window.gtag("event", eventName, cleanParams);
  }

  if (clarityProjectId && window.clarity) {
    window.clarity("event", eventName);
  }
}
