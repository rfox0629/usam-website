import { NextResponse } from "next/server";
import { dosAdvancedFeatureByKey } from "@/src/lib/dos/advanced-features";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/* Turning an Advanced Feature on or off for a workspace.
 *
 * This route writes exactly one row in dos_workspace_feature_flags and nothing
 * else. It does not touch missionary_field_people, does not recalculate
 * anything, and has no access to a Person row at all -- which is the point.
 * "Engagement Levels: Off" is a statement about what this workspace sees, not
 * about what it has recorded.
 */

type AdvancedFeaturePayload = {
  enabled?: unknown;
  feature?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "DOS field app write access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  let payload: AdvancedFeaturePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  /* Only keys this build actually defines. An unknown key is refused rather
     than written, so a typo cannot create a permanent orphan flag row. */
  const feature = dosAdvancedFeatureByKey(asString(payload.feature));

  if (!feature) {
    return NextResponse.json({ error: "Unknown advanced feature." }, { status: 400 });
  }

  if (typeof payload.enabled !== "boolean") {
    return NextResponse.json({ error: "Enabled must be true or false." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const existing = await supabase
    .from("dos_workspace_feature_flags")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("flag_key", feature.flagKey)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  const result = existing.data
    ? await supabase
      .from("dos_workspace_feature_flags")
      .update({ enabled: payload.enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.data.id)
      .select("flag_key, enabled")
      .single()
    : await supabase
      .from("dos_workspace_feature_flags")
      .insert({ enabled: payload.enabled, flag_key: feature.flagKey, workspace_id: workspaceId })
      .select("flag_key, enabled")
      .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ enabled: result.data.enabled === true, feature: feature.key });
}
