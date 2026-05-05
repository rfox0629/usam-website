import { NextResponse } from "next/server";
import {
  USAM_ACCESS_COOKIE_NAME,
  accessCookieOptions,
  createAccessToken,
  isValidAccessCode,
} from "@/src/lib/access";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (typeof password !== "string" || !isValidAccessCode(password, "system")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = createAccessToken({
    source: "system",
  });

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(USAM_ACCESS_COOKIE_NAME, token, accessCookieOptions());

  return response;
}
