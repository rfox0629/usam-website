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
  attendance?: unknown;
  coveredSummary?: unknown;
  description?: unknown;
  endsAt?: unknown;
  gatheringId?: unknown;
  groupId?: unknown;
  journeyResourceSlug?: unknown;
  journeySessionId?: unknown;
  location?: unknown;
  notes?: unknown;
  occurrences?: unknown;
  prayerRequests?: unknown;
  slug?: unknown;
  startsAt?: unknown;
  title?: unknown;
  workspaceId?: unknown;
};

/* One attendee as the screen sends it. */
type AttendanceInput = { notes?: unknown; personId?: unknown; status?: unknown };
type PrayerRequestInput = { personId?: unknown; request?: unknown; title?: unknown };

const attendanceStatuses = new Set(["present", "absent", "guest"]);
const recordSelect = "id, group_id, title, starts_at, ends_at, location, description, status, linked_table_event_id, acting_leader_person_id, shared_notes, shared_prayer_summary, shared_follow_up, fruit_summary, ministry_event_id, started_at, completed_at";
const recordJourneySelect = `${recordSelect}, covered_summary, journey_resource_slug, journey_session_id`;

function isMissingJourneyColumn(error: { message?: string } | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();

  return ["covered_summary", "journey_resource_slug", "journey_session_id"].some((column) => message.includes(column));
}

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

  return { authorization: authResult.authorization, groupId, slug: groupResult.data.slug as string, supabase, workspaceId };
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

  /* One gathering record, saved once, safe to save again (2026-09-11).
     Attendance is one row per attendee (unique per gathering and person, so a
     retry cannot duplicate); members not marked get no row, and a member
     marked earlier but unmarked now is kept as absent so history survives.
     Prayer requests are canonical prayer_requests rows linked by
     gathering_id, matched on title and text so a retry cannot duplicate.
     Nothing here creates a meeting record or Fruit. */
  if (action === "record") {
    const gatheringId = asString(payload.gatheringId);
    const startsAt = asString(payload.startsAt);
    const endsAt = asString(payload.endsAt);

    if (!isIsoTimestamp(startsAt)) {
      return NextResponse.json({ error: "Choose a valid gathering date and time." }, { status: 400 });
    }

    if (endsAt && (!isIsoTimestamp(endsAt) || new Date(endsAt).getTime() < new Date(startsAt).getTime())) {
      return NextResponse.json({ error: "The gathering cannot end before it starts." }, { status: 400 });
    }

    const attendanceInputs = Array.isArray(payload.attendance) ? (payload.attendance as AttendanceInput[]) : [];
    const attendance = attendanceInputs.map((row) => ({
      notes: asNullableString(row.notes),
      personId: asString(row.personId),
      status: asString(row.status),
    }));

    if (attendance.some((row) => !isUuid(row.personId) || !attendanceStatuses.has(row.status))) {
      return NextResponse.json({ error: "Attendance must name people in this workspace with a valid status." }, { status: 400 });
    }

    if (new Set(attendance.map((row) => row.personId)).size !== attendance.length) {
      return NextResponse.json({ error: "The same person appears twice in this attendance." }, { status: 400 });
    }

    /* Every named person must belong to this workspace. */
    if (attendance.length) {
      const peopleResult = await supabase
        .from("missionary_field_people")
        .select("id")
        .in("id", attendance.map((row) => row.personId))
        .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

      if (peopleResult.error) {
        return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });
      }

      const known = new Set((peopleResult.data ?? []).map((row) => row.id as string));

      if (attendance.some((row) => !known.has(row.personId))) {
        return NextResponse.json({ error: "One of those people is not in this workspace. Nothing was saved." }, { status: 400 });
      }
    }

    const prayerInputs = Array.isArray(payload.prayerRequests) ? (payload.prayerRequests as PrayerRequestInput[]) : [];
    const prayerRequests = prayerInputs
      .map((row) => ({ personId: asString(row.personId), request: asString(row.request), title: asString(row.title) }))
      .filter((row) => row.title || row.request)
      .map((row) => ({ ...row, request: row.request || row.title, title: row.title || row.request.slice(0, 80) }));

    if (prayerRequests.some((row) => row.personId && !isUuid(row.personId))) {
      return NextResponse.json({ error: "A prayer request names someone DOS does not recognise." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const journeyFields = {
      covered_summary: asNullableString(payload.coveredSummary),
      journey_resource_slug: asNullableString(payload.journeyResourceSlug),
      journey_session_id: asNullableString(payload.journeySessionId),
    };
    const gatheringFields = {
      completed_at: endsAt || startsAt,
      ends_at: endsAt || null,
      shared_notes: asNullableString(payload.notes),
      started_at: startsAt,
      starts_at: startsAt,
      status: "completed",
      updated_at: nowIso,
    };
    const hasJourneyInput = Boolean(journeyFields.covered_summary || journeyFields.journey_resource_slug || journeyFields.journey_session_id);

    /* Write the gathering: an existing row is completed in place; an
       unscheduled gathering becomes a new completed row. The Journey columns
       are included only when present in the database. */
    let gatheringRow: Record<string, unknown> | null = null;
    let journeyFieldsSupported = true;
    const writeGathering = async (withJourney: boolean) => {
      const fields = withJourney ? { ...gatheringFields, ...journeyFields } : gatheringFields;
      const select = withJourney ? recordJourneySelect : recordSelect;

      if (gatheringId) {
        if (!isUuid(gatheringId)) {
          return { data: null, error: { message: "Gathering not found." } };
        }

        return supabase
          .from("dos_group_gatherings")
          .update(fields)
          .eq("id", gatheringId)
          .eq("group_id", groupId)
          .neq("status", "canceled")
          .select(select)
          .maybeSingle();
      }

      return supabase
        .from("dos_group_gatherings")
        .insert({
          ...fields,
          description: asNullableString(payload.description),
          group_id: groupId,
          location: asNullableString(payload.location),
          title: asString(payload.title) || "Group Gathering",
        })
        .select(select)
        .single();
    };
    let written = await writeGathering(true);

    if (written.error && isMissingJourneyColumn(written.error)) {
      journeyFieldsSupported = false;

      if (hasJourneyInput) {
        return NextResponse.json({ error: "What we covered and the Journey link are not available yet. Everything else can be saved; clear those fields and save again." }, { status: 409 });
      }

      written = await writeGathering(false);
    }

    if (written.error || !written.data) {
      return NextResponse.json({ error: written.error?.message ?? "Gathering not found." }, { status: written.error?.message === "Gathering not found." ? 404 : 500 });
    }

    gatheringRow = written.data as unknown as Record<string, unknown>;
    const savedGatheringId = gatheringRow.id as string;

    /* Attendance: upsert the marked rows; keep history for anyone marked
       before and unmarked now. */
    const existingAttendance = await supabase
      .from("dos_group_attendance")
      .select("id, person_id, status")
      .eq("gathering_id", savedGatheringId);

    if (existingAttendance.error) {
      return NextResponse.json({ error: existingAttendance.error.message }, { status: 500 });
    }

    const marked = new Set(attendance.map((row) => row.personId));
    const toAbsent = (existingAttendance.data ?? []).filter((row) => !marked.has(row.person_id as string) && row.status !== "absent").map((row) => row.id as string);

    if (attendance.length) {
      const upsert = await supabase
        .from("dos_group_attendance")
        .upsert(attendance.map((row) => ({
          gathering_id: savedGatheringId,
          notes: row.notes,
          person_id: row.personId,
          status: row.status,
          updated_at: nowIso,
        })), { onConflict: "gathering_id,person_id" });

      if (upsert.error) {
        return NextResponse.json({ error: upsert.error.message }, { status: 500 });
      }
    }

    if (toAbsent.length) {
      const absent = await supabase
        .from("dos_group_attendance")
        .update({ status: "absent", updated_at: nowIso })
        .in("id", toAbsent);

      if (absent.error) {
        return NextResponse.json({ error: absent.error.message }, { status: 500 });
      }
    }

    /* Prayer requests: canonical rows, one per distinct request per gathering. */
    if (prayerRequests.length) {
      const existingPrayers = await supabase
        .from("prayer_requests")
        .select("id, title, request")
        .eq("gathering_id", savedGatheringId)
        .neq("status", "archived");

      if (existingPrayers.error) {
        return NextResponse.json({ error: existingPrayers.error.message }, { status: 500 });
      }

      const seen = new Set((existingPrayers.data ?? []).map((row) => `${(row.title as string).trim().toLowerCase()}|${(row.request as string).trim().toLowerCase()}`));
      const toInsert = prayerRequests.filter((row) => {
        const key = `${row.title.trim().toLowerCase()}|${row.request.trim().toLowerCase()}`;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);

        return true;
      });

      if (toInsert.length) {
        const insertPrayers = await supabase
          .from("prayer_requests")
          .insert(toInsert.map((row) => ({
            category: "group",
            confidentiality_level: "missionary_couple",
            created_by: access.authorization.userId ?? null,
            created_by_user_id: access.authorization.userId ?? null,
            description: row.request,
            field_person_id: row.personId || null,
            gathering_id: savedGatheringId,
            group_id: groupId,
            household_id: workspaceId,
            linked_person_ids: row.personId ? [row.personId] : [],
            priority: "normal",
            related_household_id: workspaceId,
            related_missionary_profile_id: workspaceId,
            request: row.request,
            source: "dos_group",
            status: "active",
            title: row.title,
            urgency: "normal",
            visibility: "group_leaders",
            workspace_id: workspaceId,
          })));

        if (insertPrayers.error) {
          return NextResponse.json({ error: insertPrayers.error.message }, { status: 500 });
        }
      }
    }

    const finalAttendance = await supabase
      .from("dos_group_attendance")
      .select("id, gathering_id, person_id, status, notes, first_time_guest")
      .eq("gathering_id", savedGatheringId);

    if (finalAttendance.error) {
      return NextResponse.json({ error: finalAttendance.error.message }, { status: 500 });
    }

    /* The gathering's prayer requests come back so the open app can show them without waiting for a reload. */
    const finalPrayers = await supabase
      .from("prayer_requests")
      .select("id, title, request, field_person_id, linked_person_ids, created_at, updated_at, status, visibility, category, source, created_by_user_id, created_by_person_id")
      .eq("gathering_id", savedGatheringId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (finalPrayers.error) {
      return NextResponse.json({ error: finalPrayers.error.message }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);

    return NextResponse.json({
      attendance: (finalAttendance.data ?? []).map((row) => ({
        firstTimeGuest: row.first_time_guest === true,
        gatheringId: row.gathering_id,
        id: row.id,
        notes: row.notes ?? null,
        personId: row.person_id,
        status: row.status,
      })),
      gathering: {
        ...mapGatheringRow(gatheringRow),
        actingLeaderPersonId: gatheringRow.acting_leader_person_id ?? null,
        completedAt: gatheringRow.completed_at ?? null,
        coveredSummary: journeyFieldsSupported ? gatheringRow.covered_summary ?? null : null,
        fruitSummary: gatheringRow.fruit_summary ?? null,
        journeyResourceSlug: journeyFieldsSupported ? gatheringRow.journey_resource_slug ?? null : null,
        journeySessionId: journeyFieldsSupported ? gatheringRow.journey_session_id ?? null : null,
        linkedTableEventId: gatheringRow.linked_table_event_id ?? null,
        ministryEventId: gatheringRow.ministry_event_id ?? null,
        sharedFollowUp: gatheringRow.shared_follow_up ?? null,
        sharedNotes: gatheringRow.shared_notes ?? null,
        sharedPrayerSummary: gatheringRow.shared_prayer_summary ?? null,
        startedAt: gatheringRow.started_at ?? null,
      },
      journeyFieldsSupported,
      ok: true,
      prayerRequests: (finalPrayers.data ?? []).map((row) => ({
        category: (row.category as string | null) ?? null,
        createdAt: row.created_at as string,
        createdByPersonId: (row.created_by_person_id as string | null) ?? null,
        createdByUserId: (row.created_by_user_id as string | null) ?? null,
        fieldPersonId: (row.field_person_id as string | null) ?? null,
        gatheringId: savedGatheringId,
        groupId,
        id: row.id as string,
        linkedPersonIds: Array.isArray(row.linked_person_ids) ? (row.linked_person_ids as string[]).filter(Boolean) : [],
        request: (row.request as string | null) ?? "",
        source: (row.source as string | null) ?? null,
        status: row.status === "answered" ? "answered" : "active",
        title: (row.title as string | null) ?? "Prayer request",
        updatedAt: (row.updated_at as string | null) ?? null,
        visibility: (row.visibility as string | null) ?? "group_leaders",
        workspaceId,
      })),
    });
  }

  if (action === "one_off") {
    const startsAt = asString(payload.startsAt);

    if (!isIsoTimestamp(startsAt)) {
      return NextResponse.json({ error: "Choose a valid gathering date and time." }, { status: 400 });
    }

    const endsAt = asString(payload.endsAt);
    const insertResult = await supabase
      .from("dos_group_gatherings")
      .insert({
        description: asNullableString(payload.description),
        ends_at: isIsoTimestamp(endsAt) ? endsAt : null,
        group_id: groupId,
        location: asNullableString(payload.location),
        starts_at: startsAt,
        status: "scheduled",
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

  if (action === "skip") {
    const startsAt = asString(payload.startsAt);

    if (!isIsoTimestamp(startsAt)) {
      return NextResponse.json({ error: "Choose a valid gathering date and time to skip." }, { status: 400 });
    }

    const existingScheduledResult = await supabase
      .from("dos_group_gatherings")
      .select("id")
      .eq("group_id", groupId)
      .eq("starts_at", startsAt)
      .eq("status", "scheduled")
      .limit(1);

    if (existingScheduledResult.error) {
      return NextResponse.json({ error: existingScheduledResult.error.message }, { status: 500 });
    }

    const existingScheduled = existingScheduledResult.data?.[0];

    if (existingScheduled?.id) {
      const updateResult = await supabase
        .from("dos_group_gatherings")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", existingScheduled.id)
        .eq("group_id", groupId)
        .select("id, group_id, title, starts_at, ends_at, location, description, status")
        .single();

      if (updateResult.error) {
        return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
      }

      revalidatePath("/groups");
      revalidatePath(`/groups/${slug}`);

      return NextResponse.json({ gathering: mapGatheringRow(updateResult.data), ok: true });
    }

    const existingCanceledResult = await supabase
      .from("dos_group_gatherings")
      .select("id, group_id, title, starts_at, ends_at, location, description, status")
      .eq("group_id", groupId)
      .eq("starts_at", startsAt)
      .eq("status", "canceled")
      .limit(1);

    if (existingCanceledResult.error) {
      return NextResponse.json({ error: existingCanceledResult.error.message }, { status: 500 });
    }

    const existingCanceled = existingCanceledResult.data?.[0];

    if (existingCanceled) {
      return NextResponse.json({ gathering: mapGatheringRow(existingCanceled), ok: true });
    }

    const endsAt = asString(payload.endsAt);
    const insertResult = await supabase
      .from("dos_group_gatherings")
      .insert({
        description: asNullableString(payload.description),
        ends_at: isIsoTimestamp(endsAt) ? endsAt : null,
        group_id: groupId,
        location: asNullableString(payload.location),
        starts_at: startsAt,
        status: "canceled",
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
