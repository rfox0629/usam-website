/* One Accountability experience, assembled from two canonical destinations.
 *
 * Storage is split by what the user chose, not by which screen they used:
 *   Recurring -> dos_accountability_schedules, a rhythm
 *   One-time  -> dos_person_commitments, a goal, the only side that carries a
 *                target and progress updates
 *
 * The Person never sees that split. This module turns both models into one
 * ordered list of rows with one metadata line each, so the words "commitment"
 * and "schedule" stay out of the interface entirely.
 *
 * It is deliberately pure: dates are formatted by the caller's timezone-aware
 * formatter so this stays testable without a clock or a locale.
 */

import type { DosAccountabilityFrequency } from "./commitments-accountability";

export const accountabilityFrequencyLabels: Record<DosAccountabilityFrequency, string> = {
  every_two_weeks: "Every two weeks",
  monthly: "Monthly",
  one_time: "One-time date",
  weekly: "Weekly",
};

export type AccountabilityRowKind = "one_time" | "recurring";

export type AccountabilityProgressSubject = {
  subjectPersonId?: string | null;
  subjectPersonName?: string | null;
};

export type AccountabilityScheduleInput = {
  frequency: DosAccountabilityFrequency;
  id: string;
  nextCheckIn: string | null;
  status: string;
  title: string;
};

export type AccountabilityCommitmentInput = {
  id: string;
  status: string;
  targetCount?: number | null;
  targetDate: string | null;
  title: string;
  updates?: ReadonlyArray<AccountabilityProgressSubject> | null;
};

export type UnifiedAccountabilityRow = {
  /* Stable across renders and unique across both models, which can share ids. */
  id: string;
  isOverdue: boolean;
  kind: AccountabilityRowKind;
  meta: string;
  sourceId: string;
  title: string;
};

/* Multiplication progress counts DISTINCT confirmed subjects, never raw update
   rows: three notes about Philip must not turn Philip into three people. A DOS
   Person id identifies a subject exactly; a bare name is normalised so " philip "
   and "Philip" are one person. Updates carrying neither are plain progress
   notes and count toward nothing. */
export function commitmentConfirmedSubjectCount(updates: ReadonlyArray<AccountabilityProgressSubject> | null | undefined) {
  return new Set(
    (updates ?? [])
      .map((update) => {
        if (update.subjectPersonId) {
          return `id:${update.subjectPersonId}`;
        }

        const name = (update.subjectPersonName ?? "").trim().toLowerCase();

        return name ? `name:${name}` : null;
      })
      .filter((key): key is string => key !== null),
  ).size;
}

function isMeasurable(commitment: AccountabilityCommitmentInput) {
  return typeof commitment.targetCount === "number" && Number.isFinite(commitment.targetCount) && commitment.targetCount > 0;
}

/* "1 of 3 confirmed", and only when the user declared a number. An ordinary
   one-time goal like "Read John 4-6 by Friday" has nothing to count, so it gets
   no progress line rather than a hollow "0 of 0". A declared target does show
   at zero: seeing "0 of 3 confirmed" is the whole point of having set it. */
export function accountabilityProgressLabel(commitment: AccountabilityCommitmentInput) {
  if (!isMeasurable(commitment)) {
    return null;
  }

  return `${commitmentConfirmedSubjectCount(commitment.updates)} of ${commitment.targetCount} confirmed`;
}

/* Journey follow-ups are system-generated one-time schedules. They already read
   as Journeys elsewhere on the Person, and they are not user-authored
   Accountability, so they are excluded here rather than reinterpreted. */
export function unifiedAccountabilityRows({
  commitments,
  dateValue,
  formatDate,
  isJourneyFollowUp,
  scheduleTitle,
  schedules,
  today,
}: {
  commitments: ReadonlyArray<AccountabilityCommitmentInput>;
  dateValue: (value: string | null) => number;
  formatDate: (value: string | null) => string;
  isJourneyFollowUp: (schedule: AccountabilityScheduleInput) => boolean;
  scheduleTitle: (schedule: AccountabilityScheduleInput) => string;
  schedules: ReadonlyArray<AccountabilityScheduleInput>;
  today: string;
}): UnifiedAccountabilityRow[] {
  const todayValue = dateValue(today);

  const scheduleRows = schedules
    .filter((schedule) => schedule.status === "active")
    .filter((schedule) => !isJourneyFollowUp(schedule))
    .map((schedule) => {
      const isOverdue = Boolean(schedule.nextCheckIn) && dateValue(schedule.nextCheckIn) < todayValue;
      /* Before routing by type, a one-time goal was written here too. Those
         rows are left exactly where they are -- reading them as "One-time date
         · Next Sep 27" would be a strange way to describe a deadline, so they
         read as the one-time goals they always were. Nothing is migrated; only
         the sentence changes. */
      const isOneTime = schedule.frequency === "one_time";
      const frequency = accountabilityFrequencyLabels[schedule.frequency] ?? "Recurring";

      return {
        id: `schedule-${schedule.id}`,
        isOverdue,
        kind: isOneTime ? ("one_time" as const) : ("recurring" as const),
        /* Past a missed check-in, "Next Sep 1" would be a lie about a date
           that has already gone by. */
        meta: isOneTime
          ? (isOverdue ? "Overdue" : `Due ${formatDate(schedule.nextCheckIn)}`)
          : (isOverdue ? `${frequency} · Overdue` : `${frequency} · Next ${formatDate(schedule.nextCheckIn)}`),
        sortValue: schedule.nextCheckIn ? dateValue(schedule.nextCheckIn) : null,
        sourceId: schedule.id,
        title: scheduleTitle(schedule),
      };
    });

  const commitmentRows = commitments
    .filter((commitment) => commitment.status === "active")
    .map((commitment) => {
      const progress = accountabilityProgressLabel(commitment);
      const isOverdue = Boolean(commitment.targetDate) && dateValue(commitment.targetDate) < todayValue;

      return {
        id: `commitment-${commitment.id}`,
        isOverdue,
        kind: "one_time" as const,
        /* A measurable goal is described by its progress; an ordinary one by
           when it is due; one with neither says nothing extra rather than
           filling the line with "No target date". */
        meta: progress ?? (commitment.targetDate ? `Due ${formatDate(commitment.targetDate)}` : ""),
        sortValue: commitment.targetDate ? dateValue(commitment.targetDate) : null,
        sourceId: commitment.id,
        title: commitment.title,
      };
    });

  /* Soonest first, so whatever is overdue leads. Undated work has no claim on
     any particular day and settles at the end, alphabetically, so the list does
     not reshuffle itself between renders. */
  return [...scheduleRows, ...commitmentRows]
    .sort((first, second) => {
      if (first.sortValue === null || second.sortValue === null) {
        if (first.sortValue === second.sortValue) {
          return first.title.localeCompare(second.title);
        }

        return first.sortValue === null ? 1 : -1;
      }

      return first.sortValue - second.sortValue || first.title.localeCompare(second.title);
    })
    .map(({ sortValue: _sortValue, ...row }) => row);
}
