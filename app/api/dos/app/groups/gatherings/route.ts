import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type GatheringOccurrenceInput = {
  description?: unknown;
  endsAt?: unknown;
  location?: unknown;
  startsAt?: unknown;
  title?: unknown;
};

type GatheringsPayload = {
  action?: unknown;
  description?: unknown;
  endsAt?: unknown;
  gatheringId?: unknown;
  groupId?: unknown;
  location?: unknown;
  occurrences?: unknown;
  skip?: unknown;
  slug?: unknown;
  startsAt?: unknown;
  title?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoTimestamp(value: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function dateKeyFromIso(value: string) {
  return new Date(value).toISOString().slice(0, 10);
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

async function resolveGroupAndAccess(payload: GatheringsPayload) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return { response: authResult.response };
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const groupId = asString(payload.groupId);

  if (!workspaceId || !isUuid(groupId)) {
    return { response: NextResponse.json({ error: "Group not found." }, { status: 404 }) };
  }

  const supabase = createSupabaseAdminClient();
  const groupAccess = await loadDosGroupRoleAccess(supabase, authResult.authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceId,
  });

  if (groupAccess.status !== "allowed") {
    return {
      response: NextResponse.json(
        { error: groupAccess.message },
        { status: groupAccess.status === "not_found" ? 404 : groupAccess.status === "forbidden" ? 403 : 500 },
      ),
    };
  }

  const groupResult = await supabase.from("dos_groups").select("id, slug").eq("id", groupId).maybeSingle();

  if (groupResult.error || !groupResult.data) {
    return { response: NextResponse.json({ error: "Group not found." }, { status: 404 }) };
  }

  return { groupId, slug: groupResult.data.slug as string, supabase, workspaceId };
}

function mapGatheringRow(row: Record<string, unknown>) {
  return {
    description: row.description,
    endsAt: row.ends_at,
    id: row.id,
    location: row.location,
    startsAt: row.starts_at,
    status: row.status,
    title: row.title,
  };
}

export async function POST(request: Request) {
  let payload: GatheringsPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const access = await resolveGroupAndAccess(payload);

  if ("response" in access) {
    return access.response;
  }

  const { groupId, slug, supabase, workspaceId } = access;
  const action = asString(payload.action);

  if (action === "generate") {
    const occurrences = Array.isArray(payload.occurrences) ? (payload.occurrences as GatheringOccurrenceInput[]) : [];

    if (!occurrences.length) {
      return NextResponse.json({ error: "No occurrences to schedule." }, { status: 400 });
    }

    const validOccurrences = occurrences
      .map((occurrence) => ({
        description: asNullableString(occurrence.description),
        endsAt: isIsoTimestamp(asString(occurrence.endsAt)) ? asString(occurrence.endsAt) : null,
        location: asNullableString(occurrence.location),
        startsAt: asString(occurrence.startsAt),
        title: asString(occurrence.title) || "Group Gathering",
      }))
      .filter((occurrence) => isIsoTimestamp(occurrence.startsAt));

    if (!validOccurrences.length) {
      return NextResponse.json({ error: "Occurrences must include a valid date and time." }, { status: 400 });
    }

    const existingResult = await supabase
      .from("dos_group_gatherings")
      .select("starts_at")
      .eq("group_id", groupId)
      .neq("status", "canceled");

    if (existingResult.error) {
      return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
    }

    const existingDateKeys = new Set((existingResult.data ?? []).map((row) => dateKeyFromIso(row.starts_at as string)));
    const toInsert = validOccurrences.filter((occurrence) => !existingDateKeys.has(dateKeyFromIso(occurrence.startsAt)));
    const skipped = validOccurrences.length - toInsert.length;

    if (!toInsert.length) {
      return NextResponse.json({ created: [], ok: true, skipped });
    }

    const insertResult = await supabase
      .from("dos_group_gatherings")
      .insert(toInsert.map((occurrence) => ({
        description: occurrence.description,
        ends_at: occurrence.endsAt,
        group_id: groupId,
        location: occurrence.location,
        starts_at: occurrence.startsAt,
        status: "scheduled",
        title: occurrence.title,
      })))
      .select("id, group_id, title, starts_at, ends_at, location, description, status");

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);

    return NextResponse.json({ created: (insertResult.data ?? []).map(mapGatheringRow), ok: true, skipped });
  }

  if (action === "one_off") {
    const startsAt = asString(payload.startsAt);

    if (!isIsoTimestamp(startsAt)) {
      return NextResponse.json({ error: "Choose a valid gathering date and time." }, { status: 400 });
    }

    const endsAt = asString(payload.endsAt);
    // "skip" lazily materializes an already-canceled occurrence so a leader can skip a single
    // week of a recurring rhythm without ever having pre-generated that gathering row.
    const isSkip = payload.skip === true;
    const insertResult = await supabase
      .from("dos_group_gatherings")
      .insert({
        description: asNullableString(payload.description),
        ends_at: isIsoTimestamp(endsAt) ? endsAt : null,
        group_id: groupId,
        location: asNullableString(payload.location),
        starts_at: startsAt,
        status: isSkip ? "canceled" : "scheduled",
        title: asString(payload.title) || "Group Gathering",
      })
      .select("id, group_id, title, starts_at, ends_at, location, description, status")
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);

    return NextResponse.json({ gathering: mapGatheringRow(insertResult.data), ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

export async function PATCH(request: Request) {
  let payload: GatheringsPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const access = await resolveGroupAndAccess(payload);

  if ("response" in access) {
    return access.response;
  }

  const { groupId, slug, supabase } = access;
  const action = asString(payload.action);
  const gatheringId = asString(payload.gatheringId);

  if (!isUuid(gatheringId)) {
    return NextResponse.json({ error: "Gathering not found." }, { status: 404 });
  }

  if (action === "cancel") {
    const updateResult = await supabase
      .from("dos_group_gatherings")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", gatheringId)
      .eq("group_id", groupId)
      .eq("status", "scheduled")
      .select("id, group_id, title, starts_at, ends_at, location, description, status")
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);

    return NextResponse.json({ gathering: mapGatheringRow(updateResult.data), ok: true });
  }

  if (action === "update") {
    const startsAt = asString(payload.startsAt);

    if (!isIsoTimestamp(startsAt)) {
      return NextResponse.json({ error: "Choose a valid gathering date and time." }, { status: 400 });
    }

    const endsAt = asString(payload.endsAt);
    const updateResult = await supabase
      .from("dos_group_gatherings")
      .update({
        description: asNullableString(payload.description),
        ends_at: isIsoTimestamp(endsAt) ? endsAt : null,
        location: asNullableString(payload.location),
        starts_at: startsAt,
        title: asString(payload.title) || "Group Gathering",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gatheringId)
      .eq("group_id", groupId)
      .eq("status", "scheduled")
      .select("id, group_id, title, starts_at, ends_at, location, description, status")
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);

    return NextResponse.json({ gathering: mapGatheringRow(updateResult.data), ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
