import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const partnerSelect = "id, first_name, last_name, name, email, phone, recruited_by_household_id, recruited_by_profile_slug, workspace_id, missionary_profile_id, source, status, approved_at, approved_by, date_joined, created_at, updated_at";
const statuses = ["active", "archived", "declined", "inactive", "pending"] as const;

type PrayerPartnerPayload = {
  householdId?: unknown;
  household_id?: unknown;
  id?: unknown;
  status?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStatus(value: unknown) {
  return statuses.includes(value as typeof statuses[number]) ? value as typeof statuses[number] : "pending";
}

async function authorizePrayerPartnerWrite() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return { response: NextResponse.json({ error: "Editor access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as PrayerPartnerPayload;
  } catch {
    return null;
  }
}

function prayerPartnerErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? "Unable to update prayer partner.";
  const lowerMessage = message.toLowerCase();

  if (error.code === "PGRST205" || lowerMessage.includes("schema cache")) {
    return "Prayer partner fields are missing. Apply the prayer team signup migration.";
  }

  return message;
}

export async function PATCH(request: Request) {
  const authResult = await authorizePrayerPartnerWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const id = asString(payload.id);
  const workspaceId = asString(payload.workspaceId) || asString(payload.workspace_id) || asString(payload.householdId) || asString(payload.household_id);
  const status = asStatus(payload.status);

  if (!isUuid(id) || !isUuid(workspaceId)) {
    return NextResponse.json({ error: "Workspace and prayer partner ID are required." }, { status: 400 });
  }

  const activeApprovalPatch = status === "active"
    ? {
      approved_at: new Date().toISOString(),
      approved_by: authResult.authorization.email,
    }
    : {
      approved_at: null,
      approved_by: null,
    };

  const { data, error } = await createSupabaseAdminClient()
    .from("prayer_partners")
    .update({
      ...activeApprovalPatch,
      status,
    })
    .eq("id", id)
    .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
    .select(partnerSelect)
    .single();

  if (error) {
    console.error("[Prayer Partners API] Failed to update prayer partner:", error);
    return NextResponse.json({ error: prayerPartnerErrorMessage(error) }, { status: 500 });
  }

  const partnerHouseholdId = data.recruited_by_household_id ?? data.workspace_id ?? data.missionary_profile_id ?? workspaceId;

  return NextResponse.json({
    prayerPartner: {
      ...data,
      recruited_by_household_id: partnerHouseholdId,
    },
  });
}
