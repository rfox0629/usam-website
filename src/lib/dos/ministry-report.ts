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
 *     never ranked together, and a meeting whose direction cannot be
 *     resolved is reported as DIRECTION UNRESOLVED rather than defaulted
 *     (classification rules beside `dosMinistryClassifyMeeting`)
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
 *   - Journey progress is read only as completed sessions (canonical
 *     progress rows), never through an assignment status (USA-258)
 *
 * Founder revision of 2026-09-10: one primary table with one row per person
 * (`rows`), "Direction unresolved" renamed "Relationship not set", multiplication
 * as a column with honest states, and a compact Ministry Fruit table
 * (`fruitRows`) from structured sources only.
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
  none: "Not set",
};

export type DosMinistryCompleteness = "recorded" | "partial" | "none" | "unresolved";

export const dosMinistryCompletenessLabels: Record<DosMinistryCompleteness, string> = {
  recorded: "Recorded",
  partial: "Partial",
  none: "No qualifying activity",
  unresolved: "Relationship not set",
};

/* Which way a meeting's time went. `being_mentored` is the legacy stored
   role for "I was the one being discipled". Mutual discipleship and
   leadership / planning are time the missionary gave, so they are invested.
   "unresolved" is an honest state, never a default. */
export type DosMinistryTimeBucket = "invested" | "received" | "unresolved";

export const dosMinistryTimeBucketLabels: Record<DosMinistryTimeBucket, string> = {
  invested: "Time I invested",
  received: "Time invested in me",
  unresolved: "Relationship not set",
};

export function dosMinistryTimeBucketForRole(tableRole: string): Exclude<DosMinistryTimeBucket, "unresolved"> {
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
  /* True only when the role was stored on the meeting. Production has no
     `table_role` column yet, so the loader's "ministering" is a default
     there, and a default never classifies anything. */
  tableRoleRecorded: boolean;
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

/* ---------- fruit: structured evidence only (2026-09-10) ----------
 *
 * The Ministry Fruit table reads recorded fruit, submitted reviews and
 * testimonies, and completed Journey sessions. Each entry carries only what
 * a person explicitly chose or what a system recorded as a fact: a fruit
 * type, outcome tags, a rating, a completed session. Narrative never enters
 * (descriptions, stories, comments, what changed, next steps, reflections,
 * prayer focus, action steps), so it cannot be shown. Kitchen Table Gospel
 * responses are not a source: USA-243 settled that KTG keeps no outcome
 * capture of its own, and the answers are private. */

export type DosMinistryFruitSource = "fruit_event" | "fruit_story" | "review" | "testimony" | "journey_progress";

export const dosMinistryFruitSourceLabels: Record<DosMinistryFruitSource, string> = {
  fruit_event: "Fruit",
  fruit_story: "Fruit story",
  review: "Review",
  testimony: "Testimony",
  journey_progress: "Journey progress",
};

export type DosMinistryFruitEntry = {
  confidence: "observed" | "confirmed" | "verified" | null;
  date: string | null;
  id: string;
  /* The structured heading: a fruit type, a rating, or a completed session. */
  label: string;
  /* A stored link to the meeting it came from, or null. Never inferred. */
  meetingId: string | null;
  personId: string | null;
  resourceTitle: string | null;
  source: DosMinistryFruitSource;
  status: string;
  /* Explicitly selected outcome tags. */
  tags: string[];
};

export type DosMinistryReportInput = {
  checkIns: DosMinistryReportCheckIn[];
  disciplingMe: DosMinistryReportDisciplingMeRelationship[];
  downstream?: DosResolvedDownstreamRelationship[];
  /* People whose own workspace was actually read for downstream
     relationships. Only then can "Not recorded" be said honestly. The
     resolver is not built yet, so this is empty in production. */
  downstreamReadPersonIds?: string[];
  fruit?: DosMinistryFruitEntry[];
  /* People in this workspace with a verified DOS identity link. Without one
     a person's own records cannot be reached, so multiplication reads
     "Not connected". */
  linkedPersonIds?: string[];
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
      /* Which rule classified the meeting (see dosMinistryClassifyMeeting). */
      bucketReason: string;
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
  kind: "confirm_direction" | "complete_record" | "log_check_in" | "scheduled" | "schedule" | "ask" | "keep_rhythm";
  label: string;
  reason: string;
};

/* resolved: the person's own Person records were read and name people they
   are discipling. not_recorded: read, and none. not_resolved: a DOS identity
   is linked but the reader is not built yet. not_connected: no verified DOS
   identity, so nothing can be read. not_applicable: not someone the
   missionary is discipling. Never a zero, never a "No". */
export type DosMinistryDownstreamStatus = "resolved" | "not_recorded" | "not_resolved" | "not_connected" | "not_applicable";

export function dosMinistryMultiplicationLabel(row: Pick<DosMinistryReportRow, "downstream" | "downstreamStatus">) {
  switch (row.downstreamStatus) {
    case "resolved":
      return `${row.downstream.length} ${row.downstream.length === 1 ? "person" : "people"}`;
    case "not_recorded":
      return "Not recorded";
    case "not_resolved":
      return "Not resolved yet";
    case "not_connected":
      return "Not connected";
    default:
      return "—";
  }
}

export type DosMinistryDirectionStatus = "confirmed" | "unconfirmed" | "conflicting" | "none";

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
  /* confirmed: the Person's structured role. unconfirmed: only My Record
     says so. conflicting: My Record disagrees with the Person. none. Only
     "confirmed" may classify a legacy meeting. */
  directionStatus: DosMinistryDirectionStatus;
  downstream: Array<{ name: string; personId: string }>;
  downstreamStatus: DosMinistryDownstreamStatus;
  /* Fruit entries in the range that name this person. */
  fruitCount: number;
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

/* One row per person for the primary table (2026-09-10): every placed and
   not-set meeting with the person, so a person appears once. The per-bucket
   figures stay on the row and in the totals, so time invested in the
   missionary is never presented as time they invested. */
export type DosMinistryPersonRow = Omit<DosMinistryReportRow, "bucket" | "nextAction"> & {
  meetingsByBucket: Record<DosMinistryTimeBucket, number>;
  minutesByBucket: Record<DosMinistryTimeBucket, number>;
  /* "I am discipling" … or "Not set". */
  relationshipLabel: string;
  /* A short qualifier when the relationship is not confirmed on the Person. */
  relationshipNote: string | null;
};

export type DosMinistryReportFilter = "all" | "i_am_discipling" | "discipling_me" | "not_set";

export const dosMinistryReportFilterOptions: ReadonlyArray<{ label: string; value: DosMinistryReportFilter }> = [
  { label: "All", value: "all" },
  { label: "I'm discipling", value: "i_am_discipling" },
  { label: "Discipling me", value: "discipling_me" },
  { label: "Relationship not set", value: "not_set" },
];

export function dosMinistryRowMatchesFilter(row: Pick<DosMinistryPersonRow, "direction" | "directionStatus">, filter: DosMinistryReportFilter) {
  switch (filter) {
    case "i_am_discipling":
      return row.direction === "i_am_discipling";
    case "discipling_me":
      return row.direction === "discipling_me";
    case "not_set":
      return row.directionStatus !== "confirmed";
    default:
      return true;
  }
}

export type DosMinistryFruitRow = {
  date: string;
  id: string;
  open: { id: string; kind: "meeting" } | null;
  personId: string | null;
  personName: string;
  /* record: the entry names the person. meeting: the only person linked to
     the entry's meeting. none: not linked to anyone. */
  personSource: "record" | "meeting" | "none";
  relatedLabel: string;
  source: DosMinistryFruitSource;
  sourceLabel: string;
  statusLabel: string;
  statusTone: "green" | "blue" | "grey";
  text: string;
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
  uniqueLoggedMinutesUnresolved: number;
  unresolvedMeetings: number;
};

export type DosMinistryReport = {
  /* Structured fruit, reviews, testimonies, and Journey completions in range. */
  fruitRows: DosMinistryFruitRow[];
  /* People with meetings where the missionary invested time, or check-ins. */
  investedRows: DosMinistryReportRow[];
  notes: string[];
  period: DosMinistryReportPeriod;
  /* People with meetings where the missionary was the one being discipled. */
  receivedRows: DosMinistryReportRow[];
  /* People who have a recorded direction but no qualifying activity in the
     period. They are listed, never hidden, and never called inactive. */
  relationshipRows: DosMinistryReportRow[];
  /* The primary table: one row per person with activity in the range or a
     recorded relationship. */
  rows: DosMinistryPersonRow[];
  totals: DosMinistryReportTotals;
  /* People with meetings DOS cannot place in either direction. */
  unresolvedRows: DosMinistryReportRow[];
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
): Pick<DosMinistryReportRow, "direction" | "directionConflict" | "directionLabel" | "directionSource" | "directionStatus"> {
  const roleDirection = directionFromRole(person.roleInMyLife);
  const myRecord = disciplingMe.find((relationship) => relationship.status === "active" && relationship.fieldPersonId === person.id) ?? null;

  if (roleDirection !== "none") {
    const conflicting = Boolean(myRecord) && roleDirection !== "discipling_me";

    return {
      direction: roleDirection,
      directionConflict: conflicting
        ? `The Person record says "${dosMinistryRelationshipDirectionLabels[roleDirection]}" and is canonical; My Record also lists ${person.name} as discipling you. Reconcile on the Person record.`
        : null,
      directionLabel: dosMinistryRelationshipDirectionLabels[roleDirection],
      directionSource: "person",
      directionStatus: conflicting ? "conflicting" : "confirmed",
    };
  }

  if (myRecord) {
    return {
      direction: "discipling_me",
      directionConflict: `The Person record has no relationship set; My Record says ${person.name} is discipling you. The Person record is canonical: confirm "They are discipling me" there.`,
      directionLabel: dosMinistryRelationshipDirectionLabels.discipling_me,
      directionSource: "my_record",
      directionStatus: "unconfirmed",
    };
  }

  /* When only the legacy display summary carries a direction, the row says
     so instead of borrowing it. */
  const summary = person.relationshipType?.trim() ?? "";
  const legacy = displayStringDirectionWords.find(([pattern]) => pattern.test(summary))?.[1] ?? null;

  return {
    direction: "none",
    directionConflict: legacy
      ? `The Person record's summary reads "${summary}", but its structured relationship is Not active. Set the relationship on the Person record.`
      : null,
    directionLabel: dosMinistryRelationshipDirectionLabels.none,
    directionSource: "none",
    directionStatus: "none",
  };
}

/* ---------- classification (founder rules, 2026-09-09) ----------
 *
 * Which list a meeting belongs to, for each person it links. Nothing here
 * reads notes, and nothing is defaulted:
 *
 *   1. A role RECORDED on the meeting decides: being_mentored -> Time
 *      invested in me; ministering, mutual discipleship, leadership /
 *      planning -> Time I invested. The missionary chose it when logging.
 *   2. Otherwise (legacy meeting, no stored role) the CONFIRMED structured
 *      Person direction of every linked person decides: "They are discipling
 *      me" -> invested in me; "I am discipling them", "I am walking with
 *      them", peer encouragement -> Time I invested.
 *   3. A direction that is missing, only in My Record (unconfirmed), or
 *      conflicting cannot classify; a meeting that mixes people in both
 *      directions cannot be split. Every such meeting is Direction
 *      unresolved for every person it links, and the row says why.
 */

export type DosMinistryClassification = {
  bucket: DosMinistryTimeBucket;
  reason: string;
};

function bucketFromConfirmedDirection(status: Pick<DosMinistryReportRow, "direction" | "directionStatus">) {
  if (status.directionStatus !== "confirmed") {
    return null;
  }

  switch (status.direction) {
    case "discipling_me":
      return "received" as const;
    case "i_am_discipling":
    case "walking_with":
    case "peer":
      return "invested" as const;
    default:
      return null;
  }
}

export function dosMinistryClassifyMeeting(
  meeting: Pick<DosMinistryReportMeeting, "fieldPersonIds" | "tableRole" | "tableRoleRecorded">,
  directionByPersonId: Map<string, Pick<DosMinistryReportRow, "direction" | "directionStatus" | "personName">>,
): DosMinistryClassification {
  if (meeting.tableRoleRecorded) {
    const bucket = dosMinistryTimeBucketForRole(meeting.tableRole);

    return { bucket, reason: bucket === "received" ? "Role recorded on the meeting: being discipled" : "Role recorded on the meeting" };
  }

  const linked = Array.from(new Set(meeting.fieldPersonIds))
    .map((personId) => directionByPersonId.get(personId) ?? null)
    .filter((status): status is Pick<DosMinistryReportRow, "direction" | "directionStatus" | "personName"> => Boolean(status));

  if (!linked.length) {
    return { bucket: "unresolved", reason: "No active linked person to read a relationship from" };
  }

  const unresolvedPeople = linked.filter((status) => bucketFromConfirmedDirection(status) === null);

  if (unresolvedPeople.length) {
    const named = unresolvedPeople.map((status) => `${status.personName} (${status.directionStatus === "conflicting" ? "conflicting" : status.directionStatus === "unconfirmed" ? "only My Record says so" : "relationship not set"})`).join(", ");

    return { bucket: "unresolved", reason: `No recorded meeting role, and the Person relationship cannot classify it: ${named}` };
  }

  const buckets = new Set(linked.map((status) => bucketFromConfirmedDirection(status)));

  if (buckets.size > 1) {
    return { bucket: "unresolved", reason: "No recorded meeting role, and the people present are in both directions" };
  }

  const bucket = buckets.values().next().value as "invested" | "received";

  return { bucket, reason: linked.length === 1 ? "Confirmed Person direction" : "Confirmed Person direction of everyone present" };
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
  const linkedPersonIds = new Set(input.linkedPersonIds ?? []);
  const downstreamReadPersonIds = new Set(input.downstreamReadPersonIds ?? []);
  const fruitRows = buildFruitRows(input, period, peopleById);
  const fruitCountByPerson = new Map<string, number>();

  fruitRows.forEach((row) => {
    if (row.personId) {
      fruitCountByPerson.set(row.personId, (fruitCountByPerson.get(row.personId) ?? 0) + 1);
    }
  });

  if (connectionLogs.length) {
    notes.push(`${connectionLogs.length} connection ${connectionLogs.length === 1 ? "log is" : "logs are"} in this range and ${connectionLogs.length === 1 ? "is" : "are"} not counted as meetings.`);
  }

  /* Direction per active person, resolved once; the classifier reads it. */
  const activePeople = input.people.filter((person) => person.status !== "archived");
  const directionByPersonId = new Map(activePeople.map((person) => [person.id, { ...dosMinistryDirectionForPerson(person, input.disciplingMe), personName: person.name }]));

  const classificationByMeetingId = new Map<string, DosMinistryClassification>();
  const meetingsByPerson = new Map<string, DosMinistryReportMeeting[]>();
  let unlinkedMeetings = 0;

  qualifyingMeetings.forEach((meeting) => {
    const linkedIds = Array.from(new Set(meeting.fieldPersonIds)).filter((personId) => peopleById.get(personId) && peopleById.get(personId)!.status !== "archived");

    classificationByMeetingId.set(meeting.id, dosMinistryClassifyMeeting(meeting, directionByPersonId));

    if (!linkedIds.length) {
      unlinkedMeetings += 1;
    }

    linkedIds.forEach((personId) => {
      meetingsByPerson.set(personId, [...(meetingsByPerson.get(personId) ?? []), meeting]);
    });
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

  const bucketOf = (meeting: DosMinistryReportMeeting) => classificationByMeetingId.get(meeting.id)?.bucket ?? "unresolved";

  const buildRow = (person: DosMinistryReportPerson, bucket: DosMinistryTimeBucket): DosMinistryReportRow => {
    const meetings = [...(meetingsByPerson.get(person.id) ?? [])]
      .filter((meeting) => bucketOf(meeting) === bucket)
      .sort((first, second) => (dosMinistryReportDateKey(second.date) ?? "").localeCompare(dosMinistryReportDateKey(first.date) ?? ""));
    /* Check-ins are something the missionary does for the person, so they
       belong with invested activity and never with time received or with
       an unresolved meeting. */
    const checkIns = bucket === "invested"
      ? [...(checkInsByPerson.get(person.id) ?? [])].sort((first, second) => second.checkInDate.localeCompare(first.checkInDate))
      : [];
    const meetingRecords: DosMinistryReportRecord[] = meetings.map((meeting) => {
      const minutes = dosLoggedMeetingMinutes(meeting);
      const others = meeting.fieldPersonIds.filter((id) => id !== person.id).length;
      const classification = classificationByMeetingId.get(meeting.id) ?? { bucket: "unresolved" as const, reason: "Not classified" };

      return {
        bucket: classification.bucket,
        bucketReason: classification.reason,
        date: dosMinistryReportDateKey(meeting.date) ?? period.end,
        id: meeting.id,
        kind: "meeting",
        label: `${meetingTypeLabel(meeting.type)} · ${meeting.tableRoleRecorded ? meetingRoleLabel(meeting.tableRole) : "no recorded role"}${others ? ` · with ${others} other${others === 1 ? "" : "s"}` : ""}`,
        minutes,
        open: { id: meeting.id, kind: "meeting" },
        role: meeting.tableRoleRecorded ? meeting.tableRole : "",
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
    const unresolvedElsewhere = bucket === "unresolved" ? 0 : (meetingsByPerson.get(person.id) ?? []).filter((meeting) => bucketOf(meeting) === "unresolved").length;
    const completeness: DosMinistryCompleteness = bucket === "unresolved"
      ? "unresolved"
      : !hasActivity
        ? "none"
        : meetingsMissingDuration > 0 || checkInsMissingDuration > 0
          ? "partial"
          : "recorded";
    const reasons = Array.from(new Set(meetingRecords.map((record) => record.kind === "meeting" ? record.bucketReason : null).filter(Boolean)));
    const completenessDetail = completeness === "unresolved"
      ? `The relationship is not set, so DOS cannot place ${meetingRecords.length === 1 ? "this meeting" : `these ${meetingRecords.length} meetings`} in either direction and nothing is counted as invested or received. ${reasons.join(" · ")}.`
      : completeness === "none"
        ? "No meeting or check-in logged in this range. That is what DOS has, not proof that nothing happened."
        : [
          completeness === "partial" && meetingsMissingDuration ? `${meetingsMissingDuration} meeting${meetingsMissingDuration === 1 ? "" : "s"} without a logged duration` : null,
          completeness === "partial" && checkInsMissingDuration ? `${checkInsMissingDuration} check-in${checkInsMissingDuration === 1 ? "" : "s"} without a duration` : null,
          completeness === "recorded" ? "Every contributing record has a date and a logged duration." : null,
          unresolvedElsewhere ? `${unresolvedElsewhere} more meeting${unresolvedElsewhere === 1 ? "" : "s"} with this person ${unresolvedElsewhere === 1 ? "is" : "are"} not counted because the relationship is not set.` : null,
        ].filter(Boolean).join(" · ");
    const direction = directionByPersonId.get(person.id) ?? { ...dosMinistryDirectionForPerson(person, input.disciplingMe), personName: person.name };
    const overdueCheckIn = bucket === "invested" && input.schedules.some((schedule) => schedule.personId === person.id && schedule.status === "active" && Boolean(schedule.nextCheckIn) && (dosMinistryReportDateKey(schedule.nextCheckIn) ?? "") < today);
    const upcoming = upcomingMeetings
      .filter((meeting) => meeting.fieldPersonIds.includes(person.id) && dosMinistryClassifyMeeting(meeting, directionByPersonId).bucket === bucket)
      .map((meeting) => dosMinistryReportDateKey(meeting.date) ?? "")
      .sort()[0] ?? null;
    const downstream = resolvedDownstream
      .filter((link) => link.disciplerPersonId === person.id)
      .map((link) => ({ name: link.discipleDisplayName, personId: link.disciplePersonId }));
    const downstreamStatus: DosMinistryDownstreamStatus = direction.direction !== "i_am_discipling"
      ? "not_applicable"
      : downstream.length
        ? "resolved"
        : downstreamReadPersonIds.has(person.id)
          ? "not_recorded"
          : linkedPersonIds.has(person.id)
            ? "not_resolved"
            : "not_connected";
    const nextAction: DosMinistryNextAction = bucket === "unresolved"
      ? { kind: "confirm_direction", label: "Set the relationship on the Person record", reason: "Once the Person record carries a confirmed relationship, these meetings classify themselves." }
      : nextActionFor({
        direction: direction.direction,
        lastMeetingDate: lastMeeting?.date ?? null,
        meetingsMissingDuration,
        overdueCheckIn,
        period,
        personName: person.name,
        upcomingMeetingDate: upcoming,
      });

    return {
      bucket,
      checkInCount: checkInRecords.length,
      checkInMinutes,
      checkInsMissingDuration,
      completeness,
      completenessDetail,
      completenessLabel: dosMinistryCompletenessLabels[completeness],
      direction: direction.direction,
      directionConflict: direction.directionConflict,
      directionLabel: direction.directionLabel,
      directionSource: direction.directionSource,
      directionStatus: direction.directionStatus,
      downstream,
      downstreamStatus,
      fruitCount: fruitCountByPerson.get(person.id) ?? 0,
      lastActivity,
      loggedMinutes,
      meetingCount: meetingRecords.length,
      meetingsMissingDuration,
      nextAction,
      personId: person.id,
      personName: person.name,
      records: [...meetingRecords, ...checkInRecords].sort((first, second) => second.date.localeCompare(first.date)),
    };
  };

  const byLoggedMinutes = (first: DosMinistryReportRow, second: DosMinistryReportRow) =>
    second.loggedMinutes - first.loggedMinutes || second.meetingCount - first.meetingCount || first.personName.localeCompare(second.personName);
  const investedRows = activePeople
    .map((person) => buildRow(person, "invested"))
    .filter((row) => row.meetingCount > 0 || row.checkInCount > 0)
    .sort(byLoggedMinutes);
  const receivedRows = activePeople
    .map((person) => buildRow(person, "received"))
    .filter((row) => row.meetingCount > 0)
    .sort(byLoggedMinutes);
  const unresolvedRows = activePeople
    .map((person) => buildRow(person, "unresolved"))
    .filter((row) => row.meetingCount > 0)
    .sort(byLoggedMinutes);
  const activeIds = new Set([...investedRows, ...receivedRows, ...unresolvedRows].map((row) => row.personId));
  const relationshipRows = activePeople
    .filter((person) => !activeIds.has(person.id))
    .map((person) => buildRow(person, "invested"))
    .filter((row) => row.direction !== "none")
    .sort((first, second) => first.personName.localeCompare(second.personName));

  /* The primary table: one row per person. */
  const rows = activePeople
    .map((person) => mergePersonRows(person, buildRow(person, "invested"), buildRow(person, "received"), buildRow(person, "unresolved")))
    .filter((row) => row.meetingCount > 0 || row.checkInCount > 0 || row.direction !== "none")
    .sort((first, second) => second.loggedMinutes - first.loggedMinutes || second.meetingCount - first.meetingCount || first.personName.localeCompare(second.personName));

  const inBucket = (bucket: DosMinistryTimeBucket) => qualifyingMeetings.filter((meeting) => bucketOf(meeting) === bucket);
  const sumUnique = (meetings: DosMinistryReportMeeting[]) => meetings.reduce((sum, meeting) => sum + (dosLoggedMeetingMinutes(meeting) ?? 0), 0);
  const investedMeetings = inBucket("invested");
  const receivedMeetings = inBucket("received");
  const unresolvedMeetings = inBucket("unresolved");
  const totals: DosMinistryReportTotals = {
    checkIns: qualifyingCheckIns.length,
    investedMeetings: investedMeetings.length,
    meetings: qualifyingMeetings.length,
    meetingsMissingDuration: qualifyingMeetings.filter((meeting) => dosLoggedMeetingMinutes(meeting) === null).length,
    peopleWithActivity: activeIds.size,
    receivedMeetings: receivedMeetings.length,
    uniqueLoggedMinutesInvested: sumUnique(investedMeetings),
    uniqueLoggedMinutesReceived: sumUnique(receivedMeetings),
    uniqueLoggedMinutesUnresolved: sumUnique(unresolvedMeetings),
    unresolvedMeetings: unresolvedMeetings.length,
  };

  if (totals.meetingsMissingDuration) {
    notes.push(`${totals.meetingsMissingDuration} of ${totals.meetings} meetings in this range ${totals.meetingsMissingDuration === 1 ? "has" : "have"} no logged duration and ${totals.meetingsMissingDuration === 1 ? "adds" : "add"} nothing to the totals.`);
  }

  if (totals.unresolvedMeetings) {
    notes.push(`${totals.unresolvedMeetings} of ${totals.meetings} meetings ${totals.unresolvedMeetings === 1 ? "has" : "have"} no relationship to place ${totals.unresolvedMeetings === 1 ? "it" : "them"} by and ${totals.unresolvedMeetings === 1 ? "is" : "are"} counted as neither invested nor received.`);
  }

  const undatedFruit = (input.fruit ?? []).filter((entry) => fruitEntryQualifies(entry) && !dosMinistryReportDateKey(entry.date)).length;

  if (undatedFruit) {
    notes.push(`${undatedFruit} fruit ${undatedFruit === 1 ? "record has" : "records have"} no date and cannot be shown in a range.`);
  }

  return { fruitRows, investedRows, notes, period, receivedRows, relationshipRows, rows, totals, unresolvedRows };
}

function mergePersonRows(person: DosMinistryReportPerson, invested: DosMinistryReportRow, received: DosMinistryReportRow, unresolved: DosMinistryReportRow): DosMinistryPersonRow {
  const records = [...invested.records, ...received.records, ...unresolved.records].sort((first, second) => second.date.localeCompare(first.date));
  const meetingRecords = records.filter((record) => record.kind === "meeting");
  const meetingsMissingDuration = invested.meetingsMissingDuration + received.meetingsMissingDuration + unresolved.meetingsMissingDuration;
  const hasActivity = meetingRecords.length > 0 || invested.checkInCount > 0;
  const lastActivity = [invested.lastActivity, received.lastActivity, unresolved.lastActivity]
    .filter((activity): activity is NonNullable<DosMinistryReportRow["lastActivity"]> => Boolean(activity))
    .sort((first, second) => second.date.localeCompare(first.date))[0] ?? null;
  /* Needs relationship: meetings exist and the Person carries no confirmed
     relationship to place them by. A confirmed person whose only not-set
     meeting is a mixed group is not "needs relationship"; that meeting is
     simply not counted, and the row says so. */
  const completeness: DosMinistryCompleteness = meetingRecords.length > 0 && invested.directionStatus !== "confirmed"
    ? "unresolved"
    : !hasActivity
      ? "none"
      : meetingsMissingDuration > 0 || invested.checkInsMissingDuration > 0
        ? "partial"
        : "recorded";
  const notCounted = unresolved.meetingCount;
  const completenessDetail = completeness === "unresolved"
    ? unresolved.completenessDetail
    : completeness === "none"
      ? invested.completenessDetail
      : [
        meetingsMissingDuration ? `${meetingsMissingDuration} meeting${meetingsMissingDuration === 1 ? "" : "s"} without a logged duration` : null,
        invested.checkInsMissingDuration ? `${invested.checkInsMissingDuration} check-in${invested.checkInsMissingDuration === 1 ? "" : "s"} without a duration` : null,
        completeness === "recorded" ? "Every contributing record has a date and a logged duration." : null,
        notCounted ? `${notCounted} meeting${notCounted === 1 ? "" : "s"} not counted in either direction: ${Array.from(new Set(unresolved.records.map((record) => record.kind === "meeting" ? record.bucketReason : ""))).filter(Boolean).join(" · ")}.` : null,
      ].filter(Boolean).join(" · ");
  const relationshipNote = invested.directionStatus === "unconfirmed"
    ? "Not confirmed on the Person record"
    : invested.directionStatus === "conflicting"
      ? "My Record disagrees"
      : null;

  return {
    checkInCount: invested.checkInCount,
    checkInMinutes: invested.checkInMinutes,
    checkInsMissingDuration: invested.checkInsMissingDuration,
    completeness,
    completenessDetail,
    completenessLabel: dosMinistryCompletenessLabels[completeness],
    direction: invested.direction,
    directionConflict: invested.directionConflict,
    directionLabel: invested.directionLabel,
    directionSource: invested.directionSource,
    directionStatus: invested.directionStatus,
    downstream: invested.downstream,
    downstreamStatus: invested.downstreamStatus,
    fruitCount: invested.fruitCount,
    lastActivity,
    loggedMinutes: invested.loggedMinutes + received.loggedMinutes + unresolved.loggedMinutes,
    meetingCount: meetingRecords.length,
    meetingsByBucket: { invested: invested.meetingCount, received: received.meetingCount, unresolved: unresolved.meetingCount },
    meetingsMissingDuration,
    minutesByBucket: { invested: invested.loggedMinutes, received: received.loggedMinutes, unresolved: unresolved.loggedMinutes },
    personId: person.id,
    personName: person.name,
    records,
    relationshipLabel: invested.direction === "none" ? "Not set" : invested.directionLabel,
    relationshipNote,
  };
}

/* ---------- fruit rows ---------- */

const submittedFruitStatuses = new Set(["submitted", "reviewed", "approved", "completed"]);

function fruitEntryQualifies(entry: DosMinistryFruitEntry) {
  return submittedFruitStatuses.has(entry.status.trim().toLowerCase());
}

function fruitStatus(entry: DosMinistryFruitEntry): Pick<DosMinistryFruitRow, "statusLabel" | "statusTone"> {
  const status = entry.status.trim().toLowerCase();

  if (entry.source === "journey_progress") {
    return { statusLabel: "Completed", statusTone: "green" };
  }

  if (entry.source === "fruit_event") {
    if (entry.confidence === "verified") {
      return { statusLabel: "Verified", statusTone: "green" };
    }

    return { statusLabel: entry.confidence === "confirmed" ? "Confirmed" : "Observed", statusTone: "blue" };
  }

  if (status === "approved") {
    return { statusLabel: "Approved", statusTone: "green" };
  }

  return { statusLabel: status === "reviewed" ? "Reviewed" : "Submitted", statusTone: "blue" };
}

function fruitText(entry: DosMinistryFruitEntry) {
  const tags = Array.from(new Set(entry.tags.map((tag) => tag.trim()).filter(Boolean)));
  const label = entry.label.trim();

  switch (entry.source) {
    case "journey_progress":
      return label ? `Completed ${label}` : "Completed a session";
    case "review":
      return [label, ...tags].filter(Boolean).join(" · ") || "Review submitted";
    case "testimony":
      return ["Testimony shared", ...tags].join(" · ");
    case "fruit_story":
      return tags.join(" · ") || "Fruit story recorded";
    default:
      return label || tags.join(" · ") || "Fruit recorded";
  }
}

function buildFruitRows(input: DosMinistryReportInput, period: DosMinistryReportPeriod, peopleById: Map<string, DosMinistryReportPerson>): DosMinistryFruitRow[] {
  const meetingsById = new Map(input.meetings.map((meeting) => [meeting.id, meeting]));

  return (input.fruit ?? [])
    .filter((entry) => fruitEntryQualifies(entry) && inPeriod(dosMinistryReportDateKey(entry.date), period))
    .map((entry): DosMinistryFruitRow => {
      const meeting = entry.meetingId ? meetingsById.get(entry.meetingId) ?? null : null;
      const named = entry.personId ? peopleById.get(entry.personId) ?? null : null;
      const meetingPeople = meeting
        ? Array.from(new Set(meeting.fieldPersonIds)).map((id) => peopleById.get(id)).filter((person): person is DosMinistryReportPerson => Boolean(person) && person!.status !== "archived")
        : [];
      const viaMeeting = !named && meetingPeople.length === 1 ? meetingPeople[0] : null;
      const meetingDate = meeting ? dosMinistryReportDateKey(meeting.date) : null;

      return {
        date: dosMinistryReportDateKey(entry.date)!,
        id: `${entry.source}-${entry.id}`,
        open: meeting ? { id: meeting.id, kind: "meeting" } : null,
        personId: named?.id ?? viaMeeting?.id ?? null,
        personName: named?.name ?? viaMeeting?.name ?? "Not linked",
        personSource: named ? "record" : viaMeeting ? "meeting" : "none",
        relatedLabel: meeting
          ? `${meetingTypeLabel(meeting.type)} meeting${meetingDate ? ` · ${formatDosMinistryDate(meetingDate, input.now)}` : ""}`
          : entry.source === "journey_progress" && entry.resourceTitle
            ? entry.resourceTitle
            : "Not linked",
        source: entry.source,
        sourceLabel: dosMinistryFruitSourceLabels[entry.source],
        text: fruitText(entry),
        ...fruitStatus(entry),
      };
    })
    .sort((first, second) => second.date.localeCompare(first.date) || first.personName.localeCompare(second.personName));
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
  "loggedMinutesUnresolved",
  "meetingsMissingDuration",
  "meetingsUnresolved",
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
  loggedMinutesUnresolved: number;
  meetings: number;
  meetingsMissingDuration: number;
  meetingsUnresolved: number;
  peopleWithRecordedActivity: number;
  period: DosMinistryReportPeriod;
  relationships: Array<{ count: number; direction: DosMinistryRelationshipDirection; label: string }>;
};

export function buildDosSafeMinistrySummary(report: DosMinistryReport): DosSafeMinistrySummary {
  const everyRow = [...report.investedRows, ...report.receivedRows, ...report.unresolvedRows, ...report.relationshipRows];
  const relationshipCounts = new Map<DosMinistryRelationshipDirection, number>();
  const counted = new Set<string>();

  everyRow.forEach((row) => {
    if (row.direction !== "none" && !counted.has(row.personId)) {
      counted.add(row.personId);
      relationshipCounts.set(row.direction, (relationshipCounts.get(row.direction) ?? 0) + 1);
    }
  });

  const lastRecordedActivity = [...report.investedRows, ...report.receivedRows, ...report.unresolvedRows]
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
    loggedMinutesUnresolved: report.totals.uniqueLoggedMinutesUnresolved,
    meetings: report.totals.meetings,
    meetingsMissingDuration: report.totals.meetingsMissingDuration,
    meetingsUnresolved: report.totals.unresolvedMeetings,
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

import type { DosAppAccountabilityCheckIn, DosAppAccountabilitySchedule, DosAppFruit, DosAppFruitEvent, DosAppGuidedResourceProgress, DosAppMeeting, DosAppParticipantReview, DosAppParticipantTestimony, DosAppPerson, DosAppUserMentorRelationship } from "./missionary-app";

/* Narrows the loaded workspace objects to the fields above. The narrowing
   is the privacy boundary for the report: whatever else a person, meeting,
   or check-in carries never reaches the calculation. Downstream
   relationships are not part of the loaded workspace; when the loader can
   resolve them from Person relationships and identity links, they are
   passed here explicitly. */
function humanizeValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed ? trimmed.replace(/[_-]+/g, " ").replace(/^\w/, (letter) => letter.toUpperCase()) : "";
}

function stringTags(value: unknown) {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

/* Structured fruit only. The picks below are the whole allow-list. */
export function dosMinistryFruitEntriesFromAppData({
  fruit,
  fruitEvents,
  guidedResourceProgress,
  participantReviews,
  participantTestimonies,
  resolveJourneySession,
}: {
  fruit: DosAppFruit[];
  fruitEvents: DosAppFruitEvent[];
  guidedResourceProgress: DosAppGuidedResourceProgress[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  resolveJourneySession?: (resourceSlug: string, sessionId: string) => { resourceTitle: string | null; sessionTitle: string | null };
}): DosMinistryFruitEntry[] {
  return [
    ...fruitEvents.map((event): DosMinistryFruitEntry => ({
      confidence: event.confidenceLevel,
      date: event.date,
      id: event.id,
      label: event.fruitType,
      meetingId: event.meetingId,
      personId: event.personId,
      resourceTitle: null,
      source: "fruit_event",
      status: event.status,
      tags: [],
    })),
    ...fruit.map((item): DosMinistryFruitEntry => ({
      confidence: null,
      date: item.testimonyDate,
      id: item.id,
      label: "",
      meetingId: item.tableId,
      personId: item.fieldPersonId,
      resourceTitle: null,
      source: "fruit_story",
      status: item.status,
      tags: stringTags(item.outcomeTags),
    })),
    ...participantReviews.map((review): DosMinistryFruitEntry => ({
      confidence: null,
      date: review.submittedAt,
      id: review.id,
      label: humanizeValue(review.overallRating),
      meetingId: review.meetingId,
      personId: review.personId,
      resourceTitle: null,
      source: "review",
      status: review.status,
      tags: stringTags(review.outcomeTags),
    })),
    ...participantTestimonies.map((testimony): DosMinistryFruitEntry => ({
      confidence: null,
      date: testimony.submittedAt,
      id: testimony.id,
      label: "",
      meetingId: testimony.meetingId,
      personId: testimony.personId,
      resourceTitle: null,
      source: "testimony",
      status: testimony.status,
      tags: stringTags(testimony.outcomeTags),
    })),
    ...guidedResourceProgress
      .filter((progress) => Boolean(progress.completedAt))
      .map((progress): DosMinistryFruitEntry => {
        const session = resolveJourneySession?.(progress.resourceSlug, progress.sessionId) ?? { resourceTitle: null, sessionTitle: null };

        return {
          confidence: null,
          date: progress.completedAt,
          id: progress.id,
          label: session.sessionTitle ?? humanizeValue(progress.sessionId),
          meetingId: null,
          personId: progress.personId,
          resourceTitle: session.resourceTitle ?? humanizeValue(progress.resourceSlug),
          source: "journey_progress",
          status: "completed",
          tags: [],
        };
      }),
  ];
}

export function dosMinistryReportInputFromAppData({
  accountabilityCheckIns,
  accountabilitySchedules,
  disciplingMe,
  downstream,
  downstreamReadPersonIds,
  fruit,
  linkedPersonIds,
  meetings,
  people,
}: {
  accountabilityCheckIns: DosAppAccountabilityCheckIn[];
  accountabilitySchedules: DosAppAccountabilitySchedule[];
  disciplingMe: DosAppUserMentorRelationship[];
  downstream?: DosResolvedDownstreamRelationship[];
  downstreamReadPersonIds?: string[];
  fruit?: DosMinistryFruitEntry[];
  linkedPersonIds?: string[];
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
}): Omit<DosMinistryReportInput, "now" | "period" | "range"> {
  return {
    downstreamReadPersonIds: downstreamReadPersonIds ?? [],
    fruit: fruit ?? [],
    linkedPersonIds: linkedPersonIds ?? [],
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
      tableRoleRecorded: meeting.tableRoleRecorded,
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
