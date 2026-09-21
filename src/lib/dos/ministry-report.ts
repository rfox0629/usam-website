/* Master Ministry Report — Time Investment (USA-249 / USA-251 / USA-268).
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
 *   - time is split into what the missionary INVESTED and what was INVESTED
 *     IN THEM; the two are never ranked together
 *   - default range is the last 30 days; 7 / 30 / 90 / custom are offered
 *   - accountability check-ins are their own activity type: never counted
 *     as meetings, never added to contact-time hours
 *   - a group meeting credits its full duration to every linked person as
 *     relationship-contact time; person rows are therefore never summed and
 *     presented as unique missionary elapsed time (see `totals`)
 *   - duration is what was logged: entered minutes, or a start and an end.
 *     Anything else contributes nothing and marks the row Partial. There is
 *     no estimate. A meeting records its length separately from its start
 *     time, and a start time may be unknown, so this is a "logged duration",
 *     never clock-in / clock-out precision.
 *   - a missing record never proves that no ministry happened, and the word
 *     "inactive" does not appear
 *   - nothing circle-based; multiplication only from a downstream person's
 *     own confirmed, directed Person relationship reached through their DOS
 *     identity (no separate chain model)
 *   - Journey progress is read only as completed sessions (canonical
 *     progress rows), never through an assignment status (USA-258)
 *
 * Founder revision of 2026-09-10: one primary table with one row per person
 * (`rows`), multiplication as a column with honest states, and a compact
 * Ministry Fruit table (`fruitRows`) from structured sources only.
 *
 * Founder revision of 2026-09-11 (USA-268): a relationship is never an
 * eligibility gate for time. Production stores no meeting role
 * (`missionary_tables.table_role` does not exist), and 101 of 123 People
 * carry no direction (`role_in_my_life = not_active`, shown as "New"; their
 * "Exploring" is the separate spiritual-journey stage). The 2026-09-09 rule
 * put every such meeting in a third "Relationship not set" list counted in
 * neither total, so real ministry time vanished. Now every logged meeting is
 * counted exactly once, in one of two totals (rules beside
 * `dosMinistryClassifyMeeting`): Invested in me only when a record says so,
 * Time invested otherwise. Meetings = Time invested meetings + Invested in
 * me meetings, always.
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

/* The only visible words for direction, matching the Person record's own
   relationship pill. "New" is a Person with no direction set
   (`role_in_my_life = not_active`). "Exploring" is the spiritual-journey
   stage, a different dimension, so it is never used for direction. "Mentor"
   is a legacy stored value (USA-260) and is never shown. */
export const dosMinistryRelationshipDirectionLabels: Record<DosMinistryRelationshipDirection, string> = {
  discipling_me: "Discipling me",
  i_am_discipling: "Discipling",
  walking_with: "Walking with",
  peer: "Peer encouragement",
  none: "New",
};

export type DosMinistryCompleteness = "recorded" | "partial" | "none";

export const dosMinistryCompletenessLabels: Record<DosMinistryCompleteness, string> = {
  recorded: "Recorded",
  partial: "Partial",
  none: "No activity",
};

/* Which way a meeting's time went. `being_mentored` is the legacy stored
   role for "I was the one being discipled". Mutual discipleship and
   leadership / planning are time the missionary gave, so they are invested. */
export type DosMinistryTimeBucket = "invested" | "received";

export const dosMinistryTimeBucketLabels: Record<DosMinistryTimeBucket, string> = {
  invested: "Time invested",
  received: "Invested in me",
};

export function dosMinistryTimeBucketForRole(tableRole: string): DosMinistryTimeBucket {
  return tableRole === "being_mentored" ? "received" : "invested";
}

/* The three summary figures. Each definition is what the metric detail says;
   nothing is repeated on the cards themselves. */
export type DosMinistryMetricKey = "invested" | "received" | "meetings";

export const dosMinistryMetricDefinitions: Record<DosMinistryMetricKey, { definition: string; label: string }> = {
  invested: {
    definition: "Logged duration of every meeting and group gathering in this range where you were not the one being discipled. Each counts once, however many people were there. A meeting without a logged duration adds nothing.",
    label: "Time invested",
  },
  received: {
    definition: "Logged duration of meetings where you were being discipled: discipleship meetings from My Record, meetings with the role Being discipled, and meetings with only people who are discipling you. Each meeting counts once.",
    label: "Invested in me",
  },
  meetings: {
    definition: "Logged meetings, completed group gatherings and My Record discipleship meetings dated in this range, each counted once however many attended. Scheduled and canceled meetings, connection logs, and check-ins are not meetings.",
    label: "Meetings",
  },
};

/* ---------- inputs: exactly the fields the report reads ---------- */

export type DosMinistryReportPerson = {
  id: string;
  name: string;
  /* "archived" rows are excluded; anything else is a living record. */
  status: string;
  /* The canonical, structured direction (USA-244). */
  roleInMyLife: string;
};

export type DosMinistryReportMeeting = {
  id: string;
  /* The meeting's event date (ISO date or timestamp). */
  date: string | null;
  fieldPersonIds: string[];
  meetingStatus: "canceled" | "logged" | "scheduled";
  scheduledEndAt: string | null;
  scheduledStartAt: string | null;
  /* "discipleship" is a meeting logged through Log Discipleship Meeting in My
     Record (`dos_user_mentor_meetings`, USA-265): the missionary was the one
     being discipled, so the form itself records the direction. */
  source: "connection" | "discipleship" | "gathering" | "table";
  /* A completed group gathering (founder, 2026-09-21) enters as ONE meeting:
     its group, so the record reads and opens as the gathering. */
  groupId?: string;
  groupName?: string;
  /* Entered minutes, for a record that stores a duration rather than a start
     and end (discipleship meetings). */
  durationMinutes?: number | null;
  tableRole: string;
  /* True only when the role was stored on the meeting. Production has no
     `table_role` column yet, so the loader's "ministering" is a default
     there, and a default never decides a direction. */
  tableRoleRecorded: boolean;
  type: string;
  /* The conversation flow used, when any (USA-275): only
     "kitchen_table_gospel" marks a genuine Kitchen Table Gospel record. */
  conversationFlowKey?: string | null;
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
   read only as a fallback, and a disagreement is stated in the row detail
   until the reconciliation in the registry (§5) lands. */
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

/* A group gathering as the report reads it (USA-271): who was recorded
   present. Membership alone is not attendance; only a saved attendance row
   with status present or guest counts, and each gathering counts once per
   person however many times it is saved. The leader's own meeting time is
   a separate record and is never multiplied by attendees. */
export type DosMinistryReportGathering = {
  attendeePersonIds: string[];
  date: string | null;
  /* The duration the leader saved when recording it (start to end), or null
     when it has none. Missing is never zero. */
  durationMinutes?: number | null;
  /* A logged meeting this gathering is already linked to, which then counts
     instead of the gathering, so the time is never counted twice. */
  linkedMeetingId?: string | null;
  groupId: string;
  groupName: string;
  id: string;
  status: "canceled" | "completed" | "scheduled";
};

export type DosMinistryMultiplicationInput = {
  /* The person's own DOS account is connected and readable, so "none" was
     read from their own records rather than only from what was added here. */
  connected: boolean;
  /* Direct disciples only, each a unique person. */
  disciples: Array<{ key: string; name: string }>;
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
  gatherings?: DosMinistryReportGathering[];
  /* People in this workspace with a verified DOS identity link. Without one
     a person's own records cannot be reached, so multiplication reads
     "Not connected". */
  linkedPersonIds?: string[];
  /* USA-275: current direct disciples per Person, from the one discipleship
     graph (src/lib/dos/discipleship-graph.ts) that also powers the People
     Multiplication section and the Multiplying indicator. When present it
     replaces `downstream` for the Multiplication column. It is CURRENT, never
     filtered by the report period, and never adds to any meeting, time or
     Fruit figure. */
  multiplication?: Record<string, DosMinistryMultiplicationInput>;
  meetings: DosMinistryReportMeeting[];
  now: Date;
  people: DosMinistryReportPerson[];
  period?: { end: string; start: string };
  range: DosMinistryReportRange;
  schedules: DosMinistryReportSchedule[];
};

/* ---------- outputs ---------- */

export type DosMinistryMeetingOpen = { groupId?: string; id: string; kind: "discipleship_meeting" | "gathering" | "meeting" };

export type DosMinistryReportRecord =
  | {
      bucket: DosMinistryTimeBucket;
      /* Which rule placed the meeting (see dosMinistryClassifyMeeting). */
      bucketReason: string;
      date: string;
      id: string;
      kind: "meeting";
      label: string;
      minutes: number | null;
      open: DosMinistryMeetingOpen;
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

/* Each logged meeting in the range, once, for the metric and meeting detail.
   `people` are the active People it links; it never carries notes. */
export type DosMinistryMeetingRecord = {
  bucket: DosMinistryTimeBucket;
  bucketReason: string;
  date: string;
  id: string;
  label: string;
  minutes: number | null;
  open: DosMinistryMeetingOpen;
  people: Array<{ id: string; name: string }>;
  /* The role stored on the meeting, or null when none was recorded. */
  roleLabel: string | null;
  source: "discipleship" | "gathering" | "table";
};

export type DosMinistryNextAction = {
  kind: "complete_record" | "log_check_in" | "scheduled" | "schedule" | "ask" | "keep_rhythm";
  label: string;
  reason: string;
};

/* resolved: the person's own Person records were read and name people they
   are discipling. not_recorded: read, and none. not_resolved: a DOS identity
   is linked but the reader is not built yet. not_connected: no verified DOS
   identity, so nothing can be read. not_applicable: not someone the
   missionary is discipling. */
export type DosMinistryDownstreamStatus = "resolved" | "not_recorded" | "not_resolved" | "not_connected" | "not_applicable";

/* The full wording, for the row detail. */
export function dosMinistryMultiplicationLabel(row: Pick<DosMinistryReportRow, "downstream" | "downstreamStatus">) {
  switch (row.downstreamStatus) {
    case "resolved":
      return `${row.downstream.length} ${row.downstream.length === 1 ? "person" : "people"}`;
    case "not_recorded":
    case "not_connected":
      /* USA-275: the empty state names what is known -- nothing was added --
         and never implies that no ministry is happening. */
      return "No discipleship connections added";
    case "not_resolved":
      return "Not resolved yet";
    default:
      return "Not applicable";
  }
}

/* The table cell (USA-268): a number only when the person's own records were
   read. "0" is a verified zero; "—" is information DOS does not have. */
export function dosMinistryMultiplicationCell(row: Pick<DosMinistryReportRow, "downstream" | "downstreamStatus">) {
  switch (row.downstreamStatus) {
    case "resolved":
      return String(row.downstream.length);
    case "not_recorded":
    case "not_connected":
      return "0";
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
     says so. conflicting: My Record disagrees with the Person. none. */
  directionStatus: DosMinistryDirectionStatus;
  downstream: Array<{ name: string; personId: string }>;
  downstreamStatus: DosMinistryDownstreamStatus;
  /* Fruit entries in the range that name this person. */
  fruitCount: number;
  /* Distinct completed group gatherings in the range with this person
     recorded present or as a guest (USA-271). Not meetings, not leader time. */
  gatheringsAttended: number;
  lastActivity: { date: string; kind: "meeting" | "check_in" } | null;
  /* Logged duration in this row's scope, credited per person. */
  loggedMinutes: number;
  meetingCount: number;
  meetingsMissingDuration: number;
  nextAction: DosMinistryNextAction;
  personId: string;
  personName: string;
  records: DosMinistryReportRecord[];
};

/* One row per person for the primary table (2026-09-10): every meeting with
   the person, so a person appears once. The per-bucket figures stay on the
   row, so time invested in the missionary is never presented as time they
   invested. */
export type DosMinistryPersonRow = Omit<DosMinistryReportRow, "bucket" | "nextAction"> & {
  meetingsByBucket: Record<DosMinistryTimeBucket, number>;
  minutesByBucket: Record<DosMinistryTimeBucket, number>;
  /* "Discipling", "Walking with", "Discipling me", "New". */
  relationshipLabel: string;
  /* A short qualifier when the relationship is not confirmed on the Person. */
  relationshipNote: string | null;
};

/* Filters follow the relationship itself (USA-268). A relationship never
   decides whether time counts, so there is no "not set" bucket to filter. */
export type DosMinistryReportFilter = "all" | "i_am_discipling" | "walking_with" | "discipling_me" | "none" | "multiplying";

export const dosMinistryReportFilterOptions: ReadonlyArray<{ label: string; value: DosMinistryReportFilter }> = [
  { label: "All", value: "all" },
  { label: "Discipling", value: "i_am_discipling" },
  { label: "Walking with", value: "walking_with" },
  { label: "Discipling me", value: "discipling_me" },
  { label: "New", value: "none" },
  /* USA-275: current multiplication, independent of the period. */
  { label: "Multiplying", value: "multiplying" },
];

export function dosMinistryRowMatchesFilter(row: Pick<DosMinistryPersonRow, "direction" | "downstream">, filter: DosMinistryReportFilter) {
  return filter === "all" || (filter === "multiplying" ? row.downstream.length > 0 : row.direction === filter);
}

export type DosMinistryReportSortKey = "person" | "relationship" | "meetings" | "time" | "last_activity" | "fruit";

export type DosMinistryReportSort = { direction: "asc" | "desc"; key: DosMinistryReportSortKey };

export const dosMinistryReportDefaultSort: DosMinistryReportSort = { direction: "desc", key: "time" };

const relationshipSortOrder: Record<DosMinistryRelationshipDirection, number> = {
  i_am_discipling: 0,
  walking_with: 1,
  discipling_me: 2,
  peer: 3,
  none: 4,
};

/* Ties always fall back to logged duration, meetings, then name, so a sort
   never reshuffles equal rows between renders. */
export function dosMinistrySortRows<T extends Pick<DosMinistryPersonRow, "direction" | "fruitCount" | "gatheringsAttended" | "lastActivity" | "loggedMinutes" | "meetingCount" | "personName">>(
  rows: ReadonlyArray<T>,
  sort: DosMinistryReportSort,
): T[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const compare = (first: T, second: T) => {
    switch (sort.key) {
      case "person":
        return first.personName.localeCompare(second.personName);
      case "relationship":
        return relationshipSortOrder[first.direction] - relationshipSortOrder[second.direction];
      case "meetings":
        return first.meetingCount - second.meetingCount;
      case "last_activity":
        return (first.lastActivity?.date ?? "").localeCompare(second.lastActivity?.date ?? "");
      case "fruit":
        return first.fruitCount - second.fruitCount;
      default:
        return first.loggedMinutes - second.loggedMinutes;
    }
  };

  return [...rows].sort((first, second) =>
    sign * compare(first, second)
    || second.loggedMinutes - first.loggedMinutes
    || second.meetingCount - first.meetingCount
    || second.gatheringsAttended - first.gatheringsAttended
    || first.personName.localeCompare(second.personName));
}

export type DosMinistryFruitRow = {
  date: string;
  id: string;
  open: DosMinistryMeetingOpen | null;
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
  /* The one-line outcome for the table cell (USA-268). */
  summary: string;
  /* Explicitly chosen outcome tags, for the detail. */
  tags: string[];
  /* The full structured line: heading and tags. */
  text: string;
};

export type DosMinistryReportTotals = {
  checkIns: number;
  /* Connection logs in the range: named in the Meetings detail, never meetings. */
  connectionLogs: number;
  /* Distinct completed group gatherings in the range with at least one
     recorded attendee (USA-271). Never meetings and never contact time. */
  gatheringsWithAttendance: number;
  investedMeetings: number;
  /* investedMeetings + receivedMeetings, always. */
  meetings: number;
  meetingsMissingDuration: number;
  peopleWithActivity: number;
  receivedMeetings: number;
  /* Fruit records with no date, which no range can show. */
  undatedFruit: number;
  /* Unique logged duration, each meeting counted once, however many people
     it credited. These are the only figures that may be called "my time". */
  uniqueLoggedMinutesInvested: number;
  uniqueLoggedMinutesReceived: number;
  /* Meetings linked to no active Person: counted in the totals only. */
  unlinkedMeetings: number;
};

export type DosMinistryReport = {
  /* Structured fruit, reviews, testimonies, and Journey completions in range. */
  fruitRows: DosMinistryFruitRow[];
  /* People with meetings where the missionary invested time, or check-ins. */
  investedRows: DosMinistryReportRow[];
  /* Every logged meeting in the range, once, newest first. */
  meetings: DosMinistryMeetingRecord[];
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
   from the current one. The one date format in Reports. Pure, so the
   regression can pin it. */
export function formatDosMinistryDate(dateKey: string, now = new Date()) {
  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("en-US", date.getFullYear() === now.getFullYear()
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" });
}

/* "Aug 13 – Sep 11, 2026": the selected period, with the year stated once. */
export function formatDosMinistryPeriod(period: Pick<DosMinistryReportPeriod, "end" | "start">) {
  const start = new Date(`${period.start}T12:00:00`);
  const end = new Date(`${period.end}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${period.start} – ${period.end}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  return `${startLabel} – ${endLabel}`;
}

/* ---------- duration ---------- */

/* Logged duration only. Entered minutes when the record stores them;
   otherwise a start and end that are both present. Anything else contributes
   nothing. A meeting's length is recorded independently of its start time --
   a start time can be unknown and often is -- so this is the duration that
   was entered, never a clock-in / clock-out interval. */
export function dosLoggedMeetingMinutes(meeting: Pick<DosMinistryReportMeeting, "durationMinutes" | "scheduledEndAt" | "scheduledStartAt">) {
  if (typeof meeting.durationMinutes === "number") {
    return Number.isFinite(meeting.durationMinutes) && meeting.durationMinutes > 0 ? Math.round(meeting.durationMinutes) : null;
  }

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
   fallback only, and any disagreement is stated in the row detail so it can
   be reconciled on the Person record (registry §5). The stored display
   summary (`relationship_type`) is never read: it is often a stale legacy
   string, and it is what made Lyf Nimmo's row read "Discipling" in one place
   and not set in another. */
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
        ? `My Record lists ${person.name} as discipling you, but the Person record says ${dosMinistryRelationshipDirectionLabels[roleDirection]}. The Person record is used.`
        : null,
      directionLabel: dosMinistryRelationshipDirectionLabels[roleDirection],
      directionSource: "person",
      directionStatus: conflicting ? "conflicting" : "confirmed",
    };
  }

  if (myRecord) {
    return {
      direction: "discipling_me",
      directionConflict: `Only My Record says ${person.name} is discipling you. Set "They are discipling me" on the Person record to confirm it.`,
      directionLabel: dosMinistryRelationshipDirectionLabels.discipling_me,
      directionSource: "my_record",
      directionStatus: "unconfirmed",
    };
  }

  return {
    direction: "none",
    directionConflict: null,
    directionLabel: dosMinistryRelationshipDirectionLabels.none,
    directionSource: "none",
    directionStatus: "none",
  };
}

/* ---------- classification (USA-268, 2026-09-11) ----------
 *
 * Which total a meeting belongs to. Every logged meeting belongs to exactly
 * one. Nothing here reads notes, and a relationship never decides whether a
 * meeting counts:
 *
 *   1. A role RECORDED on the meeting decides: being discipled -> Invested in
 *      me; ministering, mutual discipleship, leadership / planning -> Time
 *      invested. A My Record discipleship meeting records being discipled.
 *   2. Otherwise, when EVERYONE present is discipling the missionary (the
 *      Person record, else the My Record fallback) -> Invested in me.
 *   3. Everything else is Time invested: New, Walking with, Discipling, peer,
 *      a mixed group, or no linked person. A mixed group counts once, as time
 *      invested, and says so; it is never split or counted twice.
 */

export type DosMinistryClassification = {
  bucket: DosMinistryTimeBucket;
  reason: string;
};

export function dosMinistryClassifyMeeting(
  meeting: Pick<DosMinistryReportMeeting, "fieldPersonIds" | "tableRole" | "tableRoleRecorded"> & Partial<Pick<DosMinistryReportMeeting, "source">>,
  directionByPersonId: Map<string, Pick<DosMinistryReportRow, "direction" | "directionStatus" | "personName">>,
): DosMinistryClassification {
  /* A group gathering in the missionary's own workspace is time they gave,
     counted once however many attended (founder, 2026-09-21). */
  if (meeting.source === "gathering") {
    return { bucket: "invested", reason: "Group gathering, counted once however many attended" };
  }

  if (meeting.tableRoleRecorded) {
    const bucket = dosMinistryTimeBucketForRole(meeting.tableRole);

    if (meeting.source === "discipleship") {
      return { bucket, reason: "Logged in My Record as a discipleship meeting" };
    }

    return { bucket, reason: bucket === "received" ? "Role recorded on the meeting: being discipled" : "Role recorded on the meeting" };
  }

  const linked = Array.from(new Set(meeting.fieldPersonIds))
    .map((personId) => directionByPersonId.get(personId) ?? null)
    .filter((status): status is Pick<DosMinistryReportRow, "direction" | "directionStatus" | "personName"> => Boolean(status));

  if (!linked.length) {
    return { bucket: "invested", reason: "No recorded role and no linked person" };
  }

  const disciplingMe = linked.filter((status) => status.direction === "discipling_me");

  if (disciplingMe.length === linked.length) {
    const onlyMyRecord = disciplingMe.some((status) => status.directionStatus !== "confirmed");

    return {
      bucket: "received",
      reason: linked.length > 1
        ? "Everyone present is discipling you"
        : onlyMyRecord
          ? "My Record says they are discipling you"
          : "The Person record says they are discipling you",
    };
  }

  if (disciplingMe.length) {
    return { bucket: "invested", reason: "Mixed group with no recorded role, counted once as time invested" };
  }

  return { bucket: "invested", reason: "No recorded role" };
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

/* USA-275: the one label for a meeting's stored `table_type`, shared by
   Reports and the Log Meeting options. `kitchen_table` is the column's
   original value for a face-to-face meeting; since USA-168 the form offers it
   as "In person", so it must never read "Kitchen table" here. Kitchen Table
   Gospel is a conversation flow (`conversation_flow_key`), not a medium, and
   is labelled from that key — see `dosMinistryMeetingLabel`. */
export const dosMeetingContextLabels: Readonly<Record<string, string>> = {
  coffee: "Coffee",
  discipleship: "Discipleship",
  group: "Group",
  kitchen_table: "In person",
  other: "Other",
  phone: "Phone",
  prayer: "Prayer",
  text: "Text",
  zoom: "Video",
};

export function dosMeetingContextLabel(type: string | null | undefined) {
  return (type && dosMeetingContextLabels[type]) || "Meeting";
}

export const dosKitchenTableGospelFlowKey = "kitchen_table_gospel";

export function dosMinistryMeetingLabel(meeting: Pick<DosMinistryReportMeeting, "conversationFlowKey" | "type">) {
  return meeting.conversationFlowKey === dosKitchenTableGospelFlowKey
    ? `${dosMeetingContextLabel(meeting.type)} · Kitchen Table Gospel`
    : dosMeetingContextLabel(meeting.type);
}

function meetingTypeLabel(type: string) {
  return dosMeetingContextLabel(type);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

type DosMinistryRowCore = Omit<DosMinistryReportRow, "bucket" | "nextAction">;

/* Where a counted meeting opens: a logged meeting, My Record's discipleship
   meeting, or the group gathering itself. */
function dosMinistryMeetingOpen(meeting: Pick<DosMinistryReportMeeting, "groupId" | "id" | "source">): DosMinistryMeetingOpen {
  if (meeting.source === "gathering") {
    return { groupId: meeting.groupId, id: meeting.id, kind: "gathering" };
  }

  return { id: meeting.id, kind: meeting.source === "discipleship" ? "discipleship_meeting" : "meeting" };
}

export function buildDosMinistryReport(input: DosMinistryReportInput): DosMinistryReport {
  const period = dosMinistryReportPeriod(input.range, input.now, input.period);
  const today = localDateKey(input.now);
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  /* A record loaded twice (the same source and id) is one meeting. Logged
     meetings and My Record discipleship meetings are different records and
     are never merged (USA-265: keep both logs). */
  const seenMeetingKeys = new Set<string>();
  const inputMeetings = input.meetings.filter((meeting) => {
    const key = `${meeting.source}:${meeting.id}`;

    if (seenMeetingKeys.has(key)) {
      return false;
    }

    seenMeetingKeys.add(key);

    return true;
  });

  const loggedMeetings = inputMeetings.filter((meeting) => meeting.meetingStatus === "logged" && (meeting.source === "table" || meeting.source === "discipleship") && inPeriod(dosMinistryReportDateKey(meeting.date), period));
  const connectionLogs = inputMeetings.filter((meeting) => meeting.meetingStatus === "logged" && meeting.source === "connection" && inPeriod(dosMinistryReportDateKey(meeting.date), period)).length;
  const qualifyingCheckIns = input.checkIns.filter((checkIn) => inPeriod(dosMinistryReportDateKey(checkIn.checkInDate), period));
  const upcomingMeetings = input.meetings.filter((meeting) => meeting.meetingStatus === "scheduled" && (dosMinistryReportDateKey(meeting.date) ?? "") >= today);
  const resolvedDownstream = (input.downstream ?? []).filter((link) => link.status === "active" && link.source === "person_relationship" && link.roleInMyLife === "discipling_them");
  const linkedPersonIds = new Set(input.linkedPersonIds ?? []);
  const downstreamReadPersonIds = new Set(input.downstreamReadPersonIds ?? []);
  const fruitRows = buildFruitRows(input, period, peopleById);
  /* USA-271: recorded group attendance, counted once per person per
     gathering. It is never Fruit. Founder, 2026-09-21: each completed
     gathering is also ONE meeting with its saved duration (below), so four
     people attending adds one meeting and one duration to the totals. */
  const gatheringsInPeriod = (input.gatherings ?? []).filter((gathering) => gathering.status === "completed" && inPeriod(dosMinistryReportDateKey(gathering.date), period));
  const gatheringsAttendedByPerson = new Map<string, Set<string>>();

  gatheringsInPeriod.forEach((gathering) => {
    Array.from(new Set(gathering.attendeePersonIds)).forEach((personId) => {
      const attended = gatheringsAttendedByPerson.get(personId) ?? new Set<string>();

      attended.add(gathering.id);
      gatheringsAttendedByPerson.set(personId, attended);
    });
  });

  /* Each completed gathering in range becomes one meeting, whoever and
     however many attended: the attendees are its people, so each sees it on
     their row, while the totals count it and its duration once. A gathering
     already linked to a logged meeting in range is left to that meeting, so
     the same time is never counted twice. */
  const loggedTableMeetingIds = new Set(loggedMeetings.filter((meeting) => meeting.source === "table").map((meeting) => meeting.id));
  const gatheringMeetings: DosMinistryReportMeeting[] = gatheringsInPeriod
    .filter((gathering) => !(gathering.linkedMeetingId && loggedTableMeetingIds.has(gathering.linkedMeetingId)))
    .map((gathering) => ({
      date: gathering.date,
      durationMinutes: gathering.durationMinutes ?? null,
      fieldPersonIds: Array.from(new Set(gathering.attendeePersonIds)),
      groupId: gathering.groupId,
      groupName: gathering.groupName,
      id: gathering.id,
      meetingStatus: "logged",
      scheduledEndAt: null,
      scheduledStartAt: null,
      source: "gathering",
      tableRole: "ministering",
      tableRoleRecorded: false,
      type: "group",
    }));
  const qualifyingMeetings = [...loggedMeetings, ...gatheringMeetings];

  const fruitCountByPerson = new Map<string, number>();

  fruitRows.forEach((row) => {
    if (row.personId) {
      fruitCountByPerson.set(row.personId, (fruitCountByPerson.get(row.personId) ?? 0) + 1);
    }
  });

  /* Direction per active person, resolved once; the classifier reads it. */
  const activePeople = input.people.filter((person) => person.status !== "archived");
  const directionByPersonId = new Map(activePeople.map((person) => [person.id, { ...dosMinistryDirectionForPerson(person, input.disciplingMe), personName: person.name }]));
  const activeLinkedIds = (meeting: Pick<DosMinistryReportMeeting, "fieldPersonIds">) => Array.from(new Set(meeting.fieldPersonIds)).filter((personId) => directionByPersonId.has(personId));

  const classificationByMeetingId = new Map<string, DosMinistryClassification>();
  const meetingsByPerson = new Map<string, DosMinistryReportMeeting[]>();
  let unlinkedMeetings = 0;

  qualifyingMeetings.forEach((meeting) => {
    const linkedIds = activeLinkedIds(meeting);

    classificationByMeetingId.set(meeting.id, dosMinistryClassifyMeeting(meeting, directionByPersonId));

    if (!linkedIds.length) {
      unlinkedMeetings += 1;
    }

    linkedIds.forEach((personId) => {
      meetingsByPerson.set(personId, [...(meetingsByPerson.get(personId) ?? []), meeting]);
    });
  });

  const classificationOf = (meeting: DosMinistryReportMeeting) => classificationByMeetingId.get(meeting.id) ?? dosMinistryClassifyMeeting(meeting, directionByPersonId);

  const meetings: DosMinistryMeetingRecord[] = qualifyingMeetings
    .map((meeting): DosMinistryMeetingRecord => {
      const classification = classificationOf(meeting);

      return {
        bucket: classification.bucket,
        bucketReason: classification.reason,
        date: dosMinistryReportDateKey(meeting.date) ?? period.end,
        id: meeting.id,
        label: meeting.source === "discipleship" ? "Discipleship meeting" : meeting.source === "gathering" ? `Group gathering · ${meeting.groupName ?? "Group"}` : dosMinistryMeetingLabel(meeting),
        minutes: dosLoggedMeetingMinutes(meeting),
        open: dosMinistryMeetingOpen(meeting),
        people: activeLinkedIds(meeting).map((personId) => ({ id: personId, name: peopleById.get(personId)?.name ?? "" })),
        roleLabel: meeting.tableRoleRecorded ? meetingRoleLabel(meeting.tableRole) : null,
        source: meeting.source === "discipleship" || meeting.source === "gathering" ? meeting.source : "table",
      };
    })
    .sort((first, second) => second.date.localeCompare(first.date) || first.label.localeCompare(second.label));

  const checkInsByPerson = new Map<string, DosMinistryReportCheckIn[]>();

  qualifyingCheckIns.forEach((checkIn) => {
    if (!directionByPersonId.has(checkIn.personId)) {
      return;
    }

    checkInsByPerson.set(checkIn.personId, [...(checkInsByPerson.get(checkIn.personId) ?? []), checkIn]);
  });

  /* Every contributing record for a person, newest first. Check-ins are
     something the missionary does for the person, so they sit with time
     invested and never with time received. */
  const recordsByPerson = new Map<string, DosMinistryReportRecord[]>();
  const recordsFor = (person: DosMinistryReportPerson) => {
    const cached = recordsByPerson.get(person.id);

    if (cached) {
      return cached;
    }

    const isDisciplingMe = directionByPersonId.get(person.id)?.direction === "discipling_me";
    const meetingRecords: DosMinistryReportRecord[] = (meetingsByPerson.get(person.id) ?? []).map((meeting) => {
      const others = Array.from(new Set(meeting.fieldPersonIds)).filter((id) => id !== person.id).length;
      const classification = classificationOf(meeting);
      /* A row follows the recorded role, else that person's own
         relationship. The two differ only for an unrecorded mixed group: it
         counts once as time invested in the totals, and on the row of
         someone discipling the missionary it is time invested in them, so a
         discipler is never ranked as the missionary's time investment. */
      const placed = !meeting.tableRoleRecorded && classification.bucket === "invested" && isDisciplingMe
        ? { bucket: "received" as const, reason: "Mixed group with no recorded role; they are discipling you" }
        : classification;

      return {
        bucket: placed.bucket,
        bucketReason: placed.reason,
        date: dosMinistryReportDateKey(meeting.date) ?? period.end,
        id: meeting.id,
        kind: "meeting",
        label: meeting.source === "discipleship"
          ? "Discipleship meeting · Being discipled"
          : meeting.source === "gathering"
            ? [`Group gathering · ${meeting.groupName ?? "Group"}`, others ? `with ${plural(others, "other")}` : null].filter(Boolean).join(" · ")
            : [dosMinistryMeetingLabel(meeting), meeting.tableRoleRecorded ? meetingRoleLabel(meeting.tableRole) : null, others ? `with ${plural(others, "other")}` : null].filter(Boolean).join(" · "),
        minutes: dosLoggedMeetingMinutes(meeting),
        open: dosMinistryMeetingOpen(meeting),
        role: meeting.tableRoleRecorded ? meeting.tableRole : "",
        shared: others > 0,
      };
    });
    const checkInRecords: DosMinistryReportRecord[] = (checkInsByPerson.get(person.id) ?? []).map((checkIn) => ({
      bucket: "invested",
      date: dosMinistryReportDateKey(checkIn.checkInDate) ?? period.end,
      id: checkIn.id,
      kind: "check_in",
      label: "Accountability check-in",
      minutes: checkIn.durationMinutes && checkIn.durationMinutes > 0 ? checkIn.durationMinutes : null,
      open: { id: person.id, kind: "person" },
    }));
    /* Stable sort: on the same day a meeting reads before a check-in. */
    const records = [...meetingRecords, ...checkInRecords].sort((first, second) => second.date.localeCompare(first.date));

    recordsByPerson.set(person.id, records);

    return records;
  };

  const rowCore = (person: DosMinistryReportPerson, records: DosMinistryReportRecord[]): DosMinistryRowCore => {
    const meetingRecords = records.filter((record) => record.kind === "meeting");
    const checkInRecords = records.filter((record) => record.kind === "check_in");
    const loggedMinutes = meetingRecords.reduce((sum, record) => sum + (record.minutes ?? 0), 0);
    const meetingsMissingDuration = meetingRecords.filter((record) => record.minutes === null).length;
    const checkInsMissingDuration = checkInRecords.filter((record) => record.minutes === null).length;
    const checkInMinutes = checkInRecords.reduce((sum, record) => sum + (record.minutes ?? 0), 0);
    const latest = records[0] ?? null;
    const completeness: DosMinistryCompleteness = !records.length
      ? "none"
      : meetingsMissingDuration > 0 || checkInsMissingDuration > 0
        ? "partial"
        : "recorded";
    const completenessDetail = completeness === "partial"
      ? [
        meetingsMissingDuration ? `${plural(meetingsMissingDuration, "meeting")} without a logged duration` : null,
        checkInsMissingDuration ? `${plural(checkInsMissingDuration, "check-in")} without a duration` : null,
      ].filter(Boolean).join(" · ")
      : completeness === "none"
        ? "No meeting or check-in logged in this range."
        : "Every contributing record has a logged duration.";
    const direction = directionByPersonId.get(person.id) ?? { ...dosMinistryDirectionForPerson(person, input.disciplingMe), personName: person.name };
    const graphMultiplication = input.multiplication ? input.multiplication[person.id] ?? { connected: false, disciples: [] } : null;
    const downstream = graphMultiplication
      ? graphMultiplication.disciples.map((disciple) => ({ name: disciple.name, personId: disciple.key }))
      : resolvedDownstream
        .filter((link) => link.disciplerPersonId === person.id)
        .map((link) => ({ name: link.discipleDisplayName, personId: link.disciplePersonId }));
    /* A person with current disciples is resolved whatever the missionary's
       own relationship with them, so multiplying people stay discoverable. */
    const downstreamStatus: DosMinistryDownstreamStatus = downstream.length
      ? "resolved"
      : direction.direction !== "i_am_discipling"
        ? "not_applicable"
        : graphMultiplication
          ? graphMultiplication.connected ? "not_recorded" : "not_connected"
          : downstreamReadPersonIds.has(person.id)
            ? "not_recorded"
            : linkedPersonIds.has(person.id)
              ? "not_resolved"
              : "not_connected";

    return {
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
      gatheringsAttended: gatheringsAttendedByPerson.get(person.id)?.size ?? 0,
      lastActivity: latest ? { date: latest.date, kind: latest.kind === "meeting" ? "meeting" : "check_in" } : null,
      loggedMinutes,
      meetingCount: meetingRecords.length,
      meetingsMissingDuration,
      personId: person.id,
      personName: person.name,
      records,
    };
  };

  const bucketRow = (person: DosMinistryReportPerson, bucket: DosMinistryTimeBucket): DosMinistryReportRow => {
    const records = recordsFor(person).filter((record) => (record.kind === "meeting" ? record.bucket === bucket : bucket === "invested"));
    const core = rowCore(person, records);
    const overdueCheckIn = bucket === "invested" && input.schedules.some((schedule) => schedule.personId === person.id && schedule.status === "active" && Boolean(schedule.nextCheckIn) && (dosMinistryReportDateKey(schedule.nextCheckIn) ?? "") < today);
    const upcoming = upcomingMeetings
      .filter((meeting) => meeting.fieldPersonIds.includes(person.id) && dosMinistryClassifyMeeting(meeting, directionByPersonId).bucket === bucket)
      .map((meeting) => dosMinistryReportDateKey(meeting.date) ?? "")
      .sort()[0] ?? null;

    return {
      ...core,
      bucket,
      nextAction: nextActionFor({
        direction: core.direction,
        lastMeetingDate: core.records.find((record) => record.kind === "meeting")?.date ?? null,
        meetingsMissingDuration: core.meetingsMissingDuration,
        overdueCheckIn,
        period,
        personName: person.name,
        upcomingMeetingDate: upcoming,
      }),
    };
  };

  const byLoggedMinutes = (first: Pick<DosMinistryReportRow, "loggedMinutes" | "meetingCount" | "personName">, second: Pick<DosMinistryReportRow, "loggedMinutes" | "meetingCount" | "personName">) =>
    second.loggedMinutes - first.loggedMinutes || second.meetingCount - first.meetingCount || first.personName.localeCompare(second.personName);
  const investedRows = activePeople
    .map((person) => bucketRow(person, "invested"))
    .filter((row) => row.meetingCount > 0 || row.checkInCount > 0)
    .sort(byLoggedMinutes);
  const receivedRows = activePeople
    .map((person) => bucketRow(person, "received"))
    .filter((row) => row.meetingCount > 0)
    .sort(byLoggedMinutes);
  const activeIds = new Set([...investedRows, ...receivedRows].map((row) => row.personId));
  const relationshipRows = activePeople
    .filter((person) => !activeIds.has(person.id))
    .map((person) => bucketRow(person, "invested"))
    .filter((row) => row.direction !== "none")
    .sort((first, second) => first.personName.localeCompare(second.personName));

  /* The primary table: one row per person. */
  const rows = activePeople
    .map((person): DosMinistryPersonRow => {
      const core = rowCore(person, recordsFor(person));
      const meetingRecords = core.records.filter((record) => record.kind === "meeting");
      const inBucket = (bucket: DosMinistryTimeBucket) => meetingRecords.filter((record) => record.bucket === bucket);

      return {
        ...core,
        meetingsByBucket: { invested: inBucket("invested").length, received: inBucket("received").length },
        minutesByBucket: {
          invested: inBucket("invested").reduce((sum, record) => sum + (record.minutes ?? 0), 0),
          received: inBucket("received").reduce((sum, record) => sum + (record.minutes ?? 0), 0),
        },
        relationshipLabel: core.directionLabel,
        relationshipNote: core.directionStatus === "unconfirmed"
          ? "Not on the Person record"
          : core.directionStatus === "conflicting"
            ? "My Record differs"
            : null,
      };
    })
    .filter((row) => row.meetingCount > 0 || row.checkInCount > 0 || row.gatheringsAttended > 0 || row.direction !== "none" || row.downstream.length > 0);

  const investedMeetings = meetings.filter((meeting) => meeting.bucket === "invested");
  const receivedMeetings = meetings.filter((meeting) => meeting.bucket === "received");
  const sumUnique = (items: DosMinistryMeetingRecord[]) => items.reduce((sum, meeting) => sum + (meeting.minutes ?? 0), 0);
  const totals: DosMinistryReportTotals = {
    checkIns: qualifyingCheckIns.length,
    connectionLogs,
    gatheringsWithAttendance: gatheringsInPeriod.filter((gathering) => gathering.attendeePersonIds.length > 0).length,
    investedMeetings: investedMeetings.length,
    meetings: meetings.length,
    meetingsMissingDuration: meetings.filter((meeting) => meeting.minutes === null).length,
    peopleWithActivity: activeIds.size,
    receivedMeetings: receivedMeetings.length,
    undatedFruit: (input.fruit ?? []).filter((entry) => fruitEntryQualifies(entry) && !dosMinistryReportDateKey(entry.date)).length,
    uniqueLoggedMinutesInvested: sumUnique(investedMeetings),
    uniqueLoggedMinutesReceived: sumUnique(receivedMeetings),
    unlinkedMeetings,
  };

  return {
    fruitRows,
    investedRows,
    meetings,
    period,
    receivedRows,
    relationshipRows,
    rows: dosMinistrySortRows(rows, dosMinistryReportDefaultSort),
    totals,
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

function fruitTags(entry: DosMinistryFruitEntry) {
  return Array.from(new Set(entry.tags.map((tag) => tag.trim()).filter(Boolean)));
}

function fruitText(entry: DosMinistryFruitEntry) {
  const tags = fruitTags(entry);
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

/* One short outcome for the table cell. Tags stay in the detail. The words
   come from the entry's own type, so a review reads as a review and a
   completed session as a session: shortening never turns feedback or
   activity into Fruit. */
function fruitSummary(entry: DosMinistryFruitEntry) {
  const tags = fruitTags(entry);
  const label = entry.label.trim();

  switch (entry.source) {
    case "journey_progress":
      return label || "Session completed";
    case "review":
      return label || "Review submitted";
    case "testimony":
      return "Testimony shared";
    case "fruit_story":
      return tags[0] ?? "Fruit story recorded";
    default:
      return label || tags[0] || "Fruit recorded";
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
        open: meeting ? { id: meeting.id, kind: meeting.source === "discipleship" ? "discipleship_meeting" : "meeting" } : null,
        personId: named?.id ?? viaMeeting?.id ?? null,
        personName: named?.name ?? viaMeeting?.name ?? "Not linked",
        personSource: named ? "record" : viaMeeting ? "meeting" : "none",
        relatedLabel: meeting
          ? `${meeting.source === "discipleship" ? "Discipleship" : dosMinistryMeetingLabel(meeting)} meeting${meetingDate ? ` · ${formatDosMinistryDate(meetingDate, input.now)}` : ""}`
          : entry.source === "journey_progress" && entry.resourceTitle
            ? entry.resourceTitle
            : "Not linked",
        source: entry.source,
        sourceLabel: dosMinistryFruitSourceLabels[entry.source],
        summary: fruitSummary(entry),
        tags: fruitTags(entry),
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

import type { DosAppAccountabilityCheckIn, DosAppAccountabilitySchedule, DosAppFruit, DosAppFruitEvent, DosAppGroup, DosAppGuidedResourceProgress, DosAppMeeting, DosAppParticipantReview, DosAppParticipantTestimony, DosAppPerson, DosAppUserMentorMeeting, DosAppUserMentorRelationship } from "./missionary-app";

/* USA-265: the Person a My Record discipleship meeting belongs to. The
   meeting's own stored link, else its saved relationship's; never a name
   match. */
export function dosDiscipleshipMeetingPersonId(
  meeting: Pick<DosAppUserMentorMeeting, "fieldPersonId" | "relationshipId">,
  relationships: ReadonlyArray<Pick<DosAppUserMentorRelationship, "fieldPersonId" | "id">>,
) {
  if (meeting.fieldPersonId) {
    return meeting.fieldPersonId;
  }

  return meeting.relationshipId ? relationships.find((relationship) => relationship.id === meeting.relationshipId)?.fieldPersonId ?? null : null;
}

/* A discipleship meeting enters the report as logged time invested in the
   missionary: the form records that direction. Only the date, duration and
   Person link are read; notes never enter. */
export function dosMinistryDiscipleshipMeetings(
  meetings: ReadonlyArray<DosAppUserMentorMeeting>,
  relationships: ReadonlyArray<Pick<DosAppUserMentorRelationship, "fieldPersonId" | "id">>,
): DosMinistryReportMeeting[] {
  return meetings.map((meeting) => {
    const personId = dosDiscipleshipMeetingPersonId(meeting, relationships);

    return {
      date: meeting.meetingDate,
      durationMinutes: meeting.durationMinutes,
      fieldPersonIds: personId ? [personId] : [],
      id: meeting.id,
      meetingStatus: "logged",
      scheduledEndAt: null,
      scheduledStartAt: null,
      source: "discipleship",
      tableRole: "being_mentored",
      tableRoleRecorded: true,
      type: "discipleship",
    };
  });
}

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
    /* An imported feedback form (a Planning Center reflection, USA-264) is
       Feedback, not Fruit: it records no rating or outcome the person chose,
       so existing is not evidence of anything. Only native reviews qualify. */
    ...participantReviews.filter((review) => !review.legacyForm).map((review): DosMinistryFruitEntry => ({
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

/* USA-271: group gatherings narrowed to what the report reads, the
   gathering's date and who was recorded present. Notes, prayer, and
   follow-up never enter. */
/* A gathering's logged duration is the one its record stores: the start and
   end the leader saved when recording it. Anything else is missing, never
   zero, and never estimated. */
export function dosGatheringMinutes(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) {
    return null;
  }

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  return Number.isFinite(start) && Number.isFinite(end) && end > start ? Math.round((end - start) / 60_000) : null;
}

export function dosMinistryGatheringsFromAppData(groups: DosAppGroup[]): DosMinistryReportGathering[] {
  return groups.flatMap((group) => group.gatherings.map((gathering) => ({
    attendeePersonIds: gathering.attendance.filter((row) => row.status === "present" || row.status === "guest").map((row) => row.personId),
    date: gathering.completedAt ?? gathering.startsAt,
    durationMinutes: dosGatheringMinutes(gathering.startsAt, gathering.endsAt),
    linkedMeetingId: gathering.linkedTableEventId,
    groupId: group.id,
    groupName: group.name,
    id: gathering.id,
    status: gathering.status,
  })));
}

export function dosMinistryReportInputFromAppData({
  accountabilityCheckIns,
  accountabilitySchedules,
  disciplingMe,
  discipleshipMeetings,
  downstream,
  downstreamReadPersonIds,
  fruit,
  gatherings,
  linkedPersonIds,
  meetings,
  multiplication,
  people,
}: {
  accountabilityCheckIns: DosAppAccountabilityCheckIn[];
  accountabilitySchedules: DosAppAccountabilitySchedule[];
  disciplingMe: DosAppUserMentorRelationship[];
  /* My Record discipleship meetings (USA-265). */
  discipleshipMeetings?: DosAppUserMentorMeeting[];
  downstream?: DosResolvedDownstreamRelationship[];
  downstreamReadPersonIds?: string[];
  fruit?: DosMinistryFruitEntry[];
  gatherings?: DosMinistryReportGathering[];
  linkedPersonIds?: string[];
  multiplication?: Record<string, DosMinistryMultiplicationInput>;
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
}): Omit<DosMinistryReportInput, "now" | "period" | "range"> {
  return {
    downstreamReadPersonIds: downstreamReadPersonIds ?? [],
    fruit: fruit ?? [],
    gatherings: gatherings ?? [],
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
    multiplication,
    meetings: [
      ...meetings.map((meeting): DosMinistryReportMeeting => ({
        conversationFlowKey: meeting.conversationFlowKey,
        date: meeting.date,
        /* Read from the meeting's own recorded length first. A meeting whose
           start time is unknown still has a duration, and it must count for
           exactly the minutes it counted for when that start was a synthetic
           noon -- separating the two never moves a report total. */
        durationMinutes: meeting.durationMinutes,
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
      ...dosMinistryDiscipleshipMeetings(discipleshipMeetings ?? [], disciplingMe),
    ],
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
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
