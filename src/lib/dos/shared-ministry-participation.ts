/* USA-276 — one canonical meeting, surfaced from more than one perspective.
 *
 * The reported fault: Ryan logs one meeting with Samuel and Skylar and adds
 * Brooke under More people → Ministry Team. The meeting saves correctly and
 * Samuel and Skylar both show it. Brooke's People record still reads "Nothing
 * logged yet" and her Timeline shows nothing.
 *
 * Nothing is lost on the way in. `ministry_event_people` already records her
 * with `role = 'ministry_team'`, and the loader already hands every meeting its
 * `ministryTeam` array. The gap is entirely on the way out: every person-scoped
 * read in DOS filters on `meeting.fieldPersonIds`, and that array is built from
 * `role = 'participant'` rows alone. A ministry-team row is therefore invisible
 * to the Person record, to the Person Timeline and to My Record, whichever way
 * it was stored.
 *
 * So this module resolves ministry-team participation to Person ids and nothing
 * else. It reads; it never writes. No row is created, no meeting is duplicated,
 * and no total changes: a surface that displays a meeting does not count it.
 *
 * Two identities reach the same person
 * ------------------------------------
 * The Ministry Team picker offers a household roster member (a
 * `missionary_team_members` row, badged "Team") and a field person (a
 * `missionary_field_people` row, badged "Field"). Brooke exists as both, and
 * picking the "Team" row stores `team_member_id` with `field_person_id` null.
 * There is no foreign key between those two tables: `syncHouseholdTeamMembersAsPeople`
 * and migration 20260706013016 reconcile them by normalized display name, so
 * that is the reconciliation this module reuses rather than inventing a second
 * one or adding a column.
 *
 * Name matching is only ever allowed to be right. A team member resolves to a
 * Person when exactly ONE living person in the workspace normalizes to the same
 * name; two matches, or none, resolve to nothing at all. Putting somebody
 * else's meeting on a person's record is far worse than leaving this one off,
 * so an ambiguous name is dropped rather than guessed at.
 *
 * Supporting attendees are deliberately NOT included. That is the existing
 * product model, stated on the table itself: "Participants receive person
 * activity and fruit; supporting attendees do not" (`ministry_event_people`,
 * migration 20260625175625). A supporting attendee is present at a meeting;
 * a ministry-team member is doing the ministry. Only the second is activity.
 */
import { dateSortValue } from "./display-dates";

/* The narrowest shape of each record this needs. Narrowing is deliberate:
   notes, reflections and contact details never enter this module. */
export type SharedMinistryEventPerson = {
  fieldPersonId: string | null;
  role: string;
  teamMemberId: string | null;
};

export type SharedMinistryMeeting = {
  date: string | null;
  fieldPersonIds: string[];
  id: string;
  meetingStatus: "canceled" | "logged" | "scheduled";
  ministryTeam: ReadonlyArray<SharedMinistryEventPerson>;
};

export type SharedMinistryHouseholdMember = {
  displayName: string;
  id: string;
  status: string;
};

export type SharedMinistryPerson = {
  id: string;
  name: string;
  status: string;
};

/* The same normalization migration 20260706013016 used to pair roster members
   with people: lowercase, and every non-alphanumeric character removed, so
   "Brooke Fox", "brooke  fox" and "Brooke-Fox" are one name. */
export function dosSharedMinistryNameKey(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isLiving(status: string | null | undefined) {
  return !["archived", "deleted", "inactive"].includes((status ?? "").trim().toLowerCase());
}

/* Household roster member id → Person id, for the members this workspace can
   pair unambiguously. A name shared by two living people is left out: see the
   module note on why an ambiguous match is dropped rather than guessed. */
export function dosSharedMinistryTeamMemberPersonIds(
  householdMembers: ReadonlyArray<SharedMinistryHouseholdMember>,
  people: ReadonlyArray<SharedMinistryPerson>,
): Map<string, string> {
  const peopleByNameKey = new Map<string, string[]>();

  people.filter((person) => isLiving(person.status)).forEach((person) => {
    const key = dosSharedMinistryNameKey(person.name);

    if (!key) {
      return;
    }

    peopleByNameKey.set(key, [...(peopleByNameKey.get(key) ?? []), person.id]);
  });

  const resolved = new Map<string, string>();

  householdMembers.filter((member) => isLiving(member.status)).forEach((member) => {
    const matches = peopleByNameKey.get(dosSharedMinistryNameKey(member.displayName)) ?? [];

    if (matches.length === 1) {
      resolved.set(member.id, matches[0]);
    }
  });

  return resolved;
}

/* The Person ids on a meeting's ministry team.
 *
 * Anyone who is already a participant is excluded: the meeting is on their
 * record already, through the path it has always taken, and listing it twice
 * would both duplicate their Timeline row and misdescribe their role. That
 * exclusion is what keeps Samuel and Skylar's behavior byte-for-byte unchanged
 * when one of them is also named on the team. */
export function dosSharedMinistryPersonIdsForMeeting(
  meeting: SharedMinistryMeeting,
  teamMemberPersonIds: ReadonlyMap<string, string>,
): string[] {
  const participantIds = new Set(meeting.fieldPersonIds);
  const ministryIds = new Set<string>();

  meeting.ministryTeam.forEach((eventPerson) => {
    if (eventPerson.role !== "ministry_team") {
      return;
    }

    const personId = eventPerson.fieldPersonId
      ?? (eventPerson.teamMemberId ? teamMemberPersonIds.get(eventPerson.teamMemberId) ?? null : null);

    if (personId && !participantIds.has(personId)) {
      ministryIds.add(personId);
    }
  });

  return Array.from(ministryIds);
}

/* True when this person ministered at this meeting without being one of the
   people it was with. */
export function dosPersonSharedMinistryParticipation(
  meeting: SharedMinistryMeeting,
  personId: string,
  teamMemberPersonIds: ReadonlyMap<string, string>,
) {
  return dosSharedMinistryPersonIdsForMeeting(meeting, teamMemberPersonIds).includes(personId);
}

/* Every logged meeting this person ministered at, most recent first. Ties break
   on id so the same order renders every time.

   Scheduled and canceled meetings are excluded for the same reason the Person
   record excludes them from Last meeting: an unlogged meeting is not activity. */
export function dosPersonSharedMinistryMeetings<MeetingT extends SharedMinistryMeeting>(
  meetings: ReadonlyArray<MeetingT>,
  personId: string,
  teamMemberPersonIds: ReadonlyMap<string, string>,
): MeetingT[] {
  return meetings
    .filter((meeting) => meeting.meetingStatus === "logged"
      && dosPersonSharedMinistryParticipation(meeting, personId, teamMemberPersonIds))
    .sort((first, second) => dateSortValue(second.date) - dateSortValue(first.date)
      || second.id.localeCompare(first.id));
}

/* The label DOS already uses for this role. Meeting detail reads
   "With {names}" for the ministry team, so a shared record says the same thing
   the other way round: this person ministered alongside the people the meeting
   was with. It never says "discipled" or "ministered to", which would invert
   who was serving whom. */
export function dosSharedMinistryTitle(participantNames: ReadonlyArray<string>) {
  const named = participantNames.map((name) => name.trim()).filter(Boolean);

  if (!named.length) {
    return "Ministered with the team";
  }

  if (named.length === 1) {
    return `Ministered with ${named[0]}`;
  }

  if (named.length === 2) {
    return `Ministered with ${named[0]} and ${named[1]}`;
  }

  return `Ministered with ${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}
