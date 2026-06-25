import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import {
  googleAuthorizationUrl,
  isGoogleCalendarConfigured,
  signCalendarOAuthState,
} from "@/src/lib/dos/google-calendar";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dos";
}

export async function GET(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar environment variables are not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(url.searchParams.get("workspaceId") ?? "");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const state = signCalendarOAuthState({
    next: safeNextPath(url.searchParams.get("next")),
    userId: authorization.userId,
    workspaceId,
  });

  return NextResponse.redirect(googleAuthorizationUrl({
    origin: url.origin,
    state,
  }));
}
