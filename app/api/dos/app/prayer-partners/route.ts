import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const statuses = ["active", "archived", "declined", "inactive", "pending"] as const;
const partnerSelect = "id, name, first_name, last_name, email, phone, city, state, region, how_heard, source, status, internal_notes, date_joined, approved_at, created_at, updated_at";

type PrayerPartnerPayload = {
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
  const status = asString(value).toLowerCase();

  return statuses.includes(status as typeof statuses[number]) ? status : "pending";
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

function mapPrayerPartner(row: {
  city?: string | null;
  created_at?: string | null;
  date_joined?: string | null;
  email?: string | null;
  first_name?: string | null;
  how_heard?: string | null;
  id: string;
  internal_notes?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  region?: string | null;
  source?: string | null;
  state?: string | null;
  status?: string | null;
  updated_at?: string | null;
}) {
  const name = row.name?.trim()
    || [row.first_name, row.last_name].map((value) => value?.trim()).filter(Boolean).join(" ")
    || row.email
    || "Prayer Partner";

  return {
    city: row.city ?? null,
    email: row.email ?? null,
    howHeard: row.how_heard ?? null,
    id: row.id,
    joinedAt: row.date_joined ?? row.created_at ?? null,
    name,
    notes: row.internal_notes ?? null,
    phone: row.phone ?? null,
    region: row.region ?? null,
    source: row.source ?? "public_profile",
    state: row.state ?? null,
    status: row.status ?? "pending",
    updatedAt: row.updated_at ?? null,
  };
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: PrayerPartnerPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const id = asString(payload.id);
  const status = asStatus(payload.status);

  if (!workspaceId || !isUuid(id)) {
    return NextResponse.json({ error: "Workspace and prayer partner ID are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const approvalPatch = status === "active"
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
      ...approvalPatch,
      status,
    })
    .eq("id", id)
    .or(`recruited_by_household_id.eq.${workspaceId},workspace_id.eq.${workspaceId},missionary_profile_id.eq.${workspaceId}`)
    .select(partnerSelect)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prayerPartner: mapPrayerPartner(data) });
}
