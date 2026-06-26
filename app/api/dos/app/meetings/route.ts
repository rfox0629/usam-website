import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorizedUser } from "@/src/lib/dos/auth";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import {
  buildMeetingRecommendations,
  getConversationFlowDefinition,
  isUsamKitchenTableGospelWorkspace,
  normalizeConversationResponses,
  normalizeConversationFlowKey,
  type DosConversationFlowKey,
  type DosConversationResponses,
} from "@/src/lib/dos/meeting-engine";
import { deleteGoogleCalendarEventForSource, recordCalendarSyncFailure, syncGoogleCalendarEvent } from "@/src/lib/dos/google-calendar";
import { dosAppMeetingTypes, isMissingWorkspaceScopeColumn, resolveDosAppWorkspace, type DosAppMeetingType } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MeetingPayload = {
  conversationFlowKey?: unknown;
  conversationResponses?: unknown;
  fieldPersonIds?: unknown;
  id?: unknown;
  notes?: unknown;
  notesOnly?: unknown;
  googleSyncEnabled?: unknown;
  meetingStatus?: unknown;
  ministryTeamMemberIds?: unknown;
  ministryTeamPersonIds?: unknown;
  participantPersonIds?: unknown;
  scheduledEndAt?: unknown;
  scheduledStartAt?: unknown;
  supportingAttendeePersonIds?: unknown;
  supportingAttendees?: unknown;
  tableDate?: unknown;
  tableType?: unknown;
  timezone?: unknown;
  workspaceId?: unknown;
};

type ScopedPerson = {
  id: string;
  name: string;
};

type ScopedTeamMember = {
  display_name: string;
  id: string;
};

type SupportingSubRole = "child_present" | "contributor" | "learning" | "observer" | "support";

type SupportingAttendee = {
  personId: string;
  subRole: SupportingSubRole | null;
};

type RecorderIdentity = {
  displayName: string;
  teamMemberId: string | null;
  userId: string;
};

type MinistryEventSyncInput = {
  meetingId: string;
  ministryTeamMembers: ScopedTeamMember[];
  ministryTeamPeople: ScopedPerson[];
  notes: string | null;
  participants: ScopedPerson[];
  recorder: RecorderIdentity | null;
  scheduledStartAt: string | null;
  source: "command_center" | "field";
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  supportingAttendees: Array<{
    person: ScopedPerson;
    subRole: SupportingSubRole | null;
  }>;
  tableDate: string;
  tableType: DosAppMeetingType;
  workspaceId: string;
};

const supportingSubRoleSet = new Set<string>(["observer", "contributor", "learning", "support", "child_present"]);

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function uniqueStringArray(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function asSupportingSubRole(value: unknown): SupportingSubRole | null {
  const subRole = asString(value);

  return supportingSubRoleSet.has(subRole) ? (subRole as SupportingSubRole) : null;
}

function asSupportingAttendees(payload: MeetingPayload): SupportingAttendee[] {
  const fromRows = Array.isArray(payload.supportingAttendees)
    ? payload.supportingAttendees.flatMap((item): SupportingAttendee[] => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const row = item as Record<string, unknown>;
      const personId = asString(row.personId ?? row.fieldPersonId ?? row.id);

      return personId ? [{ personId, subRole: asSupportingSubRole(row.subRole ?? row.supportingSubRole) }] : [];
    })
    : [];
  const fromIds = asStringArray(payload.supportingAttendeePersonIds).map((personId) => ({
    personId,
    subRole: null,
  }));
  const byPersonId = new Map<string, SupportingAttendee>();

  [...fromRows, ...fromIds].forEach((attendee) => {
    if (!byPersonId.has(attendee.personId)) {
      byPersonId.set(attendee.personId, attendee);
    }
  });

  return Array.from(byPersonId.values());
}

function asDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : new Date().toISOString().slice(0, 10);
}

function asIsoString(value: unknown) {
  const nextValue = asString(value);

  if (!nextValue) {
    return null;
  }

  const date = new Date(nextValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asMeetingStatus(value: unknown) {
  const nextValue = asString(value);

  return nextValue === "scheduled" || nextValue === "canceled" ? nextValue : "logged";
}

function asMeetingType(value: unknown): DosAppMeetingType {
  const nextValue = asString(value);

  return dosAppMeetingTypes.includes(nextValue as DosAppMeetingType) ? nextValue as DosAppMeetingType : "kitchen_table";
}

function isMissingSchedulingColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return ["meeting_status", "scheduled_start_at", "scheduled_end_at", "timezone", "google_sync_enabled"].some((column) => message.includes(column));
}

function isMissingRecorderColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return ["recorded_by_user_id", "recorded_by_display_name"].some((column) => message.includes(column));
}

function isMissingMinistryEventModel(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return [
    "ministry_events",
    "ministry_event_people",
    "ministry_event_id",
    "recorded_by_user_id",
    "recorded_by_display_name",
  ].some((term) => message.includes(term))
    && (
      message.includes("does not exist")
      || message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("column")
      || message.includes("relation")
    );
}

function schedulingSetupResponse() {
  return NextResponse.json({ error: "Scheduling is not ready yet. You can still log a meeting now." }, { status: 500 });
}

function calendarDeleteWarning(status: "deleted" | "failed" | "needs_reconnect" | "no_link" | "not_connected") {
  if (status === "failed") {
    return "Meeting was deleted locally, but Google Calendar could not delete the synced event.";
  }

  if (status === "needs_reconnect" || status === "not_connected") {
    return "Meeting was deleted locally. Reconnect Google Calendar to clean up the synced event.";
  }

  return null;
}

function meetingRecordCandidates(record: Record<string, unknown>) {
  const schedulingKeys = ["meeting_status", "scheduled_start_at", "scheduled_end_at", "timezone", "google_sync_enabled"];
  const recorderKeys = ["recorded_by_user_id", "recorded_by_display_name"];
  const { workspace_id: _workspaceId, ...legacyRecord } = record;
  const withoutScheduling = Object.fromEntries(Object.entries(record).filter(([key]) => !schedulingKeys.includes(key)));
  const withoutRecorder = Object.fromEntries(Object.entries(record).filter(([key]) => !recorderKeys.includes(key)));
  const withoutSchedulingAndRecorder = Object.fromEntries(Object.entries(withoutScheduling).filter(([key]) => !recorderKeys.includes(key)));
  const legacyWithoutScheduling = Object.fromEntries(Object.entries(legacyRecord).filter(([key]) => !schedulingKeys.includes(key)));
  const legacyWithoutRecorder = Object.fromEntries(Object.entries(legacyRecord).filter(([key]) => !recorderKeys.includes(key)));
  const legacyWithoutSchedulingAndRecorder = Object.fromEntries(Object.entries(legacyWithoutScheduling).filter(([key]) => !recorderKeys.includes(key)));

  return [
    record,
    withoutScheduling,
    withoutRecorder,
    withoutSchedulingAndRecorder,
    legacyRecord,
    legacyWithoutScheduling,
    legacyWithoutRecorder,
    legacyWithoutSchedulingAndRecorder,
  ];
}

function meetingTitleForCalendar(participantNames: string[], tableType: DosAppMeetingType) {
  if (participantNames.length) {
    return `Meeting with ${participantNames.slice(0, 2).join(", ")}${participantNames.length > 2 ? " +" : ""}`;
  }

  return `${tableType.replace(/_/g, " ")} meeting`;
}

function meetingDescriptionForCalendar(notes: string | null) {
  return [notes?.trim() ?? "", "Created from DOS."].filter(Boolean).join("\n\n");
}

function eventTypeFromTableType(tableType: DosAppMeetingType) {
  return tableType === "kitchen_table" ? "kitchen_table" : tableType;
}

function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    ? cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : email;
}

async function loadScopedPeople(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  personIds: string[],
) {
  const ids = uniqueStringArray(personIds);

  if (!ids.length) {
    return { data: [] as ScopedPerson[], error: null };
  }

  const scopedPeopleResult = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .in("id", ids);
  const result = scopedPeopleResult.error && isMissingWorkspaceScopeColumn(scopedPeopleResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .eq("household_id", workspaceId)
      .in("id", ids)
    : scopedPeopleResult;

  return {
    data: (result.data ?? []) as ScopedPerson[],
    error: result.error,
  };
}

async function loadScopedTeamMembers(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  teamMemberIds: string[],
) {
  const ids = uniqueStringArray(teamMemberIds);

  if (!ids.length) {
    return { data: [] as ScopedTeamMember[], error: null };
  }

  const result = await supabase
    .from("missionary_team_members")
    .select("id, display_name")
    .eq("household_id", workspaceId)
    .in("id", ids);

  return {
    data: (result.data ?? []) as ScopedTeamMember[],
    error: result.error,
  };
}

function orderedPeople(ids: string[], peopleById: Map<string, ScopedPerson>) {
  return uniqueStringArray(ids)
    .map((id) => peopleById.get(id))
    .filter((person): person is ScopedPerson => Boolean(person));
}

function orderedTeamMembers(ids: string[], teamMembersById: Map<string, ScopedTeamMember>) {
  return uniqueStringArray(ids)
    .map((id) => teamMembersById.get(id))
    .filter((member): member is ScopedTeamMember => Boolean(member));
}

function roleRowsForSync(input: MinistryEventSyncInput & { ministryEventId: string }) {
  const base = {
    ministry_event_id: input.ministryEventId,
    workspace_id: input.workspaceId,
  };
  const teamMemberRows = input.ministryTeamMembers.map((member) => ({
    ...base,
    display_name: member.display_name,
    role: "ministry_team",
    team_member_id: member.id,
  }));
  const teamPersonRows = input.ministryTeamPeople.map((person) => ({
    ...base,
    display_name: person.name,
    field_person_id: person.id,
    role: "ministry_team",
  }));
  const participantRows = input.participants.map((person) => ({
    ...base,
    display_name: person.name,
    field_person_id: person.id,
    role: "participant",
  }));
  const supportingRows = input.supportingAttendees.map(({ person, subRole }) => ({
    ...base,
    display_name: person.name,
    field_person_id: person.id,
    role: "supporting_attendee",
    supporting_sub_role: subRole,
  }));
  const recorderRows = input.recorder
    ? [{
      ...base,
      display_name: input.recorder.displayName,
      role: "recorder",
      team_member_id: input.recorder.teamMemberId,
      user_id: input.recorder.userId,
    }]
    : [];

  return [
    ...teamMemberRows,
    ...teamPersonRows,
    ...participantRows,
    ...supportingRows,
    ...recorderRows,
  ];
}

async function resolveRecorder(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  authorization: DosAuthorizedUser,
): Promise<RecorderIdentity> {
  const fallbackName = displayNameFromEmail(authorization.email);
  const directResult = await supabase
    .from("missionary_team_members")
    .select("id, display_name")
    .eq("household_id", workspaceId)
    .in("dos_user_id", [authorization.userId, authorization.email])
    .limit(1);

  if (!directResult.error && directResult.data?.[0]) {
    return {
      displayName: directResult.data[0].display_name ?? fallbackName,
      teamMemberId: directResult.data[0].id,
      userId: authorization.userId,
    };
  }

  const inviteResult = await supabase
    .from("missionary_team_members")
    .select("id, display_name")
    .eq("household_id", workspaceId)
    .ilike("invite_email", authorization.email)
    .limit(1);

  if (!inviteResult.error && inviteResult.data?.[0]) {
    return {
      displayName: inviteResult.data[0].display_name ?? fallbackName,
      teamMemberId: inviteResult.data[0].id,
      userId: authorization.userId,
    };
  }

  return {
    displayName: fallbackName,
    teamMemberId: null,
    userId: authorization.userId,
  };
}

async function syncMinistryEvent(input: MinistryEventSyncInput) {
  const eventRecord = {
    event_at: input.scheduledStartAt ?? `${input.tableDate}T12:00:00.000Z`,
    event_date: input.tableDate,
    event_type: eventTypeFromTableType(input.tableType),
    notes: input.notes,
    recorder_display_name: input.recorder?.displayName ?? null,
    recorder_user_id: input.recorder?.userId ?? null,
    source: input.source,
    source_id: input.meetingId,
    source_table: "missionary_tables",
    title: "Table",
    workspace_id: input.workspaceId,
  };
  const existingEvent = await input.supabase
    .from("ministry_events")
    .select("id")
    .eq("source_table", "missionary_tables")
    .eq("source_id", input.meetingId)
    .maybeSingle();

  if (existingEvent.error) {
    if (isMissingMinistryEventModel(existingEvent.error)) {
      return null;
    }

    throw new Error(existingEvent.error.message);
  }

  const eventResult = existingEvent.data?.id
    ? await input.supabase
      .from("ministry_events")
      .update(input.recorder ? eventRecord : {
        event_at: eventRecord.event_at,
        event_date: eventRecord.event_date,
        event_type: eventRecord.event_type,
        notes: eventRecord.notes,
        source: eventRecord.source,
        title: eventRecord.title,
        workspace_id: eventRecord.workspace_id,
      })
      .eq("id", existingEvent.data.id)
      .select("id")
      .single()
    : await input.supabase
      .from("ministry_events")
      .insert(eventRecord)
      .select("id")
      .single();

  if (eventResult.error) {
    if (isMissingMinistryEventModel(eventResult.error)) {
      return null;
    }

    throw new Error(eventResult.error.message);
  }

  const ministryEventId = String(eventResult.data.id);
  const tableUpdate = input.recorder
    ? {
      ministry_event_id: ministryEventId,
      recorded_by_display_name: input.recorder.displayName,
      recorded_by_user_id: input.recorder.userId,
    }
    : {
      ministry_event_id: ministryEventId,
    };
  const tableUpdateResult = await input.supabase
    .from("missionary_tables")
    .update(tableUpdate)
    .eq("id", input.meetingId);

  if (tableUpdateResult.error && !isMissingMinistryEventModel(tableUpdateResult.error)) {
    throw new Error(tableUpdateResult.error.message);
  }

  const mutableRoleDeleteResult = await input.supabase
    .from("ministry_event_people")
    .delete()
    .eq("ministry_event_id", ministryEventId)
    .in("role", ["ministry_team", "participant", "supporting_attendee"]);

  if (mutableRoleDeleteResult.error) {
    if (isMissingMinistryEventModel(mutableRoleDeleteResult.error)) {
      return ministryEventId;
    }

    throw new Error(mutableRoleDeleteResult.error.message);
  }

  if (input.recorder) {
    const recorderDeleteResult = await input.supabase
      .from("ministry_event_people")
      .delete()
      .eq("ministry_event_id", ministryEventId)
      .eq("role", "recorder");

    if (recorderDeleteResult.error && !isMissingMinistryEventModel(recorderDeleteResult.error)) {
      throw new Error(recorderDeleteResult.error.message);
    }
  }

  const roleRows = roleRowsForSync({ ...input, ministryEventId });

  if (roleRows.length) {
    const insertResult = await input.supabase
      .from("ministry_event_people")
      .insert(roleRows);

    if (insertResult.error && !isMissingMinistryEventModel(insertResult.error)) {
      throw new Error(insertResult.error.message);
    }
  }

  return ministryEventId;
}

async function syncMeetingCalendarEvent({
  meetingId,
  notes,
  participantNames,
  scheduledEndAt,
  scheduledStartAt,
  supabase,
  tableType,
  timezone,
  workspaceId,
}: {
  meetingId: string;
  notes: string | null;
  participantNames: string[];
  scheduledEndAt: string | null;
  scheduledStartAt: string | null;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  tableType: DosAppMeetingType;
  timezone: string | null;
  workspaceId: string;
}) {
  if (!scheduledStartAt) {
    await recordCalendarSyncFailure({
      error: "Scheduled start time is required before syncing to Google Calendar.",
      sourceId: meetingId,
      sourceType: "meeting",
      supabase,
      workspaceId,
    }).catch(() => undefined);
    return;
  }

  const start = new Date(scheduledStartAt);
  const defaultEnd = new Date(start.getTime() + 60 * 60 * 1000).toISOString();

  await syncGoogleCalendarEvent({
    description: meetingDescriptionForCalendar(notes),
    endAt: scheduledEndAt ?? defaultEnd,
    reminderMinutes: [60],
    sourceId: meetingId,
    sourceType: "meeting",
    startAt: scheduledStartAt,
    timezone,
    title: meetingTitleForCalendar(participantNames, tableType),
    workspaceId,
  }, supabase).catch(async (calendarError) => {
    await recordCalendarSyncFailure({
      error: calendarError instanceof Error ? calendarError.message : "Unable to sync Google Calendar event.",
      sourceId: meetingId,
      sourceType: "meeting",
      supabase,
      workspaceId,
    }).catch(() => undefined);
  });
}

async function readPayload(request: Request) {
  try {
    return await request.json() as MeetingPayload;
  } catch {
    return null;
  }
}

function meetingEngineData(payload: MeetingPayload, allowGatedConversationFlows: boolean): {
  conversationFlowKey: DosConversationFlowKey;
  conversationResponses: DosConversationResponses;
} {
  const requestedFlow = normalizeConversationFlowKey(payload.conversationFlowKey, allowGatedConversationFlows);
  const conversationResponses = normalizeConversationResponses(requestedFlow, payload.conversationResponses);

  return {
    conversationFlowKey: requestedFlow,
    conversationResponses,
  };
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

function unavailableConversationFlowResponse(value: unknown, allowGatedConversationFlows: boolean) {
  if (typeof value !== "string" || value === "none") {
    return null;
  }

  const requestedFlow = getConversationFlowDefinition(value as DosConversationFlowKey);

  if (normalizeConversationFlowKey(value, allowGatedConversationFlows) !== "none") {
    return null;
  }

  const flowName = requestedFlow?.title ?? "Conversation flow";

  return NextResponse.json({ error: `${flowName} is not available for this workspace.` }, { status: 403 });
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId));

  if (!workspace) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceId = workspace.id;
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const allowGatedConversationFlows = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });

  const unavailableFlowResponse = unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows);

  if (unavailableFlowResponse) {
    return unavailableFlowResponse;
  }

  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowGatedConversationFlows);
  const legacyFieldPersonIds = asStringArray(payload.fieldPersonIds);
  const participantPersonIds = uniqueStringArray(
    asStringArray(payload.participantPersonIds).length
      ? asStringArray(payload.participantPersonIds)
      : legacyFieldPersonIds,
  );
  const ministryTeamMemberIds = uniqueStringArray(asStringArray(payload.ministryTeamMemberIds));
  const ministryTeamPersonIds = uniqueStringArray(asStringArray(payload.ministryTeamPersonIds));
  const supportingAttendeeInputs = asSupportingAttendees(payload);
  const supportingPersonIds = supportingAttendeeInputs.map((attendee) => attendee.personId);
  const supabase = createSupabaseAdminClient();
  const [peopleResult, teamMembersResult, recorder] = await Promise.all([
    loadScopedPeople(supabase, workspaceId, [
      ...participantPersonIds,
      ...ministryTeamPersonIds,
      ...supportingPersonIds,
    ]),
    loadScopedTeamMembers(supabase, workspaceId, ministryTeamMemberIds),
    resolveRecorder(supabase, workspaceId, authResult.authorization),
  ]);

  if (peopleResult.error) {
    return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });
  }

  if (teamMembersResult.error) {
    return NextResponse.json({ error: teamMembersResult.error.message }, { status: 500 });
  }

  const peopleById = new Map(peopleResult.data.map((person) => [person.id, person]));
  const teamMembersById = new Map(teamMembersResult.data.map((member) => [member.id, member]));
  const validPeople = orderedPeople(participantPersonIds, peopleById);
  const validPersonIds = validPeople.map((person) => person.id);
  const participantNames = validPeople.map((person) => person.name);
  const ministryTeamMembers = orderedTeamMembers(ministryTeamMemberIds, teamMembersById);
  const ministryTeamPeople = orderedPeople(ministryTeamPersonIds, peopleById);
  const supportingAttendees = supportingAttendeeInputs
    .map((attendee) => {
      const person = peopleById.get(attendee.personId);

      return person ? { person, subRole: attendee.subRole } : null;
    })
    .filter((attendee): attendee is { person: ScopedPerson; subRole: SupportingSubRole | null } => Boolean(attendee))
    .filter((attendee) => !validPersonIds.includes(attendee.person.id));
  const recommendedResources = buildMeetingRecommendations(conversationFlowKey, conversationResponses);
  const meetingStatus = asMeetingStatus(payload.meetingStatus);
  const scheduledStartAt = asIsoString(payload.scheduledStartAt);
  const scheduledEndAt = asIsoString(payload.scheduledEndAt);
  const tableType = asMeetingType(payload.tableType);
  const timezone = asString(payload.timezone) || null;
  const googleSyncEnabled = payload.googleSyncEnabled === true;
  const notes = asString(payload.notes) || null;
  const requiresSchedulingColumns = meetingStatus === "scheduled" || Boolean(scheduledStartAt || scheduledEndAt || timezone || googleSyncEnabled);
  const meetingInsert: Record<string, unknown> = {
    conversation_flow_key: conversationFlowKey,
    conversation_responses: conversationResponses,
    field_person_ids: validPersonIds,
    google_sync_enabled: googleSyncEnabled,
    household_id: workspaceId,
    meeting_status: meetingStatus,
    notes,
    participant_names: participantNames,
    recommended_resources: recommendedResources,
    recorded_by_display_name: recorder.displayName,
    recorded_by_user_id: recorder.userId,
    scheduled_end_at: scheduledEndAt,
    scheduled_start_at: scheduledStartAt,
    source: "field",
    table_date: asDateString(payload.tableDate),
    table_type: tableType,
    timezone,
    workspace_id: workspaceId,
  };
  let insertResult: { data: { id: unknown } | null; error: { message: string } | null } | null = null;

  for (const candidate of meetingRecordCandidates(meetingInsert)) {
    insertResult = await supabase
      .from("missionary_tables")
      .insert(candidate)
      .select("id")
      .single();

    if (insertResult.error && requiresSchedulingColumns && isMissingSchedulingColumn(insertResult.error)) {
      break;
    }

    if (!insertResult.error || (!isMissingWorkspaceScopeColumn(insertResult.error) && !isMissingSchedulingColumn(insertResult.error) && !isMissingRecorderColumn(insertResult.error))) {
      break;
    }
  }

  const { data, error } = insertResult ?? { data: null, error: { message: "Unable to create meeting." } };

  if (error) {
    if (requiresSchedulingColumns && isMissingSchedulingColumn(error)) {
      return schedulingSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to create meeting." }, { status: 500 });
  }

  await syncMinistryEvent({
    meetingId: String(data.id),
    ministryTeamMembers,
    ministryTeamPeople,
    notes,
    participants: validPeople,
    recorder,
    scheduledStartAt,
    source: "field",
    supabase,
    supportingAttendees,
    tableDate: asDateString(payload.tableDate),
    tableType,
    workspaceId,
  }).catch((syncError) => {
    console.warn("[DOS ministry events] Unable to sync ministry event after meeting create", syncError);
  });

  if (validPersonIds.length && meetingStatus === "logged") {
    await supabase
      .from("missionary_field_people")
      .update({ last_activity_at: new Date().toISOString() })
      .in("id", validPersonIds);
  }

  if (meetingStatus === "logged") {
    await recalculateCircleScores(workspaceId).catch((scoreError) => {
      console.warn("[DOS circles] Unable to recalculate after meeting create", scoreError);
    });
  }

  if (data?.id && googleSyncEnabled && meetingStatus === "scheduled") {
    await syncMeetingCalendarEvent({
      meetingId: String(data.id),
      notes,
      participantNames,
      scheduledEndAt,
      scheduledStartAt,
      supabase,
      tableType,
      timezone,
      workspaceId,
    });
  }

  return NextResponse.json({ id: data.id, ok: true });
}

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId));
  const id = asString(payload.id);

  if (!workspace || !isUuid(id)) {
    return NextResponse.json({ error: "Missionary meeting not found." }, { status: 404 });
  }

  const workspaceId = workspace.id;
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();

  if (payload.notesOnly === true) {
    const notesOnlyUpdate = {
      notes: asString(payload.notes) || null,
    };
    const notesOnlyResult = await supabase
      .from("missionary_tables")
      .update(notesOnlyUpdate)
      .eq("id", id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .select("id")
      .single();
    // TODO: Remove the household_id-only fallback after all Supabase environments
    // have the Command Center workspace_id migration applied.
    const { data, error } = notesOnlyResult.error && isMissingWorkspaceScopeColumn(notesOnlyResult.error)
      ? await supabase
        .from("missionary_tables")
        .update(notesOnlyUpdate)
        .eq("id", id)
        .eq("household_id", workspaceId)
        .select("id")
        .single()
      : notesOnlyResult;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eventNotesResult = await supabase
      .from("ministry_events")
      .update({ notes: notesOnlyUpdate.notes })
      .eq("source_table", "missionary_tables")
      .eq("source_id", id);

    if (eventNotesResult.error && !isMissingMinistryEventModel(eventNotesResult.error)) {
      return NextResponse.json({ error: eventNotesResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, ok: true });
  }

  const allowGatedConversationFlows = isUsamKitchenTableGospelWorkspace({ publicProfileHref: `/missionaries/${workspace.slug}`, slug: workspace.slug });
  const unavailableFlowResponse = unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows);

  if (unavailableFlowResponse) {
    return unavailableFlowResponse;
  }

  const { conversationFlowKey, conversationResponses } = meetingEngineData(payload, allowGatedConversationFlows);
  const legacyFieldPersonIds = asStringArray(payload.fieldPersonIds);
  const participantPersonIds = uniqueStringArray(
    asStringArray(payload.participantPersonIds).length
      ? asStringArray(payload.participantPersonIds)
      : legacyFieldPersonIds,
  );
  const ministryTeamMemberIds = uniqueStringArray(asStringArray(payload.ministryTeamMemberIds));
  const ministryTeamPersonIds = uniqueStringArray(asStringArray(payload.ministryTeamPersonIds));
  const supportingAttendeeInputs = asSupportingAttendees(payload);
  const supportingPersonIds = supportingAttendeeInputs.map((attendee) => attendee.personId);
  const [peopleResult, teamMembersResult] = await Promise.all([
    loadScopedPeople(supabase, workspaceId, [
      ...participantPersonIds,
      ...ministryTeamPersonIds,
      ...supportingPersonIds,
    ]),
    loadScopedTeamMembers(supabase, workspaceId, ministryTeamMemberIds),
  ]);

  if (peopleResult.error) {
    return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });
  }

  if (teamMembersResult.error) {
    return NextResponse.json({ error: teamMembersResult.error.message }, { status: 500 });
  }

  const peopleById = new Map(peopleResult.data.map((person) => [person.id, person]));
  const teamMembersById = new Map(teamMembersResult.data.map((member) => [member.id, member]));
  const validPeople = orderedPeople(participantPersonIds, peopleById);
  const validPersonIds = validPeople.map((person) => person.id);
  const participantNames = validPeople.map((person) => person.name);
  const ministryTeamMembers = orderedTeamMembers(ministryTeamMemberIds, teamMembersById);
  const ministryTeamPeople = orderedPeople(ministryTeamPersonIds, peopleById);
  const supportingAttendees = supportingAttendeeInputs
    .map((attendee) => {
      const person = peopleById.get(attendee.personId);

      return person ? { person, subRole: attendee.subRole } : null;
    })
    .filter((attendee): attendee is { person: ScopedPerson; subRole: SupportingSubRole | null } => Boolean(attendee))
    .filter((attendee) => !validPersonIds.includes(attendee.person.id));
  const meetingStatus = asMeetingStatus(payload.meetingStatus);
  const scheduledStartAt = asIsoString(payload.scheduledStartAt);
  const scheduledEndAt = asIsoString(payload.scheduledEndAt);
  const tableType = asMeetingType(payload.tableType);
  const timezone = asString(payload.timezone) || null;
  const googleSyncEnabled = payload.googleSyncEnabled === true;
  const notes = asString(payload.notes) || null;
  const requiresSchedulingColumns = meetingStatus === "scheduled" || Boolean(scheduledStartAt || scheduledEndAt || timezone || googleSyncEnabled);
  const meetingUpdate: Record<string, unknown> = {
    conversation_flow_key: conversationFlowKey,
    conversation_responses: conversationResponses,
    field_person_ids: validPersonIds,
    google_sync_enabled: googleSyncEnabled,
    meeting_status: meetingStatus,
    notes,
    participant_names: participantNames,
    recommended_resources: buildMeetingRecommendations(conversationFlowKey, conversationResponses),
    scheduled_end_at: scheduledEndAt,
    scheduled_start_at: scheduledStartAt,
    table_date: asDateString(payload.tableDate),
    table_type: tableType,
    timezone,
  };
  let updateResult: { data: { id: unknown } | null; error: { message: string } | null } | null = null;

  for (const candidate of meetingRecordCandidates(meetingUpdate)) {
    const scopedUpdateResult = await supabase
      .from("missionary_tables")
      .update(candidate)
      .eq("id", id)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .select("id")
      .single();

    updateResult = scopedUpdateResult.error && isMissingWorkspaceScopeColumn(scopedUpdateResult.error)
      ? await supabase
        .from("missionary_tables")
        .update(candidate)
        .eq("id", id)
        .eq("household_id", workspaceId)
        .select("id")
        .single()
      : scopedUpdateResult;

    if (updateResult.error && requiresSchedulingColumns && isMissingSchedulingColumn(updateResult.error)) {
      break;
    }

    if (!updateResult.error || (!isMissingWorkspaceScopeColumn(updateResult.error) && !isMissingSchedulingColumn(updateResult.error))) {
      break;
    }
  }

  const { data, error } = updateResult ?? { data: null, error: { message: "Unable to update meeting." } };

  if (error) {
    if (requiresSchedulingColumns && isMissingSchedulingColumn(error)) {
      return schedulingSetupResponse();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to update meeting." }, { status: 500 });
  }

  await syncMinistryEvent({
    meetingId: id,
    ministryTeamMembers,
    ministryTeamPeople,
    notes,
    participants: validPeople,
    recorder: null,
    scheduledStartAt,
    source: "field",
    supabase,
    supportingAttendees,
    tableDate: asDateString(payload.tableDate),
    tableType,
    workspaceId,
  }).catch((syncError) => {
    console.warn("[DOS ministry events] Unable to sync ministry event after meeting update", syncError);
  });

  if (validPersonIds.length && meetingStatus === "logged") {
    await supabase
      .from("missionary_field_people")
      .update({ last_activity_at: new Date().toISOString() })
      .in("id", validPersonIds);
  }

  if (meetingStatus === "logged") {
    await recalculateCircleScores(workspaceId).catch((scoreError) => {
      console.warn("[DOS circles] Unable to recalculate after meeting update", scoreError);
    });
  }

  if (data?.id && googleSyncEnabled && meetingStatus === "scheduled") {
    await syncMeetingCalendarEvent({
      meetingId: String(data.id),
      notes,
      participantNames,
      scheduledEndAt,
      scheduledStartAt,
      supabase,
      tableType,
      timezone,
      workspaceId,
    });
  }

  return NextResponse.json({ id: data.id, ok: true });
}

export async function DELETE(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId));
  const id = asString(payload.id);

  if (!workspace || !isUuid(id)) {
    return NextResponse.json({ error: "Missionary meeting not found." }, { status: 404 });
  }

  const workspaceId = workspace.id;
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const scopedResult = await supabase
    .from("missionary_tables")
    .delete()
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .select("id")
    .single();
  const { data, error } = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_tables")
      .delete()
      .eq("id", id)
      .eq("household_id", workspaceId)
      .select("id")
      .single()
    : scopedResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Unable to delete meeting." }, { status: 500 });
  }

  await recalculateCircleScores(workspaceId).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after meeting delete", scoreError);
  });

  const calendarDelete = await deleteGoogleCalendarEventForSource({
    sourceId: String(data.id),
    sourceType: "meeting",
    workspaceId,
  }, supabase).catch(() => ({ status: "failed" as const }));
  const calendarWarning = calendarDeleteWarning(calendarDelete.status);

  return NextResponse.json({ calendarWarning, id: data.id, deleted: true, ok: true });
}
