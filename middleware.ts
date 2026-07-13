import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import {
  BOARD_BRIEFING_ACCESS_COOKIE_NAME,
  isBoardBriefingAccessTokenValid,
} from "@/src/lib/board-briefing-access";

export const config = {
  matcher: ["/partners", "/board-briefing"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/board-briefing") {
    const token = request.cookies.get(BOARD_BRIEFING_ACCESS_COOKIE_NAME)?.value;
    const hasAccess = await isBoardBriefingAccessTokenValid(token);

    if (hasAccess) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL("/board-briefing/gate", request.url));
  }

  const token = request.cookies.get(PARTNERS_ACCESS_COOKIE_NAME)?.value;
  const hasAccess = await isPartnersAccessTokenValid(token);

  if (hasAccess) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/partners/gate", request.url));
}
