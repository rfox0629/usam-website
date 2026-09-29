import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { googleCalendarReconnectMessage, pullGoogleCalendarEvents } from "@/src/lib/dos/google-calendar";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* USA-273: reading a month of Google events is several round trips. The ceiling
   is the backstop behind the per-call timeouts in google-calendar.ts. */
export const maxDuration = 60;

type CalendarSyncPayload = {
  timeMax?: unknown;
  timeMin?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asIsoDate(value: unknown) {
  const text = asString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function readPayload(request: Request) {
  try {
    return await request.json() as CalendarSyncPayload;
  } catch {
    return null;
  }
}

async function authorizeCalendarWrite(workspaceId: string) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS calendar access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess;
  }

  return { authorization };
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const authResult = await authorizeCalendarWrite(workspaceId);

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const result = await pullGoogleCalendarEvents({
      supabase: createSupabaseAdminClient(),
      timeMax: asIsoDate(payload?.timeMax) ?? undefined,
      timeMin: asIsoDate(payload?.timeMin) ?? undefined,
      workspaceId,
    });

    if (result.status === "needs_reconnect") {
      return NextResponse.json({
        eventCount: result.eventCount,
        message: googleCalendarReconnectMessage,
        sourceCount: result.sourceCount,
        status: result.status,
      });
    }

    if (result.status === "not_connected") {
      return NextResponse.json({
        eventCount: 0,
        message: "Connect Google Calendar to read events.",
        sourceCount: 0,
        status: result.status,
      });
    }

    /* One calendar that times out no longer discards the ones that imported:
       pullGoogleCalendarEvents reports "partial" and the events it did read are
       already persisted (USA-273). */
    if (result.status === "partial") {
      return NextResponse.json({
        ...result,
        message: `Synced ${result.eventCount} Google events. ${result.failedSourceCount} ${result.failedSourceCount === 1 ? "calendar" : "calendars"} did not respond. Try again.`,
        ok: true,
      });
    }

    return NextResponse.json({ ...result, ok: true });
  } catch (syncError) {
    console.error("[DOS calendar] workspace pull failed", JSON.stringify({
      message: syncError instanceof Error ? syncError.message : "Unable to sync Google Calendar events.",
      workspaceId,
    }));

    return NextResponse.json({ error: "Unable to sync Google Calendar events." }, { status: 500 });
  }
}
