/* USA-272 follow-up — My Record's Last meeting / Upcoming meeting pair.
 *
 * The reported fault: Ryan's Meetings calendar showed a meeting with Dirk
 * Bond on 16 September; My Record's Upcoming meeting card said "Nothing
 * scheduled." The two were reading different things. The card read
 * `follow_up_date` on a PAST `dos_user_mentor_meetings` row -- a note the
 * discipleship log form lets you leave, not a meeting -- while the calendar
 * reads scheduled `missionary_meetings` rows. A meeting scheduled on the
 * calendar therefore never reached the card, however correctly it was saved.
 *
 * What this module decides, and nothing else:
 *
 *   1. WHO is discipling the account holder. The Person's structured role is
 *      canonical (USA-251); an active My Record relationship is the fallback
 *      when the Person carries no direction. That is exactly the resolution
 *      the Master Ministry Report already uses, so the two cannot drift.
 *      People the account holder disciples are not included, and a name is
 *      never matched -- only Person ids and relationship ids.
 *   2. WHICH scheduled meeting is next. The same rows the Meetings calendar
 *      reads, in the same shape, filtered to those people.
 *   3. WHICH meeting was last, preserving the personal discipleship logs.
 *
 * It reads, and it never writes. No row is created, no event is generated,
 * and the Reports totals are untouched: a card that displays a meeting does
 * not count it.
 */
import { dateSortValue, isUpcomingDate } from "./display-dates";
import { dosMinistryDirectionForPerson } from "./ministry-report";

/* The narrowest shape of each record this needs. Narrowing is deliberate:
   notes, reflections and contact details never enter this module. */
export type MyRecordDisciplerPerson = {
  id: string;
  name: string;
  /* The canonical, structured direction (USA-244). */
  roleInMyLife: string;
  /* "archived" rows are excluded; anything else is a living record. */
  status: string;
};

export type MyRecordDisciplerRelationship = {
  fieldPersonId: string | null;
  id: string;
  mentorName: string;
  status: "active" | "archived";
};

export type MyRecordCalendarMeeting = {
  date: string | null;
  fieldPersonIds: string[];
  id: string;
  meetingStatus: "canceled" | "logged" | "scheduled";
  scheduledStartAt: string | null;
};

export type MyRecordDiscipleshipLog = {
  durationMinutes: number;
  id: string;
  meetingDate: string;
  mentorName: string;
};

/* The instant a scheduled meeting sits at. `scheduled_start_at` is the
   calendar's own field; `date` is the fallback for a row saved before it
   existed, and is what the Meetings calendar falls back to as well. */
export function dosMyRecordMeetingStartAt(meeting: MyRecordCalendarMeeting) {
  return meeting.scheduledStartAt ?? meeting.date;
}

/* Every Person discipling the account holder, by id.

   An archived Person is excluded, as it is in the report. A relationship
   whose `field_person_id` points at a Person this workspace did not load is
   still honoured: the id is a real link, and dropping it would silently hide
   a meeting. A relationship with NO `field_person_id` links to nobody, and
   this module will not guess one from `mentor_name`; see
   `dosMyRecordUnlinkedDisciplerRelationships`. */
export function dosMyRecordDisciplerPersonIds(
  people: ReadonlyArray<MyRecordDisciplerPerson>,
  relationships: ReadonlyArray<MyRecordDisciplerRelationship>,
): string[] {
  const living = people.filter((person) => person.status !== "archived");
  const knownIds = new Set(people.map((person) => person.id));
  const disciplerIds = new Set<string>();

  living.forEach((person) => {
    if (dosMinistryDirectionForPerson(person, [...relationships]).direction === "discipling_me") {
      disciplerIds.add(person.id);
    }
  });

  relationships.forEach((relationship) => {
    if (relationship.status === "active" && relationship.fieldPersonId && !knownIds.has(relationship.fieldPersonId)) {
      disciplerIds.add(relationship.fieldPersonId);
    }
  });

  return Array.from(disciplerIds);
}

/* Active relationships that carry no Person link. Nothing on the calendar can
   be attributed to them without matching a name, which this module refuses to
   do, so they are reported rather than guessed at: linking the relationship
   to a Person is the account holder's decision, not this code's. */
export function dosMyRecordUnlinkedDisciplerRelationships(
  relationships: ReadonlyArray<MyRecordDisciplerRelationship>,
): MyRecordDisciplerRelationship[] {
  return relationships.filter((relationship) => relationship.status === "active" && !relationship.fieldPersonId);
}

function disciplersOnMeeting(meeting: MyRecordCalendarMeeting, disciplerPersonIds: ReadonlyArray<string>) {
  const disciplers = new Set(disciplerPersonIds);

  return Array.from(new Set(meeting.fieldPersonIds)).filter((personId) => disciplers.has(personId));
}

/* The people on a meeting who are discipling the account holder. A meeting
   with nobody linked, or with only people the account holder disciples,
   returns an empty list and so never qualifies. */
export function dosMyRecordMeetingDisciplerIds(
  meeting: MyRecordCalendarMeeting,
  disciplerPersonIds: ReadonlyArray<string>,
) {
  return disciplersOnMeeting(meeting, disciplerPersonIds);
}

/* The next scheduled meeting with someone discipling the account holder --
   the same rows, status and time field the Meetings calendar reads.

   Only `meeting_status = 'scheduled'` qualifies, so a canceled meeting and an
   already-logged one are both out. "Upcoming" is day-granular in the DOS
   display time zone, so a meeting later TODAY is still upcoming; that is the
   Sep 16 case, and the same rule Person's Next meeting card uses.

   A repeating rhythm is stored as one scheduled row per occurrence, so the
   earliest qualifying row is the next occurrence. Ties break on id so the
   same meeting is chosen on every render. */
export function dosMyRecordNextScheduledMeeting<MeetingT extends MyRecordCalendarMeeting>(
  meetings: ReadonlyArray<MeetingT>,
  disciplerPersonIds: ReadonlyArray<string>,
  now: Date = new Date(),
): MeetingT | null {
  return meetings
    .filter((meeting) => meeting.meetingStatus === "scheduled"
      && disciplersOnMeeting(meeting, disciplerPersonIds).length > 0
      && isUpcomingDate(dosMyRecordMeetingStartAt(meeting), now))
    .sort((first, second) => dateSortValue(dosMyRecordMeetingStartAt(first)) - dateSortValue(dosMyRecordMeetingStartAt(second))
      || first.id.localeCompare(second.id))[0] ?? null;
}

export type MyRecordLastMeeting<LogT, MeetingT> =
  | { date: string; kind: "discipleship_log"; log: LogT }
  | { date: string; kind: "calendar_meeting"; meeting: MeetingT };

/* The most recent meeting with someone discipling the account holder.

   Two sources, because the account holder records these two ways and both are
   real: a personal discipleship log (`dos_user_mentor_meetings`, whose form
   records the direction, so every one of them qualifies and none is dropped),
   and a logged calendar meeting with one of those people. Nothing is merged
   or de-duplicated across the two -- the card shows ONE record, the one that
   happened most recently, and opens that record. A tie goes to the personal
   log, which is what the card showed before this change. */
export function dosMyRecordLastMeeting<LogT extends MyRecordDiscipleshipLog, MeetingT extends MyRecordCalendarMeeting>(
  logs: ReadonlyArray<LogT>,
  meetings: ReadonlyArray<MeetingT>,
  disciplerPersonIds: ReadonlyArray<string>,
): MyRecordLastMeeting<LogT, MeetingT> | null {
  const lastLog = [...logs]
    .sort((first, second) => dateSortValue(second.meetingDate) - dateSortValue(first.meetingDate)
      || second.id.localeCompare(first.id))[0] ?? null;
  const lastMeeting = meetings
    .filter((meeting) => meeting.meetingStatus === "logged" && disciplersOnMeeting(meeting, disciplerPersonIds).length > 0)
    .sort((first, second) => dateSortValue(second.date) - dateSortValue(first.date)
      || second.id.localeCompare(first.id))[0] ?? null;

  if (lastLog && lastMeeting) {
    return dateSortValue(lastMeeting.date) > dateSortValue(lastLog.meetingDate)
      ? { date: lastMeeting.date ?? "", kind: "calendar_meeting", meeting: lastMeeting }
      : { date: lastLog.meetingDate, kind: "discipleship_log", log: lastLog };
  }

  if (lastLog) {
    return { date: lastLog.meetingDate, kind: "discipleship_log", log: lastLog };
  }

  return lastMeeting ? { date: lastMeeting.date ?? "", kind: "calendar_meeting", meeting: lastMeeting } : null;
}
