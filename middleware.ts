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
  normalizeHostname,
} from "@/src/lib/domain-sites";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\..*).*)",
    "/robots.txt",
    "/sitemap.xml",
  ],
};

const alternateDomainPassthroughPaths = new Set(["/robots.txt", "/sitemap.xml"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const alternateDomainSite = getAlternateDomainSiteByHostname(hostname);
  const isPreviewEnv = process.env.VERCEL_ENV === "preview";

  if (pathname.startsWith(domainSiteRoutePrefix) && !request.headers.get(domainRouteHeader) && !isPreviewEnv) {
    return new NextResponse("Not Found", { status: 404 });
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
