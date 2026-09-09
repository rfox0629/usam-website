/* Master Ministry Report — Time Investment (USA-249 / USA-251).
 *
 * The first report answers one stewardship question: where is a
 * missionary's time going in the field God has given them, and what is
 * happening through that investment. This module is the whole calculation.
 * It is pure (no React, no Supabase, no server-only import), so the
 * regression script runs it directly and a future server route can reuse it
 * for the safe summaries that flow up a confirmed discipleship chain
 * (USA-253).
 *
 * Founder decisions of 2026-09-09 (USA-250 and the review of PR #130):
 *
 *   - the Person's structured relationship is the canonical direction; My
 *     Record is a fallback that must be reconciled to it (registry §5)
 *   - time is split into what the missionary INVESTED (meetings where they
 *     ministered, discipled mutually, or planned) and what was INVESTED IN
 *     THEM (meetings where they were the one being discipled); the two are
 *     never ranked together
 *   - default range is the last 30 days; 7 / 30 / 90 / custom are offered
 *   - accountability check-ins are their own activity type: never counted
 *     as meetings, never added to contact-time hours
 *   - a group meeting credits its full duration to every linked person as
 *     relationship-contact time; person rows are therefore never summed and
 *     presented as unique missionary elapsed time (see `totals`)
 *   - duration is what was logged: a logged meeting with both a start and an
 *     end contributes that difference; anything else contributes nothing and
 *     marks the row Partial. There is no 45/60/75-minute estimate here.
 *     Historical start times are a synthetic noon (USA-246), so this is a
 *     "logged duration", never clock-in / clock-out precision.
 *   - a missing record never proves that no ministry happened, so the
 *     completeness states are Recorded / Partial / No qualifying activity
 *     and the word "inactive" does not appear
 *   - nothing circle-based; multiplication only from a downstream person's
 *     own confirmed, directed Person relationship reached through their DOS
 *     identity (no separate chain model)
 *   - Journey progress is not read; when it is, canonical progress rows
 *     win over a stale assignment status (USA-258)
 *
 * Every input type below lists exactly the fields the report reads. Private
 * notes, prayer wording, My Record narrative, participant responses,
 * reflections, and testimony content are not inputs, so they cannot leak
 * into an output.
 */

export type DosMinistryReportRange = "7d" | "30d" | "90d" | "custom";

export const dosMinistryReportRangeOptions: ReadonlyArray<{ label: string; value: DosMinistryReportRange }> = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "Custom", value: "custom" },
];

export const dosMinistryReportDefaultRange: DosMinistryReportRange = "30d";

export type DosMinistryReportPeriod = {
  /* Inclusive calendar days, YYYY-MM-DD, in the viewer's local calendar. */
  end: string;
  range: DosMinistryReportRange;
  start: string;
};

export type DosMinistryRelationshipDirection = "discipling_me" | "i_am_discipling" | "walking_with" | "peer" | "none";

/* The only visible words for direction. "Mentor" is a legacy stored value
   (USA-260) and is rendered through these labels, never shown. */
export const dosMinistryRelationshipDirectionLabels: Record<DosMinistryRelationshipDirection, string> = {
  discipling_me: "Discipling me",
  i_am_discipling: "I am discipling",
  walking_with: "Walking with",
  peer: "Peer encouragement",
  none: "No direction recorded",
};

export type DosMinistryCompleteness = "recorded" | "partial" | "none";

export const dosMinistryCompletenessLabels: Record<DosMinistryCompleteness, string> = {
  recorded: "Recorded",
  partial: "Partial",
  none: "No qualifying activity",
};

/* Which way a meeting's time went. `being_mentored` is the legacy stored
   role for "I was the one being discipled". Mutual discipleship and
   leadership / planning are time the missionary gave, so they are invested. */
export type DosMinistryTimeBucket = "invested" | "received";

export const dosMinistryTimeBucketLabels: Record<DosMinistryTimeBucket, string> = {
  invested: "Time I invested",
  received: "Time invested in me",
};

export function dosMinistryTimeBucketForRole(tableRole: string): DosMinistryTimeBucket {
  return tableRole === "being_mentored" ? "received" : "invested";
}

/* ---------- inputs: exactly the fields the report reads ---------- */

export type DosMinistryReportPerson = {
  id: string;
  name: string;
  /* "archived" rows are excluded; anything else is a living record. */
  status: string;
  /* The canonical, structured direction (USA-244). */
  roleInMyLife: string;
  /* The stored display summary ("Mentor · Friend · Exploring"). Read only
     to detect a conflict with the structured role; never used as truth. */
  relationshipType: string | null;
};

export type DosMinistryReportMeeting = {
  id: string;
  /* The meeting's event date (ISO date or timestamp). */
  date: string | null;
  fieldPersonIds: string[];
  meetingStatus: "canceled" | "logged" | "scheduled";
  scheduledEndAt: string | null;
  scheduledStartAt: string | null;
  source: "connection" | "table";
  tableRole: string;
  type: string;
};

export type DosMinistryReportCheckIn = {
  checkInDate: string;
  durationMinutes: number | null;
  id: string;
  personId: string;
};

export type DosMinistryReportSchedule = {
  id: string;
  nextCheckIn: string | null;
  personId: string;
  status: string;
};

/* A My Record relationship (`dos_user_mentor_relationships`, legacy name).
   It is NOT canonical for direction: the Person's structured role is. It is
   read only as a fallback, and a disagreement is stated on the row until
   the reconciliation in the registry (§5) lands. */
export type DosMinistryReportDisciplingMeRelationship = {
  fieldPersonId: string | null;
  id: string;
  mentorName: string;
  status: "active" | "archived";
};

/* A downstream relationship RESOLVED from the downstream person's own
   confirmed, directed Person relationship (`role_in_my_life =
   discipling_them` in their workspace), reached through their DOS identity
   link. Person stays the canonical relationship record; there is no
   separate chain model. The loader does not resolve these yet, so today the
   list is always empty and the report says so honestly. */
export type DosResolvedDownstreamRelationship = {
  discipleDisplayName: string;
  /* The disciple's Person id in the discipler's own workspace. */
  disciplePersonId: string;
  /* The discipler as a Person in the viewer's workspace. */
  disciplerPersonId: string;
  disciplerWorkspaceId: string;
  identityLinkId: string;
  roleInMyLife: "discipling_them";
  source: "person_relationship";
  status: "active" | "ended";
};

export type DosMinistryReportInput = {
  checkIns: DosMinistryReportCheckIn[];
  disciplingMe: DosMinistryReportDisciplingMeRelationship[];
  downstream?: DosResolvedDownstreamRelationship[];
  meetings: DosMinistryReportMeeting[];
  now: Date;
  people: DosMinistryReportPerson[];
  period?: { end: string; start: string };
  range: DosMinistryReportRange;
  schedules: DosMinistryReportSchedule[];
};

/* ---------- outputs ---------- */

export type DosMinistryReportRecord =
  | {
      bucket: DosMinistryTimeBucket;
      date: string;
      id: string;
      kind: "meeting";
      label: string;
      minutes: number | null;
      open: { id: string; kind: "meeting" };
      role: string;
      shared: boolean;
    }
  | {
      bucket: "invested";
      date: string;
      id: string;
      kind: "check_in";
      label: string;
      minutes: number | null;
      open: { id: string; kind: "person" };
    };

export type DosMinistryNextAction = {
  kind: "complete_record" | "log_check_in" | "scheduled" | "schedule" | "ask" | "keep_rhythm";
  label: string;
  reason: string;
};

export type DosMinistryDownstreamStatus = "resolved" | "not_linked" | "not_applicable";

export type DosMinistryReportRow = {
  bucket: DosMinistryTimeBucket;
  checkInCount: number;
  checkInMinutes: number;
  checkInsMissingDuration: number;
  completeness: DosMinistryCompleteness;
  completenessDetail: string;
  completenessLabel: string;
  direction: DosMinistryRelationshipDirection;
  /* A plain sentence when two records disagree about the direction. */
  directionConflict: string | null;
  directionLabel: string;
  directionSource: "person" | "my_record" | "none";
  downstream: Array<{ name: string; personId: string }>;
  downstreamStatus: DosMinistryDownstreamStatus;
  lastActivity: { date: string; kind: "meeting" | "check_in" } | null;
  /* Logged duration in this row's bucket, credited per person. */
  loggedMinutes: number;
  meetingCount: number;
  meetingsMissingDuration: number;
  nextAction: DosMinistryNextAction;
  personId: string;
  personName: string;
  records: DosMinistryReportRecord[];
};

export type DosMinistryReportTotals = {
  checkIns: number;
  investedMeetings: number;
  meetings: number;
  meetingsMissingDuration: number;
  peopleWithActivity: number;
  receivedMeetings: number;
  /* Unique logged duration, each meeting counted once, however many people
     it credited. These are the only figures that may be called "my time". */
  uniqueLoggedMinutesInvested: number;
  uniqueLoggedMinutesReceived: number;
};

export type DosMinistryReport = {
  /* People with meetings where the missionary invested time, or check-ins. */
  investedRows: DosMinistryReportRow[];
  notes: string[];
  period: DosMinistryReportPeriod;
  /* People with meetings where the missionary was the one being discipled. */
  receivedRows: DosMinistryReportRow[];
  /* People who have a recorded direction but no qualifying activity in the
     period. They are listed, never hidden, and never called inactive. */
  relationshipRows: DosMinistryReportRow[];
  totals: DosMinistryReportTotals;
};

/* ---------- dates ---------- */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dosMinistryReportDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);

  next.setDate(next.getDate() + days);

  return next;
}

export function dosMinistryReportPeriod(
  range: DosMinistryReportRange,
  now: Date,
  custom?: { end: string; start: string } | null,
): DosMinistryReportPeriod {
  const end = localDateKey(now);

  if (range === "custom") {
    const customStart = dosMinistryReportDateKey(custom?.start) ?? localDateKey(shiftDays(now, -29));
    const customEnd = dosMinistryReportDateKey(custom?.end) ?? end;

    return customStart <= customEnd
      ? { end: customEnd, range, start: customStart }
      : { end: customStart, range, start: customEnd };
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

  return { end, range, start: localDateKey(shiftDays(now, -(days - 1))) };
}

function inPeriod(dateKey: string | null, period: DosMinistryReportPeriod) {
  return Boolean(dateKey && dateKey >= period.start && dateKey <= period.end);
}

/* "Sep 11" / "Sep 11, 2025": short, and with the year only when it differs
   from the current one. Pure, so the regression can pin it. */
export function formatDosMinistryDate(dateKey: string, now = new Date()) {
  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("en-US", date.getFullYear() === now.getFullYear()
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- duration ---------- */

/* Logged duration only. A logged meeting whose start and end are both
   present contributes the difference; anything else contributes nothing.
   Production start times are a synthetic local noon on every logged meeting
   (USA-246 audit), so this is the duration that was entered, never a
   clock-in / clock-out interval. */
export function dosLoggedMeetingMinutes(meeting: Pick<DosMinistryReportMeeting, "scheduledEndAt" | "scheduledStartAt">) {
  if (!meeting.scheduledStartAt || !meeting.scheduledEndAt) {
    return null;
  }

  const start = new Date(meeting.scheduledStartAt).getTime();
  const end = new Date(meeting.scheduledEndAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60_000);
}

export function formatDosMinistryMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) {
    return "Not logged";
  }

  if (minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

/* ---------- direction ---------- */

const displayStringDirectionWords: Array<[RegExp, DosMinistryRelationshipDirection]> = [
  [/\bmentor\b|discipling me/i, "discipling_me"],
  [/\bdiscipling\b/i, "i_am_discipling"],
  [/walking with/i, "walking_with"],
];

function directionFromRole(roleInMyLife: string): DosMinistryRelationshipDirection {
  switch (roleInMyLife) {
    case "discipling_them":
      return "i_am_discipling";
    case "mentoring_me":
      return "discipling_me";
    case "walking_with_them":
      return "walking_with";
    case "peer_encouragement":
      return "peer";
    default:
      return "none";
  }
}

/* The Person's structured role is canonical. A My Record relationship is a
   fallback only, and any disagreement is stated on the row so it can be
   reconciled on the Person record (registry §5). */
export function dosMinistryDirectionForPerson(
  person: DosMinistryReportPerson,
  disciplingMe: DosMinistryReportDisciplingMeRelationship[],
): Pick<DosMinistryReportRow, "direction" | "directionConflict" | "directionLabel" | "directionSource"> {
  const roleDirection = directionFromRole(person.roleInMyLife);
  const myRecord = disciplingMe.find((relationship) => relationship.status === "active" && relationship.fieldPersonId === person.id) ?? null;

  if (roleDirection !== "none") {
    return {
      direction: roleDirection,
      directionConflict: myRecord && roleDirection !== "discipling_me"
        ? `The Person record says "${dosMinistryRelationshipDirectionLabels[roleDirection]}" and is canonical; My Record also lists ${person.name} as discipling you. Reconcile on the Person record.`
        : null,
      directionLabel: dosMinistryRelationshipDirectionLabels[roleDirection],
      directionSource: "person",
    };
  }

  if (myRecord) {
    return {
      direction: "discipling_me",
      directionConflict: `The Person record has no direction recorded; My Record says ${person.name} is discipling you. The Person record is canonical: confirm "They are discipling me" there.`,
      directionLabel: dosMinistryRelationshipDirectionLabels.discipling_me,
      directionSource: "my_record",
    };
  }

  /* When only the legacy display summary carries a direction, the row says
     so instead of borrowing it. */
  const summary = person.relationshipType?.trim() ?? "";
  const legacy = displayStringDirectionWords.find(([pattern]) => pattern.test(summary))?.[1] ?? null;

  return {
    direction: "none",
    directionConflict: legacy
      ? `The Person record's summary reads "${summary}", but its structured role is Not active. Confirm the direction on the Person record.`
      : null,
    directionLabel: dosMinistryRelationshipDirectionLabels.none,
    directionSource: "none",
  };
}

/* ---------- next action (provisional until USA-252 is approved) ---------- */

function daysBetween(earlier: string, later: string) {
  return Math.round((new Date(`${later}T12:00:00`).getTime() - new Date(`${earlier}T12:00:00`).getTime()) / 86_400_000);
}

function nextActionFor({
  direction,
  lastMeetingDate,
  meetingsMissingDuration,
  overdueCheckIn,
  period,
  personName,
  upcomingMeetingDate,
}: {
  direction: DosMinistryRelationshipDirection;
  lastMeetingDate: string | null;
  meetingsMissingDuration: number;
  overdueCheckIn: boolean;
  period: DosMinistryReportPeriod;
  personName: string;
  upcomingMeetingDate: string | null;
}): DosMinistryNextAction {
  if (meetingsMissingDuration > 0) {
    return {
      kind: "complete_record",
      label: "Add the missing meeting duration",
      reason: `${meetingsMissingDuration === 1 ? "One meeting" : `${meetingsMissingDuration} meetings`} with ${personName} ${meetingsMissingDuration === 1 ? "has" : "have"} no logged duration.`,
    };
  }

  if (overdueCheckIn) {
    return { kind: "log_check_in", label: "Log the overdue check-in", reason: "An accountability check-in is past its date." };
  }

  if (upcomingMeetingDate) {
    return { kind: "scheduled", label: `Next meeting ${formatDosMinistryDate(upcomingMeetingDate)}`, reason: "A meeting is already on the calendar." };
  }

  const quiet = !lastMeetingDate || daysBetween(lastMeetingDate, period.end) > 14;

  if (direction === "i_am_discipling" && quiet) {
    return { kind: "schedule", label: "Schedule the next meeting", reason: lastMeetingDate ? `Last logged meeting ${formatDosMinistryDate(lastMeetingDate)}.` : "No meeting logged in this range." };
  }

  if (direction === "discipling_me" && quiet) {
    return { kind: "ask", label: "Ask for the next meeting", reason: lastMeetingDate ? `Last logged meeting ${formatDosMinistryDate(lastMeetingDate)}.` : "No meeting logged in this range." };
  }

  return { kind: "keep_rhythm", label: "Nothing due", reason: "Keep the rhythm." };
}

/* ---------- the report ---------- */

function meetingRoleLabel(role: string) {
  switch (role) {
    case "being_mentored":
      return "Being discipled";
    case "mutual_discipleship":
      return "Mutual discipleship";
    case "leadership_planning":
      return "Leadership / planning";
    default:
      return "Ministering";
  }
}

function meetingTypeLabel(type: string) {
  switch (type) {
    case "kitchen_table":
      return "Kitchen table";
    case "phone":
      return "Phone";
    case "zoom":
      return "Video";
    case "text":
      return "Text";
    case "coffee":
      return "Coffee";
    case "discipleship":
      return "Discipleship";
    case "prayer":
      return "Prayer";
    case "group":
      return "Group";
    default:
      return "Meeting";
  }
}

export function buildDosMinistryReport(input: DosMinistryReportInput): DosMinistryReport {
  const period = dosMinistryReportPeriod(input.range, input.now, input.period);
  const today = localDateKey(input.now);
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const notes: string[] = [];

  const qualifyingMeetings = input.meetings.filter((meeting) => meeting.meetingStatus === "logged" && meeting.source === "table" && inPeriod(dosMinistryReportDateKey(meeting.date), period));
  const connectionLogs = input.meetings.filter((meeting) => meeting.meetingStatus === "logged" && meeting.source === "connection" && inPeriod(dosMinistryReportDateKey(meeting.date), period));
  const qualifyingCheckIns = input.checkIns.filter((checkIn) => inPeriod(dosMinistryReportDateKey(checkIn.checkInDate), period));
  const upcomingMeetings = input.meetings.filter((meeting) => meeting.meetingStatus === "scheduled" && (dosMinistryReportDateKey(meeting.date) ?? "") >= today);
  const resolvedDownstream = (input.downstream ?? []).filter((link) => link.status === "active" && link.source === "person_relationship" && link.roleInMyLife === "discipling_them");

  if (connectionLogs.length) {
    notes.push(`${connectionLogs.length} connection ${connectionLogs.length === 1 ? "log is" : "logs are"} in this range and ${connectionLogs.length === 1 ? "is" : "are"} not counted as meetings.`);
  }

  const meetingsByPerson = new Map<string, DosMinistryReportMeeting[]>();
  let unlinkedMeetings = 0;

  qualifyingMeetings.forEach((meeting) => {
    const personIds = Array.from(new Set(meeting.fieldPersonIds));
    let credited = false;

    personIds.forEach((personId) => {
      const person = peopleById.get(personId);

      if (!person || person.status === "archived") {
        return;
      }

      credited = true;
      meetingsByPerson.set(personId, [...(meetingsByPerson.get(personId) ?? []), meeting]);
    });

    if (!credited) {
      unlinkedMeetings += 1;
    }
  });

  if (unlinkedMeetings) {
    notes.push(`${unlinkedMeetings} logged ${unlinkedMeetings === 1 ? "meeting has" : "meetings have"} no linked active person and ${unlinkedMeetings === 1 ? "appears" : "appear"} only in the totals.`);
  }

  const checkInsByPerson = new Map<string, DosMinistryReportCheckIn[]>();

  qualifyingCheckIns.forEach((checkIn) => {
    const person = peopleById.get(checkIn.personId);

    if (!person || person.status === "archived") {
      return;
    }

    checkInsByPerson.set(checkIn.personId, [...(checkInsByPerson.get(checkIn.personId) ?? []), checkIn]);
  });

  const buildRow = (person: DosMinistryReportPerson, bucket: DosMinistryTimeBucket): DosMinistryReportRow => {
    const meetings = [...(meetingsByPerson.get(person.id) ?? [])]
      .filter((meeting) => dosMinistryTimeBucketForRole(meeting.tableRole) === bucket)
      .sort((first, second) => (dosMinistryReportDateKey(second.date) ?? "").localeCompare(dosMinistryReportDateKey(first.date) ?? ""));
    /* Check-ins are something the missionary does for the person, so they
       belong with invested activity and never with time received. */
    const checkIns = bucket === "invested"
      ? [...(checkInsByPerson.get(person.id) ?? [])].sort((first, second) => second.checkInDate.localeCompare(first.checkInDate))
      : [];
    const meetingRecords: DosMinistryReportRecord[] = meetings.map((meeting) => {
      const minutes = dosLoggedMeetingMinutes(meeting);
      const others = meeting.fieldPersonIds.filter((id) => id !== person.id).length;

      return {
        bucket,
        date: dosMinistryReportDateKey(meeting.date) ?? period.end,
        id: meeting.id,
        kind: "meeting",
        label: `${meetingTypeLabel(meeting.type)} · ${meetingRoleLabel(meeting.tableRole)}${others ? ` · with ${others} other${others === 1 ? "" : "s"}` : ""}`,
        minutes,
        open: { id: meeting.id, kind: "meeting" },
        role: meeting.tableRole,
        shared: others > 0,
      };
    });
    const checkInRecords: DosMinistryReportRecord[] = checkIns.map((checkIn) => ({
      bucket: "invested",
      date: dosMinistryReportDateKey(checkIn.checkInDate) ?? period.end,
      id: checkIn.id,
      kind: "check_in",
      label: "Accountability check-in",
      minutes: checkIn.durationMinutes && checkIn.durationMinutes > 0 ? checkIn.durationMinutes : null,
      open: { id: person.id, kind: "person" },
    }));
    const loggedMinutes = meetingRecords.reduce((sum, record) => sum + (record.minutes ?? 0), 0);
    const meetingsMissingDuration = meetingRecords.filter((record) => record.minutes === null).length;
    const checkInsMissingDuration = checkInRecords.filter((record) => record.minutes === null).length;
    const checkInMinutes = checkInRecords.reduce((sum, record) => sum + (record.minutes ?? 0), 0);
    const lastMeeting = meetingRecords[0] ?? null;
    const lastCheckIn = checkInRecords[0] ?? null;
    const lastActivity = !lastMeeting && !lastCheckIn
      ? null
      : !lastCheckIn || (lastMeeting && lastMeeting.date >= lastCheckIn.date)
        ? { date: lastMeeting!.date, kind: "meeting" as const }
        : { date: lastCheckIn.date, kind: "check_in" as const };
    const hasActivity = meetingRecords.length > 0 || checkInRecords.length > 0;
    const completeness: DosMinistryCompleteness = !hasActivity
      ? "none"
      : meetingsMissingDuration > 0 || checkInsMissingDuration > 0
        ? "partial"
        : "recorded";
    const completenessDetail = completeness === "none"
      ? "No meeting or check-in logged in this range. That is what DOS has, not proof that nothing happened."
      : completeness === "partial"
        ? [
          meetingsMissingDuration ? `${meetingsMissingDuration} meeting${meetingsMissingDuration === 1 ? "" : "s"} without a logged duration` : null,
          checkInsMissingDuration ? `${checkInsMissingDuration} check-in${checkInsMissingDuration === 1 ? "" : "s"} without a duration` : null,
        ].filter(Boolean).join(" · ")
        : "Every contributing record has a date and a logged duration.";
    const direction = dosMinistryDirectionForPerson(person, input.disciplingMe);
    const overdueCheckIn = bucket === "invested" && input.schedules.some((schedule) => schedule.personId === person.id && schedule.status === "active" && Boolean(schedule.nextCheckIn) && (dosMinistryReportDateKey(schedule.nextCheckIn) ?? "") < today);
    const upcoming = upcomingMeetings
      .filter((meeting) => meeting.fieldPersonIds.includes(person.id) && dosMinistryTimeBucketForRole(meeting.tableRole) === bucket)
      .map((meeting) => dosMinistryReportDateKey(meeting.date) ?? "")
      .sort()[0] ?? null;
    const downstream = resolvedDownstream
      .filter((link) => link.disciplerPersonId === person.id)
      .map((link) => ({ name: link.discipleDisplayName, personId: link.disciplePersonId }));
    const downstreamStatus: DosMinistryDownstreamStatus = direction.direction !== "i_am_discipling"
      ? "not_applicable"
      : downstream.length
        ? "resolved"
        : "not_linked";

    return {
      bucket,
      checkInCount: checkInRecords.length,
      checkInMinutes,
      checkInsMissingDuration,
      completeness,
      completenessDetail,
      completenessLabel: dosMinistryCompletenessLabels[completeness],
      ...direction,
      downstream,
      downstreamStatus,
      lastActivity,
      loggedMinutes,
      meetingCount: meetingRecords.length,
      meetingsMissingDuration,
      nextAction: nextActionFor({
        direction: direction.direction,
        lastMeetingDate: lastMeeting?.date ?? null,
        meetingsMissingDuration,
        overdueCheckIn,
        period,
        personName: person.name,
        upcomingMeetingDate: upcoming,
      }),
      personId: person.id,
      personName: person.name,
      records: [...meetingRecords, ...checkInRecords].sort((first, second) => second.date.localeCompare(first.date)),
    };
  };

  const byLoggedMinutes = (first: DosMinistryReportRow, second: DosMinistryReportRow) =>
    second.loggedMinutes - first.loggedMinutes || second.meetingCount - first.meetingCount || first.personName.localeCompare(second.personName);
  const activePeople = input.people.filter((person) => person.status !== "archived");
  const investedRows = activePeople
    .map((person) => buildRow(person, "invested"))
    .filter((row) => row.meetingCount > 0 || row.checkInCount > 0)
    .sort(byLoggedMinutes);
  const receivedRows = activePeople
    .map((person) => buildRow(person, "received"))
    .filter((row) => row.meetingCount > 0)
    .sort(byLoggedMinutes);
  const activeIds = new Set([...investedRows, ...receivedRows].map((row) => row.personId));
  const relationshipRows = activePeople
    .filter((person) => !activeIds.has(person.id))
    .map((person) => buildRow(person, "invested"))
    .filter((row) => row.direction !== "none")
    .sort((first, second) => first.personName.localeCompare(second.personName));

  const investedMeetings = qualifyingMeetings.filter((meeting) => dosMinistryTimeBucketForRole(meeting.tableRole) === "invested");
  const receivedMeetings = qualifyingMeetings.filter((meeting) => dosMinistryTimeBucketForRole(meeting.tableRole) === "received");
  const totals: DosMinistryReportTotals = {
    checkIns: qualifyingCheckIns.length,
    investedMeetings: investedMeetings.length,
    meetings: qualifyingMeetings.length,
    meetingsMissingDuration: qualifyingMeetings.filter((meeting) => dosLoggedMeetingMinutes(meeting) === null).length,
    peopleWithActivity: activeIds.size,
    receivedMeetings: receivedMeetings.length,
    uniqueLoggedMinutesInvested: investedMeetings.reduce((sum, meeting) => sum + (dosLoggedMeetingMinutes(meeting) ?? 0), 0),
    uniqueLoggedMinutesReceived: receivedMeetings.reduce((sum, meeting) => sum + (dosLoggedMeetingMinutes(meeting) ?? 0), 0),
  };

  if (totals.meetingsMissingDuration) {
    notes.push(`${totals.meetingsMissingDuration} of ${totals.meetings} meetings in this range ${totals.meetingsMissingDuration === 1 ? "has" : "have"} no logged duration and ${totals.meetingsMissingDuration === 1 ? "adds" : "add"} nothing to the totals.`);
  }

  return { investedRows, notes, period, receivedRows, relationshipRows, totals };
}

/* ---------- what flows upward (USA-253 / USA-259) ---------- */

/* Fields a confirmed discipleship relationship carries upward by design.
   Everything else stays where it is. This list is the contract the
   regression script checks against `buildDosSafeMinistrySummary`. */
export const dosSafeMinistrySummaryFields = [
  "period",
  "peopleWithRecordedActivity",
  "meetings",
  "loggedMinutesInvested",
  "loggedMinutesReceived",
  "meetingsMissingDuration",
  "checkIns",
  "lastRecordedActivity",
  "relationships",
  "downstreamRelationships",
  "completeness",
] as const;

/* Named so the exclusion is explicit and testable, not implied. */
export const dosSafeMinistrySummaryExcluded = [
  "notes",
  "privateNotes",
  "prayerNeeds",
  "prayerWording",
  "myRecordNarrative",
  "journalEntries",
  "participantResponses",
  "conversationResponses",
  "reflections",
  "testimony",
  "story",
  "records",
  "personNames",
] as const;

export type DosSafeMinistrySummary = {
  checkIns: number;
  completeness: DosMinistryCompleteness;
  downstreamRelationships: number;
  lastRecordedActivity: string | null;
  loggedMinutesInvested: number;
  loggedMinutesReceived: number;
  meetings: number;
  meetingsMissingDuration: number;
  peopleWithRecordedActivity: number;
  period: DosMinistryReportPeriod;
  relationships: Array<{ count: number; direction: DosMinistryRelationshipDirection; label: string }>;
};

export function buildDosSafeMinistrySummary(report: DosMinistryReport): DosSafeMinistrySummary {
  const everyRow = [...report.investedRows, ...report.receivedRows, ...report.relationshipRows];
  const relationshipCounts = new Map<DosMinistryRelationshipDirection, number>();
  const counted = new Set<string>();

  everyRow.forEach((row) => {
    if (row.direction !== "none" && !counted.has(row.personId)) {
      counted.add(row.personId);
      relationshipCounts.set(row.direction, (relationshipCounts.get(row.direction) ?? 0) + 1);
    }
  });

  const lastRecordedActivity = [...report.investedRows, ...report.receivedRows]
    .map((row) => row.lastActivity?.date ?? null)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? null;
  const downstreamCounted = new Set<string>();

  return {
    checkIns: report.totals.checkIns,
    completeness: report.totals.meetings === 0 && report.totals.checkIns === 0
      ? "none"
      : report.totals.meetingsMissingDuration > 0
        ? "partial"
        : "recorded",
    downstreamRelationships: everyRow.reduce((sum, row) => {
      if (downstreamCounted.has(row.personId)) {
        return sum;
      }

      downstreamCounted.add(row.personId);

      return sum + row.downstream.length;
    }, 0),
    lastRecordedActivity,
    loggedMinutesInvested: report.totals.uniqueLoggedMinutesInvested,
    loggedMinutesReceived: report.totals.uniqueLoggedMinutesReceived,
    meetings: report.totals.meetings,
    meetingsMissingDuration: report.totals.meetingsMissingDuration,
    peopleWithRecordedActivity: report.totals.peopleWithActivity,
    period: report.period,
    relationships: Array.from(relationshipCounts.entries()).map(([direction, count]) => ({
      count,
      direction,
      label: dosMinistryRelationshipDirectionLabels[direction],
    })),
  };
}

/* The people who receive this workspace's safe summary: everyone the Person
   record marks as discipling the viewer (canonical), plus, until the
   reconciliation lands, an active My Record relationship. Ending the
   relationship ends future upward visibility; nothing else is required. */
export function dosUpstreamViewers(
  people: DosMinistryReportPerson[],
  disciplingMe: DosMinistryReportDisciplingMeRelationship[],
) {
  const viewers = new Map<string, { name: string; personId: string | null; source: "person" | "my_record" }>();

  people
    .filter((person) => person.status !== "archived" && person.roleInMyLife === "mentoring_me")
    .forEach((person) => viewers.set(person.id, { name: person.name, personId: person.id, source: "person" }));

  disciplingMe
    .filter((relationship) => relationship.status === "active")
    .forEach((relationship) => {
      const key = relationship.fieldPersonId ?? `my-record-${relationship.id}`;

      if (!viewers.has(key)) {
        viewers.set(key, { name: relationship.mentorName, personId: relationship.fieldPersonId, source: "my_record" });
      }
    });

  return Array.from(viewers.values());
}

/* ---------- adapter from the loaded workspace data ---------- */

import type { DosAppAccountabilityCheckIn, DosAppAccountabilitySchedule, DosAppMeeting, DosAppPerson, DosAppUserMentorRelationship } from "./missionary-app";

/* Narrows the loaded workspace objects to the fields above. The narrowing
   is the privacy boundary for the report: whatever else a person, meeting,
   or check-in carries never reaches the calculation. Downstream
   relationships are not part of the loaded workspace; when the loader can
   resolve them from Person relationships and identity links, they are
   passed here explicitly. */
export function dosMinistryReportInputFromAppData({
  accountabilityCheckIns,
  accountabilitySchedules,
  disciplingMe,
  downstream,
  meetings,
  people,
}: {
  accountabilityCheckIns: DosAppAccountabilityCheckIn[];
  accountabilitySchedules: DosAppAccountabilitySchedule[];
  disciplingMe: DosAppUserMentorRelationship[];
  downstream?: DosResolvedDownstreamRelationship[];
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
}): Omit<DosMinistryReportInput, "now" | "period" | "range"> {
  return {
    checkIns: accountabilityCheckIns.map((checkIn) => ({
      checkInDate: checkIn.checkInDate,
      durationMinutes: checkIn.durationMinutes,
      id: checkIn.id,
      personId: checkIn.personId,
    })),
    disciplingMe: disciplingMe.map((relationship) => ({
      fieldPersonId: relationship.fieldPersonId,
      id: relationship.id,
      mentorName: relationship.mentorName,
      status: relationship.status,
    })),
    downstream: downstream ?? [],
    meetings: meetings.map((meeting) => ({
      date: meeting.date,
      fieldPersonIds: meeting.fieldPersonIds,
      id: meeting.id,
      meetingStatus: meeting.meetingStatus,
      scheduledEndAt: meeting.scheduledEndAt,
      scheduledStartAt: meeting.scheduledStartAt,
      source: meeting.source,
      tableRole: meeting.tableRole,
      type: meeting.type,
    })),
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
      relationshipType: person.relationshipType,
      roleInMyLife: person.roleInMyLife,
      status: person.status,
    })),
    schedules: accountabilitySchedules.map((schedule) => ({
      id: schedule.id,
      nextCheckIn: schedule.nextCheckIn,
      personId: schedule.personId,
      status: schedule.status,
    })),
  };
}
