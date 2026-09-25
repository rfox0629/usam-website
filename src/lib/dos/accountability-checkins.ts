/* USA-282: one check-in list, one set of eligibility rules.
 *
 * Home's preview, the Home notification, and the full list under People all
 * read this module. That is the whole point: before it, Home counted its own
 * rows one way and there was no full list to disagree with, so "3 due" and
 * "14 more on the people themselves" were the only numbers anyone could see.
 * A count that appears in three places has to be computed in one.
 *
 * What is eligible is stated once, here:
 *
 *   - an ACTIVE accountability schedule (a rhythm the leader set, or a growth
 *     follow-up DOS generated for a Journey assignment), and
 *   - an ACTIVE one-time goal (a commitment), except the shadow commitment a
 *     Journey assignment carries -- that is the participant's own work and
 *     already reads as a Journey, so counting it here would invent a second
 *     manual confirmation task for the leader.
 *
 * Paused, cancelled and completed records are not follow-ups: they are
 * history, and history lives on the Person record. "All" therefore means
 * every OPEN follow-up, not every row ever written -- otherwise the list the
 * leader has to work would be buried under years of finished check-ins.
 *
 * Rows only ever exist for a person in the list the caller passes, which is
 * the workspace's people. Permission scoping is the caller's, unchanged.
 *
 * Deliberately pure: no clock, no locale, no React. The day key and the date
 * formatter are injected so Home can hand it the server render's instant
 * (USA-257 §9) and the list reads exactly the same dates.
 */

import { accountabilityOccurrenceOnOrBefore } from "./commitments-accountability";
import {
  accountabilityFrequencyLabels,
  accountabilityProgressKind,
  accountabilityProgressLabel,
  type AccountabilityCommitmentInput,
  type AccountabilityProgressKind,
  type AccountabilityScheduleInput,
} from "./accountability-presentation";
import { resourceAssignmentFollowUpTopic, type DosResourceAssignmentFollowUpKind } from "./resource-assignments";

/* The full list's filters, which are now the same three groups Home shows,
   plus everything. They are stated in the person's terms ("past due"), not
   the item's ("overdue"), because the list is a list of people. */
export const accountabilityCheckInFilters = ["due_today", "past_due", "coming_up", "all"] as const;

export type AccountabilityCheckInFilter = typeof accountabilityCheckInFilters[number];

export function isAccountabilityCheckInFilter(value: string): value is AccountabilityCheckInFilter {
  return accountabilityCheckInFilters.includes(value as AccountabilityCheckInFilter);
}

/* Where a follow-up sits against today. `no_due_date` is its own bucket
   rather than a kind of upcoming: an item with no date makes no claim on any
   particular day, so it must never be counted as due. */
export type AccountabilityCheckInBucket = "due_today" | "no_due_date" | "overdue" | "upcoming";

/* What kind of follow-up this is. The distinction is preserved rather than
   flattened: a growth follow-up is written by DOS for a Journey assignment, a
   rhythm and a one-time goal are authored by the leader. They share a table;
   they are not the same thing, and relabelling all three "Accountability"
   would lose the only words that tell them apart. */
export type AccountabilityCheckInKind = "growth_follow_up" | "one_time_goal" | "rhythm";

/* The resource assignment a growth-follow-up schedule was generated for.
   Two schedules can exist per assignment -- a midpoint and a completion --
   and several assignments can exist per person, so this is exactly the
   context that tells two "Growth follow-up" rows for one person apart. */
export type AccountabilityCheckInFollowUp = {
  groupName: string | null;
  kind: DosResourceAssignmentFollowUpKind;
  resourceTitle: string | null;
};

export type AccountabilityCheckInScheduleInput = AccountabilityScheduleInput & {
  followUp?: AccountabilityCheckInFollowUp | null;
  personId: string;
};

export type AccountabilityCheckInCommitmentInput = AccountabilityCommitmentInput & {
  /* Set when a Journey assignment created this commitment to stand behind it.
     Such a commitment is not a leader follow-up. */
  linkedToResourceAssignment?: boolean;
  personId: string;
};

export type AccountabilityCheckInRow = {
  bucket: AccountabilityCheckInBucket;
  /* What distinguishes this row from another with the same topic: the
     resource and phase for a growth follow-up, the rhythm for a schedule,
     the progress for a measurable goal. Null when there is nothing to add --
     an empty line is worse than none. */
  context: string | null;
  dueDate: string | null;
  /* The due date on its own, formatted by the caller's formatter. Home shows
     the date without the word: under a "Today" or "Overdue" heading the
     status is already said once, and saying it again in every row is the
     repeated copy the section is meant to lose. */
  dueDateLabel: string | null;
  /* Unique across both storage models, which can share ids. */
  id: string;
  kind: AccountabilityCheckInKind;
  personId: string;
  personName: string;
  /* How this follow-up records progress, from the existing presenter. The
     row does not act on it -- opening the item does, and the item's own
     action is already named by it -- but it says what the row is, so a
     reader of the list data is never guessing. */
  progressKind: AccountabilityProgressKind;
  sourceId: string;
  /* "Overdue · Sep 14", "Due today", "Due Oct 3", "No due date". */
  statusLabel: string;
  topic: string;
};

export type AccountabilityCheckInCounts = {
  all: number;
  attention: number;
  upcoming: number;
};

const followUpPhaseLabels: Record<DosResourceAssignmentFollowUpKind, string> = {
  completion: "Completion",
  midpoint: "Midpoint",
};

/* One word for the thing, shared with the Journey surfaces that already name
   it, so the list never invents a second name for the same record. */
export const growthFollowUpTopic = resourceAssignmentFollowUpTopic;

const bucketRank: Record<AccountabilityCheckInBucket, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  no_due_date: 3,
};

/* Needs attention is exactly overdue plus due today. It is the number on
   Home, on the notification, and on the first filter, and it is defined in
   one place so those three can never drift apart. */
export function accountabilityCheckInNeedsAttention(row: AccountabilityCheckInRow) {
  return row.bucket === "overdue" || row.bucket === "due_today";
}

export function accountabilityCheckInStatusLabel(
  bucket: AccountabilityCheckInBucket,
  dueDate: string | null,
  formatDate: (value: string | null) => string,
) {
  if (bucket === "overdue") {
    return `Overdue · ${formatDate(dueDate)}`;
  }

  if (bucket === "due_today") {
    return "Due today";
  }

  return bucket === "upcoming" ? `Due ${formatDate(dueDate)}` : "No due date";
}

function bucketFor(dueDate: string | null, todayValue: number, dateValue: (value: string | null) => number): AccountabilityCheckInBucket {
  if (!dueDate) {
    return "no_due_date";
  }

  const value = dateValue(dueDate);

  if (value < todayValue) {
    return "overdue";
  }

  return value === todayValue ? "due_today" : "upcoming";
}

function joinContext(parts: ReadonlyArray<string | null | undefined>) {
  const context = parts.map((part) => part?.trim() ?? "").filter(Boolean).join(" · ");

  return context || null;
}

/* Every open follow-up across the workspace's people, ordered the way the
   work actually has to be done: what is already late, then what is due
   today, then what is coming, then what carries no date at all. Within a
   bucket, soonest first, then by person so the order never reshuffles
   between renders. */
export function accountabilityCheckInRows({
  commitments,
  dateValue,
  formatDate,
  personNames,
  schedules,
  today,
}: {
  commitments: ReadonlyArray<AccountabilityCheckInCommitmentInput>;
  dateValue: (value: string | null) => number;
  formatDate: (value: string | null) => string;
  /* The people the caller is allowed to show. A follow-up for someone who is
     not in it is not rendered and not counted. */
  personNames: ReadonlyMap<string, string>;
  schedules: ReadonlyArray<AccountabilityCheckInScheduleInput>;
  today: string;
}): AccountabilityCheckInRow[] {
  const todayValue = dateValue(today);

  const scheduleRows = schedules
    .filter((schedule) => schedule.status === "active")
    .filter((schedule) => personNames.has(schedule.personId))
    .map((schedule) => {
      /* One current occurrence per rhythm. A rhythm missed for weeks is one
         reminder on its latest date, not a task for every week that went by;
         the stored date is untouched until a real check-in moves it. */
      const dueDate = schedule.nextCheckIn
        ? accountabilityOccurrenceOnOrBefore(schedule.nextCheckIn, schedule.frequency, today)
        : null;
      const bucket = bucketFor(dueDate, todayValue, dateValue);
      const followUp = schedule.followUp ?? null;

      return {
        bucket,
        /* The phase rides in the TOPIC, not at the end of the context. Two
           growth follow-ups for one person differ only by phase, and a row
           truncates from the right -- with the phase last, the two rows read
           identically on a phone, which is the founder's screenshot. */
        context: followUp
          ? joinContext([
            followUp.resourceTitle ? `"${followUp.resourceTitle}"` : null,
            followUp.groupName,
          ])
          /* A one-time schedule has no rhythm to name; its date is already
             the status. */
          : schedule.frequency === "one_time"
            ? null
            : accountabilityFrequencyLabels[schedule.frequency] ?? null,
        dueDate,
        dueDateLabel: dueDate ? formatDate(dueDate) : null,
        id: `schedule-${schedule.id}`,
        kind: followUp ? ("growth_follow_up" as const) : ("rhythm" as const),
        personId: schedule.personId,
        personName: personNames.get(schedule.personId) as string,
        /* A rhythm and a growth follow-up record a check-in, always. */
        progressKind: "check_in" as const,
        sourceId: schedule.id,
        statusLabel: accountabilityCheckInStatusLabel(bucket, dueDate, formatDate),
        topic: followUp ? `${growthFollowUpTopic} · ${followUpPhaseLabels[followUp.kind]}` : schedule.title,
      };
    });

  const commitmentRows = commitments
    .filter((commitment) => commitment.status === "active")
    /* The commitment a Journey assignment created to stand behind it. The
       participant's own progress updates it from its existing source; asking
       the leader to confirm it as well would be a second task for one fact. */
    .filter((commitment) => !commitment.linkedToResourceAssignment)
    .filter((commitment) => personNames.has(commitment.personId))
    .map((commitment) => {
      const bucket = bucketFor(commitment.targetDate, todayValue, dateValue);

      return {
        bucket,
        context: accountabilityProgressLabel(commitment),
        dueDate: commitment.targetDate,
        dueDateLabel: commitment.targetDate ? formatDate(commitment.targetDate) : null,
        id: `commitment-${commitment.id}`,
        kind: "one_time_goal" as const,
        personId: commitment.personId,
        personName: personNames.get(commitment.personId) as string,
        progressKind: accountabilityProgressKind(commitment),
        sourceId: commitment.id,
        statusLabel: accountabilityCheckInStatusLabel(bucket, commitment.targetDate, formatDate),
        topic: commitment.title,
      };
    });

  return [...scheduleRows, ...commitmentRows].sort((first, second) => {
    const rank = bucketRank[first.bucket] - bucketRank[second.bucket];

    if (rank !== 0) {
      return rank;
    }

    if (first.dueDate && second.dueDate) {
      const byDate = dateValue(first.dueDate) - dateValue(second.dueDate);

      if (byDate !== 0) {
        return byDate;
      }
    }

    return first.personName.localeCompare(second.personName) || first.topic.localeCompare(second.topic);
  });
}

/* Home's sections. Today leads: it is the day's own work and there is
   little of it, so putting a long overdue backlog above it would bury the
   one thing that has to happen today. Overdue follows, in the same order the
   full list uses. Neither section invents an order of its own. */
export function accountabilityCheckInHomeSections(rows: ReadonlyArray<AccountabilityCheckInRow>) {
  return {
    overdue: rows.filter((row) => row.bucket === "overdue"),
    today: rows.filter((row) => row.bucket === "due_today"),
  };
}

/* What the item's own action is called, from how it records progress. The
   same label appears on the row and inside the item, so the two never
   disagree about what pressing it does. */
export function accountabilityCheckInActionLabel(progressKind: AccountabilityProgressKind) {
  if (progressKind === "people") {
    return "Add person";
  }

  return progressKind === "count" ? "Add progress" : "Check in";
}

export function accountabilityCheckInCounts(rows: ReadonlyArray<AccountabilityCheckInRow>): AccountabilityCheckInCounts {
  return {
    all: rows.length,
    attention: rows.filter(accountabilityCheckInNeedsAttention).length,
    upcoming: rows.filter((row) => row.bucket === "upcoming").length,
  };
}

/* ---------------------------------------------------------------------------
   One placement per person (USA-282 follow-up).

   Home listed ITEMS, so a person with a weekly rhythm and two Journey
   milestones took three rows and read as a duplicate -- and hiding the topic
   (which Home must, in public) left nothing to tell those rows apart. Home
   lists PEOPLE now. The items still exist, unmerged and untouched; they are
   revealed by opening the person, which is a deliberate act.

   Grouping is by the canonical person id, never by name, so two people who
   share a name stay two people. */

export type AccountabilityPersonStatus = "coming_up" | "due_today" | "past_due";

/* The window Home calls "coming up". It is the one the retired Accountability
   card already used for its third box ("7 DAYS"), kept so the meaning of
   upcoming does not quietly change; anything later is still reachable in the
   full list. */
export const accountabilityUpcomingWindowDays = 7;

export type AccountabilityPerson = {
  /* How many of their items are due TODAY, and how that reads. Today's
     notification counts this, never the whole list: a person with one due
     today and two past due is one check-in today, and saying "3 check-ins"
     on a line about today is a number that describes something else. */
  dueTodayCount: number;
  dueTodayCountLabel: string | null;
  /* Whether anything of theirs is due today, regardless of the status the
     person carries. Someone with a past-due rhythm AND a check-in due today
     reads as Past due here, but today's agenda still has to include them. */
  hasDueToday: boolean;
  /* Every open item for this person, in the list's order. */
  items: AccountabilityCheckInRow[];
  /* "3 check-ins" -- the unit is always said, because a bare number beside a
     person reads as their count of anything. Null for a single item, where
     the number would add nothing. */
  itemCountLabel: string | null;
  personId: string;
  personName: string;
  /* What the status is measured from: the oldest outstanding date when past
     due, today when due today, the earliest scheduled date when coming up.
     Null only when nothing they have carries a date. */
  statusDate: string | null;
  statusDateLabel: string | null;
  status: AccountabilityPersonStatus | null;
  statusLabel: string;
};

export const accountabilityPersonStatusLabels: Record<AccountabilityPersonStatus, string> = {
  coming_up: "Coming up",
  due_today: "Due today",
  past_due: "Past due",
};

/* Display order, which is not the order of precedence. A person is CLASSIFIED
   by their worst item (past due beats due today), but the sections READ with
   today first: today is the day's own work and it is small, and an overdue
   backlog above it would bury it. */
export const accountabilityPersonStatusOrder: AccountabilityPersonStatus[] = ["due_today", "past_due", "coming_up"];

function earliest(values: ReadonlyArray<string>, dateValue: (value: string | null) => number) {
  return values.length
    ? values.reduce((first, candidate) => (dateValue(candidate) < dateValue(first) ? candidate : first))
    : null;
}

export function accountabilityCheckInPeople({
  dateValue,
  formatDate,
  rows,
  today,
  upcomingWindowDays = accountabilityUpcomingWindowDays,
}: {
  dateValue: (value: string | null) => number;
  formatDate: (value: string | null) => string;
  rows: ReadonlyArray<AccountabilityCheckInRow>;
  today: string;
  /* Home keeps "coming up" inside the window; the full list passes Infinity
     so nothing scheduled later can hide from every surface. */
  upcomingWindowDays?: number;
}): AccountabilityPerson[] {
  const byPerson = new Map<string, AccountabilityCheckInRow[]>();

  for (const row of rows) {
    const existing = byPerson.get(row.personId);

    if (existing) {
      existing.push(row);
    } else {
      byPerson.set(row.personId, [row]);
    }
  }

  const todayValue = dateValue(today);
  const windowLimit = Number.isFinite(upcomingWindowDays)
    ? todayValue + upcomingWindowDays * 86_400_000
    : Number.POSITIVE_INFINITY;

  const people = Array.from(byPerson.entries()).map(([personId, items]) => {
    const overdue = items.filter((item) => item.bucket === "overdue").map((item) => item.dueDate as string);
    const dueToday = items.filter((item) => item.bucket === "due_today");
    const upcoming = items
      .filter((item) => item.bucket === "upcoming" && dateValue(item.dueDate) <= windowLimit)
      .map((item) => item.dueDate as string);

    const status: AccountabilityPersonStatus | null = overdue.length
      ? "past_due"
      : dueToday.length
        ? "due_today"
        : upcoming.length
          ? "coming_up"
          : null;
    const statusDate = status === "past_due"
      ? earliest(overdue, dateValue)
      : status === "due_today"
        ? today
        : status === "coming_up"
          ? earliest(upcoming, dateValue)
          : null;

    return {
      dueTodayCount: dueToday.length,
      dueTodayCountLabel: dueToday.length > 1 ? `${dueToday.length} check-ins` : null,
      hasDueToday: dueToday.length > 0,
      items,
      itemCountLabel: items.length > 1 ? `${items.length} check-ins` : null,
      personId,
      personName: items[0].personName,
      status,
      statusDate,
      statusDateLabel: statusDate ? formatDate(statusDate) : null,
      statusLabel: status ? accountabilityPersonStatusLabels[status] : "No date",
    };
  });

  return people.sort((first, second) => {
    const rank = accountabilityPersonStatusOrder.indexOf(first.status as AccountabilityPersonStatus)
      - accountabilityPersonStatusOrder.indexOf(second.status as AccountabilityPersonStatus);

    if (rank !== 0) {
      /* A person with no dated item at all sorts last rather than first. */
      return first.status === null ? 1 : second.status === null ? -1 : rank;
    }

    if (first.statusDate && second.statusDate) {
      const byDate = dateValue(first.statusDate) - dateValue(second.statusDate);

      if (byDate !== 0) {
        return byDate;
      }
    }

    return first.personName.localeCompare(second.personName) || first.personId.localeCompare(second.personId);
  });
}

/* Counts of PEOPLE, for the section headings. The items have their own count,
   on the person's own row, where the unit is said out loud. */
export function accountabilityPeopleCounts(people: ReadonlyArray<AccountabilityPerson>) {
  return {
    coming_up: people.filter((person) => person.status === "coming_up").length,
    due_today: people.filter((person) => person.status === "due_today").length,
    past_due: people.filter((person) => person.status === "past_due").length,
    total: people.length,
  };
}

export function accountabilityPeopleForStatus(
  people: ReadonlyArray<AccountabilityPerson>,
  status: AccountabilityPersonStatus,
) {
  return people.filter((person) => person.status === status);
}

/* Today's agenda asks a different question from Home's Accountability list:
   not "who is behind" but "who is due today". Someone classified Past due by
   an older item still belongs here when something of theirs is due today. */
export function accountabilityPeopleDueToday(people: ReadonlyArray<AccountabilityPerson>) {
  return people.filter((person) => person.hasDueToday);
}

export function accountabilityPeopleForFilter(
  people: ReadonlyArray<AccountabilityPerson>,
  filter: AccountabilityCheckInFilter,
) {
  if (filter === "all") {
    return [...people];
  }

  return accountabilityPeopleForStatus(people, filter);
}

/* "3 people · 7 check-ins" -- the list says both, because they are different
   numbers and a leader plans by the first and works through the second. */
export function accountabilityPeopleSummaryLabel(people: ReadonlyArray<AccountabilityPerson>) {
  const items = people.reduce((total, person) => total + person.items.length, 0);

  return [
    `${people.length} ${people.length === 1 ? "person" : "people"}`,
    `${items} ${items === 1 ? "check-in" : "check-ins"}`,
  ].join(" · ");
}
