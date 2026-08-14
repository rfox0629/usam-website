import { NextResponse } from "next/server";
import {
  claimDemoGroupMemberAccessToken,
  claimGroupMemberAccessToken,
  groupMemberSessionCookieName,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token.trim()) {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-invalid`, url.origin));
  }

  const demoResult = claimDemoGroupMemberAccessToken(token, slug);

  if (demoResult.sessionToken) {
    const response = NextResponse.redirect(new URL(`${publicGroupPath(demoResult.groupSlug ?? slug)}?state=signed-in`, url.origin));
    response.cookies.set(groupMemberSessionCookieName, demoResult.sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/groups",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  }

  if (demoResult.error === "expired") {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-expired`, url.origin));
  }

  if (demoResult.error === "invalid") {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-invalid`, url.origin));
  }

  if (token.trim().length < 32) {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-invalid`, url.origin));
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-unavailable`, url.origin));
  }

  const result = await claimGroupMemberAccessToken(createSupabaseAdminClient(), token);

  if (!result.sessionToken) {
    return NextResponse.redirect(new URL(`${publicGroupPath(slug)}/member?state=access-expired`, url.origin));
  }

  const response = NextResponse.redirect(new URL(`${publicGroupPath(result.groupSlug ?? slug)}?state=signed-in`, url.origin));
  response.cookies.set(groupMemberSessionCookieName, result.sessionToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/groups",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
