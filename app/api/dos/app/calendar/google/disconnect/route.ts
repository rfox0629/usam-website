import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

async function readPayload(request: Request) {
  try {
    return await request.json() as { workspaceId?: unknown };
  } catch {
    return null;
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status !== "authorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);
  const workspaceId = await resolveDosAppWorkspaceId(asString(payload?.workspaceId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const { error } = await createSupabaseAdminClient()
    .from("connected_calendars")
    .update({ disconnected_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("disconnected_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
