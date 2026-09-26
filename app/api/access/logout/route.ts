import { NextResponse, type NextRequest } from "next/server";
import { USAM_ACCESS_COOKIE_NAME } from "@/src/lib/access";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

/**
 * Ends every browser session this site issues: the Supabase Auth session that
 * DOS, Operations, and admin rely on, and the `usam_access` System cookie.
 *
 * Before this, DOS "Sign out" was a GET link to a POST-only handler (HTTP 405),
 * and the handler only cleared `usam_access`, so the DOS session survived even
 * when it did run.
 *
 * - POST from `fetch` (AccessLogoutButton) keeps its JSON reply.
 * - POST from a form, or a real top-level GET navigation, redirects to sign in.
 * - GET never signs out on a prefetch or router data request, so a link that
 *   is merely rendered cannot end a session.
 */

const defaultRedirect = "/dos/sign-in?signedOut=1";

function safeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return defaultRedirect;
  }

  return value;
}

function isPrefetchOrDataRequest(request: NextRequest) {
  const headers = request.headers;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`.toLowerCase();
  const fetchMode = headers.get("sec-fetch-mode");

  return Boolean(
    headers.get("next-router-prefetch")
      || headers.get("rsc")
      || headers.get("x-middleware-prefetch")
      || purpose.includes("prefetch")
      || (fetchMode && fetchMode !== "navigate"),
  );
}

async function endSessions() {
  if (!isSupabaseServerConfigured()) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    // `local` ends this browser's session only; other devices stay signed in.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // A missing or already-expired session is still a successful sign-out.
  }
}

function clearAccessCookie(response: NextResponse) {
  response.cookies.set(USAM_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (isPrefetchOrDataRequest(request)) {
    return noStore(new NextResponse(null, { status: 204 }));
  }

  await endSessions();

  const target = safeRedirectTarget(request.nextUrl.searchParams.get("next"));

  return noStore(clearAccessCookie(NextResponse.redirect(new URL(target, request.url), 303)));
}

export async function POST(request: NextRequest) {
  await endSessions();

  const contentType = request.headers.get("content-type") ?? "";
  const isFormPost = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  if (isFormPost) {
    const form = await request.formData().catch(() => null);
    const next = form?.get("next");
    const target = safeRedirectTarget(typeof next === "string" ? next : null);

    return noStore(clearAccessCookie(NextResponse.redirect(new URL(target, request.url), 303)));
  }

  return noStore(clearAccessCookie(NextResponse.json({ ok: true })));
}
