import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import {
  VISION_ACCESS_COOKIE_NAME,
  isVisionAccessTokenValid,
} from "@/src/lib/vision-access";
import {
  domainRouteHeader,
  domainSiteRoutePrefix,
  domainSites,
  getAlternateDomainSiteByHostname,
  getCanonicalDomainSiteForHostname,
  normalizeHostname,
  type DomainSiteConfig,
} from "@/src/lib/domain-sites";
import {
  isMissionHostname,
  missionCanonicalOrigin,
  missionRouteHeader,
  missionSectionPrefix,
  resolveMissionAppPath,
  toMissionNativePath,
} from "@/src/lib/mission-of-reconciliation/domain";

const domainFaviconAssetPaths = new Set([
  "/apple-touch-icon.png",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/favicon-48x48.png",
  "/favicon.ico",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/site.webmanifest",
]);

function getDomainFaviconAssetPath(pathname: string, domainSite: DomainSiteConfig) {
  switch (pathname) {
    case "/apple-touch-icon.png":
      return domainSite.appleTouchIconPath;
    case "/favicon-16x16.png":
      return domainSite.favicon16Path;
    case "/favicon-32x32.png":
      return domainSite.favicon32Path;
    case "/favicon-48x48.png":
      return domainSite.favicon48Path;
    case "/favicon.ico":
      return domainSite.faviconPath;
    case "/favicon.svg":
      return domainSite.faviconSvgPath;
    case "/icon-192.png":
      return domainSite.icon192Path;
    case "/icon-512.png":
      return domainSite.icon512Path;
    case "/site.webmanifest":
      return domainSite.manifestPath;
    default:
      return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\..*).*)",
    "/robots.txt",
    "/sitemap.xml",
    "/apple-touch-icon.png",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon-48x48.png",
    "/favicon.ico",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/site.webmanifest",
  ],
};

const alternateDomainPassthroughPaths = new Set(["/robots.txt", "/sitemap.xml"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const alternateDomainSite = getAlternateDomainSiteByHostname(hostname);
  const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

  if (domainFaviconAssetPaths.has(pathname)) {
    const domainSite = getCanonicalDomainSiteForHostname(hostname);
    const destinationPath = getDomainFaviconAssetPath(pathname, domainSite);

    if (destinationPath && destinationPath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = destinationPath;

      return NextResponse.rewrite(url);
    }
  }

  if (pathname.startsWith(domainSiteRoutePrefix) && !request.headers.get(domainRouteHeader) && !isPreviewDeployment) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Mission of Reconciliation runs a whole section on its own domain, so it is
  // handled before the single-page domain-site rules below.
  if (isMissionHostname(hostname)) {
    // Second pass over our own rewrite: serve it and stop.
    if (request.headers.get(missionRouteHeader)) {
      return NextResponse.next();
    }

    if (alternateDomainPassthroughPaths.has(pathname)) {
      return NextResponse.next();
    }

    // Collapse section-prefixed URLs to their host-native equivalent so the
    // domain never serves the same page at two addresses.
    if (pathname === missionSectionPrefix || pathname.startsWith(`${missionSectionPrefix}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = toMissionNativePath(pathname);

      return NextResponse.redirect(url, 308);
    }

    const appPath = resolveMissionAppPath(pathname);

    if (appPath) {
      if (appPath === pathname) {
        return NextResponse.next();
      }

      const url = request.nextUrl.clone();
      url.pathname = appPath;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(missionRouteHeader, "1");

      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // Anything outside the section belongs to USA Missionaries.
    return NextResponse.redirect(
      new URL(`${domainSites.usam.canonicalOrigin}${pathname}${request.nextUrl.search}`),
      308,
    );
  }

  // Legacy usamissionaries.org section URLs move to the custom domain once it is
  // verified. Gated so the cutover does not strand visitors while SSL issues.
  if (
    process.env.ENABLE_MOR_DOMAIN_REDIRECT === "true"
    && (pathname === missionSectionPrefix || pathname.startsWith(`${missionSectionPrefix}/`))
  ) {
    return NextResponse.redirect(
      new URL(`${missionCanonicalOrigin}${toMissionNativePath(pathname)}${request.nextUrl.search}`),
      308,
    );
  }

  if (pathname === "/") {
    if (alternateDomainSite) {
      const url = request.nextUrl.clone();
      const requestHeaders = new Headers(request.headers);

      requestHeaders.set(domainRouteHeader, alternateDomainSite.key);
      url.pathname = alternateDomainSite.rootPath;

      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  if (alternateDomainSite && !request.headers.get(domainRouteHeader) && !alternateDomainPassthroughPaths.has(pathname)) {
    return NextResponse.redirect(new URL(`${domainSites.usam.canonicalOrigin}${pathname}${request.nextUrl.search}`), 308);
  }

  if (pathname === "/board-briefing") {
    return NextResponse.redirect(new URL("/vision", request.url), 308);
  }

  if (pathname === "/vision") {
    const token = request.cookies.get(VISION_ACCESS_COOKIE_NAME)?.value;
    const hasAccess = await isVisionAccessTokenValid(token);

    if (hasAccess) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL("/vision/gate", request.url));
  }

  if (pathname !== "/partners") {
    return NextResponse.next();
  }

  const token = request.cookies.get(PARTNERS_ACCESS_COOKIE_NAME)?.value;
  const hasAccess = await isPartnersAccessTokenValid(token);

  if (hasAccess) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/partners/gate", request.url));
}
