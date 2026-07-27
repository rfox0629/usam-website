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
    "/((?!_next/static|_next/image|apple-touch-icon.png|brand/|dos.webmanifest|favicon.ico|favicon-16x16.png|favicon-32x32.png|favicon-48x48.png|guides/|icon-192.png|icon-512.png|icons/|images/|.*\\..*).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  if (pathname.startsWith(domainSiteRoutePrefix) && !request.headers.get(domainRouteHeader)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const domainSite = getAlternateDomainSiteByHostname(hostname);

  if (domainSite) {
    if (pathname === "/") {
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

    const url = request.nextUrl.clone();

    url.protocol = "https:";
    url.host = new URL(domainSites.usam.canonicalOrigin).host;

    return NextResponse.redirect(url, 308);
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
