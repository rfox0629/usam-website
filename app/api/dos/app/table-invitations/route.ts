import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { createInvitationToken, loadInvitationForWorkspace } from "@/src/lib/dos/table-invitation-data";
import {
  createDefaultDosTableInvitation,
  normalizeDosTableInvitationHostMode,
  normalizeDosTableInvitationKind,
  normalizeDosTableInvitationSettings,
  normalizeDosTableInvitationStatus,
} from "@/src/lib/dos/table-invitations";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { resolveDosAppWorkspace } from "@/src/lib/dos/missionary-app";

type InvitationPayload = {
  audience?: unknown;
  description?: unknown;
  hostMemberIds?: unknown;
  hostMode?: unknown;
  id?: unknown;
  kind?: unknown;
  settings?: unknown;
  status?: unknown;
  title?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isMissingInviteModel(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_table_invitations")
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find") || message.includes("relation"));
}

async function readPayload(request: Request) {
  try {
    return await request.json() as InvitationPayload;
  } catch {
    return null;
  }
}

async function authorizeInviteWrite(workspaceRef: string) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS invitation access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  const workspace = await resolveDosAppWorkspace(workspaceRef);

  if (!workspace) {
    return { response: NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 }) };
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspace.id);

  if ("response" in workspaceAccess) {
    return { response: workspaceAccess.response };
  }

  return { authorization, workspace };
}

async function validHostMemberIds(workspaceId: string, requestedIds: string[]) {
  const ids = Array.from(new Set(requestedIds.filter(isUuid)));

  if (!ids.length) {
    return [];
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("missionary_team_members")
    .select("id, status")
    .eq("household_id", workspaceId)
    .in("id", ids);

  if (error) {
    return [];
  }

  return (data ?? [])
    .filter((member) => !["archived", "inactive"].includes(String(member.status ?? "").toLowerCase()))
    .map((member) => String(member.id));
}

function createdByUserId(authorization: Awaited<ReturnType<typeof getDosAuthorization>>) {
  return authorization.status === "authorized" && "userId" in authorization ? authorization.userId : null;
}

function recordFromPayload(payload: InvitationPayload, hostMemberIds: string[]) {
  const kind = normalizeDosTableInvitationKind(payload.kind);
  const defaults = createDefaultDosTableInvitation(kind);
  const title = asString(payload.title) || defaults.title;
  const description = asString(payload.description) || defaults.description;
  const audience = asString(payload.audience) || defaults.audience;
  const hostMode = normalizeDosTableInvitationHostMode(payload.hostMode);

  return {
    audience,
    description,
    host_member_ids: hostMode === "household" ? hostMemberIds : [],
    host_mode: hostMode === "household" && hostMemberIds.length ? "household" : "single",
    kind,
    public_enabled: true,
    settings: normalizeDosTableInvitationSettings(payload.settings),
    status: normalizeDosTableInvitationStatus(payload.status),
    title,
  };
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const workspaceRef = asString(payload?.workspaceId);

  if (!payload || !workspaceRef) {
    return NextResponse.json({ error: "Workspace and invitation details are required." }, { status: 400 });
  }

  const authResult = await authorizeInviteWrite(workspaceRef);

  if ("response" in authResult) {
    return authResult.response;
  }

  const hostMemberIds = await validHostMemberIds(authResult.workspace.id, asStringArray(payload.hostMemberIds));
  const record = {
    ...recordFromPayload(payload, hostMemberIds),
    created_by: createdByUserId(authResult.authorization),
    token: createInvitationToken(),
    workspace_id: authResult.workspace.id,
  };
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dos_table_invitations")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({
      error: isMissingInviteModel(error) ? "DOS table invitations are not configured yet." : error.message,
    }, { status: 500 });
  }

  const loaded = await loadInvitationForWorkspace(supabase, authResult.workspace.id, String(data.id));

  if (loaded.error || !loaded.data) {
    return NextResponse.json({ error: loaded.error?.message ?? "Unable to load saved invitation." }, { status: 500 });
  }

  return NextResponse.json({ invitation: loaded.data, ok: true });
}

export async function PATCH(request: Request) {
  const payload = await readPayload(request);
  const workspaceRef = asString(payload?.workspaceId);
  const invitationId = asString(payload?.id);

  if (!payload || !workspaceRef || !isUuid(invitationId)) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  const authResult = await authorizeInviteWrite(workspaceRef);

  if ("response" in authResult) {
    return authResult.response;
  }

  const hostMemberIds = await validHostMemberIds(authResult.workspace.id, asStringArray(payload.hostMemberIds));
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dos_table_invitations")
    .update(recordFromPayload(payload, hostMemberIds))
    .eq("id", invitationId)
    .eq("workspace_id", authResult.workspace.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      error: isMissingInviteModel(error) ? "DOS table invitations are not configured yet." : error.message,
    }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  const loaded = await loadInvitationForWorkspace(supabase, authResult.workspace.id, invitationId);

  if (loaded.error || !loaded.data) {
    return NextResponse.json({ error: loaded.error?.message ?? "Unable to load saved invitation." }, { status: 500 });
  }

  return NextResponse.json({ invitation: loaded.data, ok: true });
}
