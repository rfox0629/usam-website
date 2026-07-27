import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import {
  VISION_ACCESS_COOKIE_NAME,
  isVisionAccessTokenValid,
} from "@/src/lib/vision-access";
import {
  type DomainSiteIconSet,
  domainRouteHeader,
  domainSiteRoutePrefix,
  getCanonicalDomainSiteForHostname,
  getAlternateDomainSiteByHostname,
  normalizeHostname,
} from "@/src/lib/domain-sites";

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
    "/manifest.webmanifest",
    "/partners",
    "/site.webmanifest",
    "/vision",
    "/board-briefing",
  ],
};

const domainIconRequestPaths = {
  "/apple-touch-icon.png": "appleTouch",
  "/favicon-16x16.png": "faviconPng16",
  "/favicon-32x32.png": "faviconPng32",
  "/favicon-48x48.png": "faviconPng48",
  "/favicon.ico": "faviconIco",
  "/favicon.svg": "faviconSvg",
  "/icon-192.png": "icon192",
  "/icon-512.png": "icon512",
  "/manifest.webmanifest": "manifest",
  "/site.webmanifest": "manifest",
} satisfies Record<string, keyof DomainSiteIconSet>;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const iconPathKey = domainIconRequestPaths[pathname as keyof typeof domainIconRequestPaths];

  if (iconPathKey) {
    const site = getCanonicalDomainSiteForHostname(hostname);
    const destinationPath = site.icons[iconPathKey];

    if (destinationPath !== pathname) {
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
