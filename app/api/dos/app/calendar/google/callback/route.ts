import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import {
  exchangeGoogleCodeForTokens,
  getGoogleAccountEmail,
  isGoogleCalendarConfigured,
  upsertConnectedGoogleCalendar,
  verifyCalendarOAuthState,
} from "@/src/lib/dos/google-calendar";

function redirectWithParams(requestUrl: URL, nextPath: string, params: Record<string, string>) {
  const redirectUrl = new URL(nextPath, requestUrl.origin);

  Object.entries(params).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const state = verifyCalendarOAuthState(requestUrl.searchParams.get("state"));
  const nextPath = state?.next || "/dos";

  if (error) {
    return redirectWithParams(requestUrl, nextPath, { calendar: "error" });
  }

  if (!code || !state?.workspaceId || !state.userId) {
    return redirectWithParams(requestUrl, nextPath, { calendar: "invalid" });
  }

  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized" || authorization.userId !== state.userId) {
    return redirectWithParams(requestUrl, nextPath, { calendar: "auth" });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, state.workspaceId);

  if ("response" in workspaceAccess) {
    return redirectWithParams(requestUrl, nextPath, { calendar: "workspace" });
  }

  if (!isGoogleCalendarConfigured()) {
    return redirectWithParams(requestUrl, nextPath, { calendar: "config" });
  }

  try {
    const tokenResponse = await exchangeGoogleCodeForTokens(code, requestUrl.origin);

    if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
      return redirectWithParams(requestUrl, nextPath, { calendar: "refresh-token" });
    }

    const accountEmail = await getGoogleAccountEmail(tokenResponse.access_token).catch(() => null);

    await upsertConnectedGoogleCalendar({
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in,
      googleAccountEmail: accountEmail,
      refreshToken: tokenResponse.refresh_token,
      userId: authorization.userId,
      workspaceId: state.workspaceId,
    });

    return redirectWithParams(requestUrl, nextPath, { calendar: "connected" });
  } catch (calendarError) {
    console.error("[DOS Calendar] Google callback failed", calendarError);

    return redirectWithParams(requestUrl, nextPath, { calendar: "error" });
  }
}
