import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { USAM_ACCESS_COOKIE_NAME, verifyAccessToken } from "@/src/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const hasAccess = verifyAccessToken(cookieStore.get(USAM_ACCESS_COOKIE_NAME)?.value);

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/system?access=1", request.url));
  }

  const html = await readFile(join(process.cwd(), "dos.html"), "utf8");

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
