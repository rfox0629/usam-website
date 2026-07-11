import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, isAdminDosAuthorization, type DosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type AuthorizedDos = Extract<DosAuthorization, { status: "authorized" }>;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function missingJoinRequestsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = error.message ?? "";

  return error.code === "42P01"
    || error.code === "PGRST205"
    || (/dos_group_join_requests/i.test(message) && /does not exist|could not find/i.test(message));
}

async function authorizeDosGroupsRequest(): Promise<{ authorization: AuthorizedDos } | { response: NextResponse }> {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS groups access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization: authorization as AuthorizedDos };
}

/**
 * Pending counts are scoped to groups the caller actively leads (or, for admins, every
 * group in the workspace) using the same person-resolution logic as the join-requests
 * accept/decline flow, so a facilitator only ever sees counts for their own groups.
 */
async function resolveLedGroupIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  authorization: AuthorizedDos,
  workspaceId: string,
): Promise<string[] | null> {
  if (isAdminDosAuthorization(authorization)) {
    return null;
  }

  const personIds = new Set<string>();
  const email = authorization.access === "member" ? normalizeEmail(authorization.email) : "";
  const phone = authorization.access === "member" ? normalizePhone(authorization.phone) : null;

  if (email) {
    const { data } = await supabase
      .from("missionary_field_people")
      .select("id")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .ilike("email", email);

    (data ?? []).forEach((person) => personIds.add(person.id));
  }

  if (phone) {
    const { data } = await supabase
      .from("missionary_field_people")
      .select("id")
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .eq("phone", phone);

    (data ?? []).forEach((person) => personIds.add(person.id));
  }

  if (!personIds.size) {
    return [];
  }

  const { data } = await supabase
    .from("dos_group_members")
    .select("group_id")
    .in("person_id", Array.from(personIds))
    .in("role", ["leader", "co_leader"])
    .eq("status", "active");

  return Array.from(new Set((data ?? []).map((row) => row.group_id).filter((groupId): groupId is string => Boolean(groupId))));
}

export async function GET(request: Request): Promise<NextResponse> {
  const authResult = await authorizeDosGroupsRequest();

  if ("response" in authResult) {
    return authResult.response;
  }

  const url = new URL(request.url);
  const workspaceId = await resolveDosAppWorkspaceId(url.searchParams.get("workspaceId") ?? url.searchParams.get("workspace_id") ?? "");

  if (!workspaceId) {
    return NextResponse.json({ counts: {}, ok: true });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response as NextResponse;
  }

  const supabase = createSupabaseAdminClient();
  const ledGroupIds = await resolveLedGroupIds(supabase, authResult.authorization, workspaceId);

  if (ledGroupIds && !ledGroupIds.length) {
    return NextResponse.json({ counts: {}, ok: true });
  }

  let query = supabase
    .from("dos_group_join_requests")
    .select("group_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending");

  if (ledGroupIds) {
    query = query.in("group_id", ledGroupIds);
  }

  const { data, error } = await query;

  if (error) {
    return missingJoinRequestsTable(error)
      ? NextResponse.json({ counts: {}, ok: true })
      : NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};

  for (const row of data ?? []) {
    if (!row.group_id) {
      continue;
    }

    counts[row.group_id] = (counts[row.group_id] ?? 0) + 1;
  }

  return NextResponse.json({ counts, ok: true });
}
