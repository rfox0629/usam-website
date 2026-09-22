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

import {
  accountabilityFrequencyLabels,
  accountabilityProgressKind,
  accountabilityProgressLabel,
  type AccountabilityCommitmentInput,
  type AccountabilityProgressKind,
  type AccountabilityScheduleInput,
} from "./accountability-presentation";
import { resourceAssignmentFollowUpTopic, type DosResourceAssignmentFollowUpKind } from "./resource-assignments";

export const accountabilityCheckInFilters = ["attention", "upcoming", "all"] as const;

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
      const bucket = bucketFor(schedule.nextCheckIn, todayValue, dateValue);
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
        dueDate: schedule.nextCheckIn,
        id: `schedule-${schedule.id}`,
        kind: followUp ? ("growth_follow_up" as const) : ("rhythm" as const),
        personId: schedule.personId,
        personName: personNames.get(schedule.personId) as string,
        /* A rhythm and a growth follow-up record a check-in, always. */
        progressKind: "check_in" as const,
        sourceId: schedule.id,
        statusLabel: accountabilityCheckInStatusLabel(bucket, schedule.nextCheckIn, formatDate),
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

export function accountabilityCheckInCounts(rows: ReadonlyArray<AccountabilityCheckInRow>): AccountabilityCheckInCounts {
  return {
    all: rows.length,
    attention: rows.filter(accountabilityCheckInNeedsAttention).length,
    upcoming: rows.filter((row) => row.bucket === "upcoming").length,
  };
}

/* Needs attention is overdue and due today. Upcoming is what is scheduled
   ahead. All is every open follow-up, which is those two plus the ones with
   no date -- so nothing the leader owns can hide from every filter. */
export function accountabilityCheckInRowsForFilter(
  rows: ReadonlyArray<AccountabilityCheckInRow>,
  filter: AccountabilityCheckInFilter,
) {
  if (filter === "attention") {
    return rows.filter(accountabilityCheckInNeedsAttention);
  }

  if (filter === "upcoming") {
    return rows.filter((row) => row.bucket === "upcoming");
  }

  return [...rows];
}

/* Home shows the few that need attention and hands off. Overdue leads
   because the ordering above already puts it there; this only decides how
   many fit. */
export function accountabilityCheckInPreviewRows(rows: ReadonlyArray<AccountabilityCheckInRow>, limit = 3) {
  return rows.filter(accountabilityCheckInNeedsAttention).slice(0, limit);
}

/* "3 need attention" / "1 needs attention". Shown once, on Home, so the
   notification badge and the preview heading read the same. */
export function accountabilityCheckInAttentionLabel(count: number) {
  return `${count} ${count === 1 ? "needs" : "need"} attention`;
}

