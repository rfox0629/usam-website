import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* USA-246: resolving a booking that was flagged for Person review. The
   booking keeps the guest's details until someone decides: link it to one of
   the candidates, or create a new Person from those details. Both happen in
   one database transaction (dos_resolve_table_booking_person). */

type ResolvePayload = {
  action?: unknown;
  bookingId?: unknown;
  personId?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null) as ResolvePayload | null;
  const workspaceRef = asString(payload?.workspaceId);
  const bookingId = asString(payload?.bookingId);
  const action = asString(payload?.action);
  const personId = asString(payload?.personId);

  if (!payload || !workspaceRef || !isUuid(bookingId) || (action !== "link" && action !== "create") || (action === "link" && !isUuid(personId))) {
    return NextResponse.json({ error: "Workspace, booking, and a link or create decision are required." }, { status: 400 });
  }

  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "DOS invitation access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const workspace = await resolveDosAppWorkspace(workspaceRef);

  if (!workspace) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspace.id);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const result = await supabase.rpc("dos_resolve_table_booking_person", {
    p_input: {
      action,
      booking_id: bookingId,
      person_id: action === "link" ? personId : null,
      resolved_by: "userId" in authorization && isUuid(String(authorization.userId ?? "")) ? authorization.userId : null,
      workspace_id: workspace.id,
    },
  });

  if (result.error) {
    const message = result.error.message.toLowerCase();

    if (message.includes("booking_not_found")) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (message.includes("person_not_found")) {
      return NextResponse.json({ error: "That person is not in this workspace." }, { status: 404 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
