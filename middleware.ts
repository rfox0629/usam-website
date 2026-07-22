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
  getAlternateDomainSiteByHostname,
  getCanonicalDomainSiteForHostname,
  normalizeHostname,
  type DomainSiteConfig,
} from "@/src/lib/domain-sites";

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
    "/",
    "/apple-touch-icon.png",
    "/domain-sites/:path*",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon-48x48.png",
    "/favicon.ico",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/partners",
    "/site.webmanifest",
    "/vision",
    "/board-briefing",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  if (domainFaviconAssetPaths.has(pathname)) {
    const domainSite = getCanonicalDomainSiteForHostname(hostname);
    const destinationPath = getDomainFaviconAssetPath(pathname, domainSite);

    if (destinationPath && destinationPath !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = destinationPath;

      return NextResponse.rewrite(url);
    }
  }

  if (pathname.startsWith(domainSiteRoutePrefix) && !request.headers.get(domainRouteHeader)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (pathname === "/") {
    const domainSite = getAlternateDomainSiteByHostname(hostname);

    if (domainSite) {
      const url = request.nextUrl.clone();
      const requestHeaders = new Headers(request.headers);

      requestHeaders.set(domainRouteHeader, domainSite.key);
      url.pathname = domainSite.rootPath;

      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
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
