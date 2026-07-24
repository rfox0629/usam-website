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
  normalizeHostname,
} from "@/src/lib/domain-sites";

export const config = {
  matcher: ["/", "/domain-sites/:path*", "/partners", "/vision", "/board-briefing"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  // Vercel preview deployments have no custom domain, so a founder/reviewer opening a
  // /domain-sites/* path directly can never send a matching Host header. Preview builds
  // (VERCEL_ENV === "preview") skip the header gate so those pages are reviewable;
  // production keeps strict hostname-only routing.
  const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

  if (pathname.startsWith(domainSiteRoutePrefix) && !request.headers.get(domainRouteHeader) && !isPreviewDeployment) {
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
