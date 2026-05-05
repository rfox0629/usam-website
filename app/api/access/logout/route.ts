import { NextResponse } from "next/server";
import { USAM_ACCESS_COOKIE_NAME } from "@/src/lib/access";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(USAM_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
