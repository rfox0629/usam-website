import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { inferFruitEventsFromReflection } from "@/src/lib/dos/fruit-intelligence";
import { dosAppFruitTypeOptions, isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ReflectionPayload = {
  followUpNeeded?: unknown;
  meetingId?: unknown;
  nextStep?: unknown;
  observedFruit?: unknown;
  prayerNeeds?: unknown;
  privateNotes?: unknown;
  spiritualOpenness?: unknown;
  whatHappened?: unknown;
  workspaceId?: unknown;
};

function asString(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asObservedFruit(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && dosAppFruitTypeOptions.includes(item as typeof dosAppFruitTypeOptions[number]))
    : [];
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

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: ReflectionPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const meetingId = asString(payload.meetingId);

  if (!workspaceId || !isUuid(meetingId)) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const meetingResult = await supabase
    .from("missionary_tables")
    .select("id, field_person_ids")
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  const { data: meeting, error: meetingError } = meetingResult.error && isMissingWorkspaceScopeColumn(meetingResult.error)
    ? await supabase
      .from("missionary_tables")
      .select("id, field_person_ids")
      .eq("id", meetingId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : meetingResult;

  if (meetingError) {
    return NextResponse.json({ error: meetingError.message }, { status: 500 });
  }

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const observedFruit = asObservedFruit(payload.observedFruit);
  const personIds = Array.isArray(meeting.field_person_ids) ? meeting.field_person_ids.filter((id): id is string => typeof id === "string") : [];
  const reflectionInsert = {
    follow_up_needed: payload.followUpNeeded === true,
    leader_id: authResult.authorization.userId,
    meeting_id: meetingId,
    next_step: asString(payload.nextStep, 160) || null,
    observed_fruit: observedFruit,
    person_id: personIds.length === 1 ? personIds[0] : null,
    prayer_needs: asString(payload.prayerNeeds) || null,
    private_notes: asString(payload.privateNotes) || null,
    spiritual_openness: asString(payload.spiritualOpenness, 80) || null,
    what_happened: asString(payload.whatHappened) || null,
  };
  const { data: reflection, error: reflectionError } = await supabase
    .from("meeting_reflections")
    .insert(reflectionInsert)
    .select("id")
    .single();

  if (reflectionError || !reflection) {
    return NextResponse.json({ error: reflectionError?.message ?? "Unable to save Leader Reflection." }, { status: 500 });
  }

  await inferFruitEventsFromReflection({
    followUpNeeded: reflectionInsert.follow_up_needed,
    id: String(reflection.id),
    leaderId: authResult.authorization.userId,
    meetingId,
    nextStep: reflectionInsert.next_step,
    observedFruit,
    personId: reflectionInsert.person_id,
    prayerNeeds: reflectionInsert.prayer_needs,
    privateNotes: reflectionInsert.private_notes,
    spiritualOpenness: reflectionInsert.spiritual_openness,
    whatHappened: reflectionInsert.what_happened,
  }, supabase);

  return NextResponse.json({ id: reflection.id, ok: true });
}
