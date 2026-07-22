import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import {
  domainRouteHeader,
  domainSiteRoutePrefix,
  getAlternateDomainSiteByHostname,
  isDirectDomainSitePreviewAllowed,
  normalizeHostname,
} from "@/src/lib/domain-sites";

export const config = {
  matcher: ["/", "/domain-sites/:path*", "/partners"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = normalizeHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));

  if (
    pathname.startsWith(domainSiteRoutePrefix)
    && !request.headers.get(domainRouteHeader)
    && !isDirectDomainSitePreviewAllowed()
  ) {
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
