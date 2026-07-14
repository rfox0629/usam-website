import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import {
  VISION_ACCESS_COOKIE_NAME,
  isVisionAccessTokenValid,
} from "@/src/lib/vision-access";

export const config = {
  matcher: ["/partners", "/vision", "/board-briefing"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const token = request.cookies.get(PARTNERS_ACCESS_COOKIE_NAME)?.value;
  const hasAccess = await isPartnersAccessTokenValid(token);

  if (hasAccess) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/partners/gate", request.url));
}
