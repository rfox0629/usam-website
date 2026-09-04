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

import type { DosAccountabilityFrequency, DosCommitmentTargetKind } from "./commitments-accountability";

export const accountabilityFrequencyLabels: Record<DosAccountabilityFrequency, string> = {
  every_two_weeks: "Every two weeks",
  monthly: "Monthly",
  one_time: "One-time date",
  weekly: "Weekly",
};

export type AccountabilityRowKind = "one_time" | "recurring";

export type AccountabilityProgressSubject = {
  /* How much this update recorded against a count target. Null on rows
     written before the column existed; see accountabilityCountProgress. */
  progressAmount?: number | null;
  subjectPersonId?: string | null;
  subjectPersonName?: string | null;
  subjectPersonNameResolved?: string | null;
  updateDate?: string | null;
};

export type AccountabilityConfirmedSubject = {
  /* Stable per subject, so several updates about Philip render one row. */
  key: string;
  name: string;
  startedDate: string | null;
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
  targetKind?: DosCommitmentTargetKind | null;
  title: string;
  updates?: ReadonlyArray<AccountabilityProgressSubject> | null;
};

export type UnifiedAccountabilityRow = {
  /* Stable across renders and unique across both models, which can share ids. */
  id: string;
  isOverdue: boolean;
  kind: AccountabilityRowKind;
  meta: string;
  /* How this row records progress. "people" needs a named subject, "count" is
     a plain increment, and "check_in" is ordinary accountability behaving
     exactly as it always has. */
  progressKind: AccountabilityProgressKind;
  sourceId: string;
  /* Only ever populated for a people target: who has been confirmed so far,
     one row per distinct person however many updates mention them. */
  subjects: AccountabilityConfirmedSubject[];
  title: string;
};

export type AccountabilityProgressKind = "check_in" | "count" | "people";

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

/* A count target's progress is what the leader entered, added up. Rows written
   before progress_amount existed carry null and count as one, which is what
   they have always meant; that fallback is compatibility for those rows only,
   not the contract. Everything the V2 flow writes carries an explicit number.

   People targets never come here: a person is confirmed or not, and confirming
   Philip twice is still one Philip. */
export function accountabilityCountProgress(updates: ReadonlyArray<AccountabilityProgressSubject> | null | undefined) {
  return (updates ?? []).reduce((total, update) => {
    const amount = update.progressAmount;

    return total + (typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? amount : 1);
  }, 0);
}

function isMeasurable(commitment: AccountabilityCommitmentInput) {
  return typeof commitment.targetCount === "number" && Number.isFinite(commitment.targetCount) && commitment.targetCount > 0;
}

function subjectKey(update: AccountabilityProgressSubject) {
  if (update.subjectPersonId) {
    return `id:${update.subjectPersonId}`;
  }

  const name = (update.subjectPersonName ?? "").trim().toLowerCase();

  return name ? `name:${name}` : null;
}

/* Who has been confirmed, one row per person. Several updates about Philip are
   one Philip, dated from the earliest of them -- when he started, not when he
   was last mentioned. Updates naming nobody are plain progress notes and are
   left out entirely; they belong in the record, not in this list. */
export function accountabilityConfirmedSubjects(
  updates: ReadonlyArray<AccountabilityProgressSubject> | null | undefined,
): AccountabilityConfirmedSubject[] {
  const byKey = new Map<string, AccountabilityConfirmedSubject>();

  for (const update of updates ?? []) {
    const key = subjectKey(update);

    if (!key) {
      continue;
    }

    const name = (update.subjectPersonNameResolved ?? update.subjectPersonName ?? "").trim() || "Someone";
    const startedDate = update.updateDate ?? null;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { key, name, startedDate });
      continue;
    }

    if (startedDate && (!existing.startedDate || startedDate < existing.startedDate)) {
      existing.startedDate = startedDate;
    }

    /* A later update that resolves the person's real name wins over a
       placeholder, so a linked subject stops reading as "Someone". */
    if (existing.name === "Someone" && name !== "Someone") {
      existing.name = name;
    }
  }

  return Array.from(byKey.values());
}

/* What kind of progress this Accountability records. A people target is the
   only one that asks for a name; a generic numeric target counts occurrences
   and must never be asked who is being discipled; everything else keeps the
   ordinary check-in it has always had. */
export function accountabilityProgressKind(commitment: AccountabilityCommitmentInput): AccountabilityProgressKind {
  if (!isMeasurable(commitment)) {
    return "check_in";
  }

  return commitment.targetKind === "people" ? "people" : "count";
}

/* "1 of 3 confirmed", and only when the user declared a number. An ordinary
   one-time goal like "Read John 4-6 by Friday" has nothing to count, so it gets
   no progress line rather than a hollow "0 of 0". A declared target does show
   at zero: seeing "0 of 3 confirmed" is the whole point of having set it. */
export function accountabilityProgressLabel(commitment: AccountabilityCommitmentInput) {
  if (!isMeasurable(commitment)) {
    return null;
  }

  /* People are "confirmed" because a person either is being discipled or is
     not. A generic count has nothing to confirm -- three Bible readings are
     just three -- so it reads as a plain tally. */
  if (commitment.targetKind === "people") {
    return `${commitmentConfirmedSubjectCount(commitment.updates)} of ${commitment.targetCount} confirmed`;
  }

  return `${accountabilityCountProgress(commitment.updates)} of ${commitment.targetCount}`;
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
        progressKind: "check_in" as const,
        sortValue: schedule.nextCheckIn ? dateValue(schedule.nextCheckIn) : null,
        sourceId: schedule.id,
        subjects: [],
        title: scheduleTitle(schedule),
      };
    });

  const commitmentRows = commitments
    .filter((commitment) => commitment.status === "active")
    .map((commitment) => {
      const progress = accountabilityProgressLabel(commitment);
      const isOverdue = Boolean(commitment.targetDate) && dateValue(commitment.targetDate) < todayValue;

      const progressKind = accountabilityProgressKind(commitment);

      return {
        id: `commitment-${commitment.id}`,
        isOverdue,
        kind: "one_time" as const,
        /* A measurable goal is described by its progress; an ordinary one by
           when it is due; one with neither says nothing extra rather than
           filling the line with "No target date". */
        meta: progress ?? (commitment.targetDate ? `Due ${formatDate(commitment.targetDate)}` : ""),
        progressKind,
        sortValue: commitment.targetDate ? dateValue(commitment.targetDate) : null,
        sourceId: commitment.id,
        subjects: progressKind === "people" ? accountabilityConfirmedSubjects(commitment.updates) : [],
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

/* Is this person multiplying?
 *
 * Multiplying means people are actually being discipled BY them, and the only
 * thing in the product that records that is a people-target Accountability with
 * confirmed subjects. So the rule is exactly one sentence:
 *
 *   at least one distinct confirmed subject on a people target.
 *
 * Everything else is explicitly not evidence. A goal that says "Begin
 * discipling 3 people" with nobody confirmed is an intention, not a fruit, and
 * showing Multiplying for it would be the product congratulating someone for
 * typing a sentence. Likewise a title containing the word "multiply", a high
 * engagement score, a Circle, a relationship summary string, and anything a
 * model might infer from prose: none of them are evidence that a real person is
 * being discipled.
 *
 * Distinctness comes from accountabilityConfirmedSubjects, so three updates
 * about Philip are one Philip, and a count target ("Read Scripture 3 times")
 * can never contribute -- it has no subjects at all.
 *
 * This is derived on read. Nothing here writes a flag, creates Fruit, moves a
 * Circle, or touches engagement, and it is not editable by hand: the way to
 * make it true is to confirm someone.
 */
export function personIsMultiplying(
  commitments: ReadonlyArray<AccountabilityCommitmentInput> | null | undefined,
) {
  return (commitments ?? []).some((commitment) => (
    accountabilityProgressKind(commitment) === "people"
    && accountabilityConfirmedSubjects(commitment.updates).length > 0
  ));
}
