export const dosCommitmentsFeatureFlag = "dos_commitments_accountability";

export const dosCommitmentStatuses = ["active", "completed", "paused", "cancelled"] as const;
export const dosCommitmentCategories = [
  "Spiritual Disciplines",
  "Testimony",
  "Relationships",
  "Marriage",
  "Character",
  "Evangelism",
  "Leadership",
  "Ministry",
  "Health",
  "Finances",
  "Other",
] as const;
export const dosCommitmentProgressStates = ["not_started", "in_progress", "going_well", "struggling", "completed"] as const;
/* What a measurable Accountability's number counts. "Begin discipling 3 men"
   counts people and needs named subjects; "Read the Bible 3 times this week"
   counts occurrences and must never be asked who is being discipled. Null
   means the Accountability is not measurable at all. */
export const dosCommitmentTargetKinds = ["people", "count"] as const;
export const dosAccountabilityFrequencies = ["weekly", "every_two_weeks", "monthly", "one_time"] as const;
/* "stopped" is a leader ending the reminder, and is not the same as "paused":
   the Journey sync owns 'paused' as a working state and sets rows back to
   'active', so a stop has to be a state the sync will not touch. */
export const dosAccountabilityScheduleStatuses = ["active", "paused", "stopped"] as const;

export type DosCommitmentStatus = typeof dosCommitmentStatuses[number];
export type DosCommitmentCategory = typeof dosCommitmentCategories[number];
export type DosCommitmentProgressState = typeof dosCommitmentProgressStates[number];
export type DosCommitmentTargetKind = typeof dosCommitmentTargetKinds[number];
export type DosAccountabilityFrequency = typeof dosAccountabilityFrequencies[number];
export type DosAccountabilityScheduleStatus = typeof dosAccountabilityScheduleStatuses[number];

export function isDosCommitmentStatus(value: string): value is DosCommitmentStatus {
  return dosCommitmentStatuses.includes(value as DosCommitmentStatus);
}

export function isDosCommitmentCategory(value: string): value is DosCommitmentCategory {
  return dosCommitmentCategories.includes(value as DosCommitmentCategory);
}

export function isDosCommitmentProgressState(value: string): value is DosCommitmentProgressState {
  return dosCommitmentProgressStates.includes(value as DosCommitmentProgressState);
}

export function isDosCommitmentTargetKind(value: string): value is DosCommitmentTargetKind {
  return dosCommitmentTargetKinds.includes(value as DosCommitmentTargetKind);
}

export function isDosAccountabilityFrequency(value: string): value is DosAccountabilityFrequency {
  return dosAccountabilityFrequencies.includes(value as DosAccountabilityFrequency);
}

export function isDosAccountabilityScheduleStatus(value: string): value is DosAccountabilityScheduleStatus {
  return dosAccountabilityScheduleStatuses.includes(value as DosAccountabilityScheduleStatus);
}

export function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDateKey(value: string | null | undefined, fallback = todayDateKey()) {
  const trimmed = value?.trim() ?? "";

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function keyFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function firstScheduleDateOnOrAfter(startDate: string, dayOfWeek: number | null | undefined) {
  const date = dateFromKey(normalizeDateKey(startDate));

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
    return keyFromDate(date);
  }

  const offset = (dayOfWeek - date.getUTCDay() + 7) % 7;

  date.setUTCDate(date.getUTCDate() + offset);

  return keyFromDate(date);
}

/* A month later, explicitly.
 *
 * `setUTCMonth(month + 1)` overflows: the 31st of January becomes the 3rd of
 * March, because February has no 31st and JavaScript rolls the excess days
 * forward. A monthly rhythm set on the 31st would drift a few days every
 * short month and stop falling on its own date.
 *
 * The last day of a shorter month is the honest answer, and the day of the
 * month is taken from the original date each time, so the 31st returns on the
 * next month that has one. */
export function addCalendarMonth(date: Date, months = 1) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const daysInTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, daysInTargetMonth)));
}

/* The one current occurrence of a repeating rhythm: the latest one that has
 * already come round, on or before today.
 *
 * A weekly rhythm due the 3rd, read on the 25th with nothing recorded since,
 * is ONE reminder -- the 24th, and past due -- not four tasks for the 3rd,
 * 10th, 17th and 24th. Missed weeks are not obligations that piled up; they
 * are the same standing rhythm, still unanswered.
 *
 * This is derived, for display and counting only. Nothing is written: no
 * check-in is invented for a week that did not happen, and the stored next
 * date stays exactly as it is until a real check-in moves it.
 *
 * It never advances past today, because a rhythm nobody has answered must
 * keep reading as late. Monthly steps from the ORIGINAL date each time
 * rather than from the previous result, so a rhythm anchored on the 31st
 * keeps returning to the 31st instead of walking backwards through every
 * short month. The step ceiling is a guard against a corrupt date, not a
 * limit anyone reaches: 600 weeks is eleven years. */
export const maxAccountabilityOccurrenceSteps = 600;

export function accountabilityOccurrenceOnOrBefore(
  scheduledDate: string,
  frequency: DosAccountabilityFrequency,
  today: string,
) {
  const scheduled = normalizeDateKey(scheduledDate, scheduledDate);

  /* A one-time date is the date. And an occurrence still ahead of today is
     already the current one -- there is nothing to catch up. Date keys are
     fixed-width, so comparing them as text orders them by day. */
  if (frequency === "one_time" || scheduled >= today) {
    return scheduled;
  }

  const anchor = dateFromKey(scheduled);

  if (Number.isNaN(anchor.getTime())) {
    return scheduled;
  }

  let current = scheduled;

  for (let step = 1; step <= maxAccountabilityOccurrenceSteps; step += 1) {
    const candidate = frequency === "monthly"
      ? addCalendarMonth(anchor, step)
      : new Date(anchor.getTime() + step * (frequency === "every_two_weeks" ? 14 : 7) * 86_400_000);
    const candidateKey = keyFromDate(candidate);

    if (candidateKey > today) {
      break;
    }

    current = candidateKey;
  }

  return current;
}

/* The first occurrence on or after a given day, counted from an anchor.
 *
 * The mirror of the function above, and it exists for the same reason: a
 * rhythm caught up one step at a time walks away from its own date. Counting
 * months from the anchor each time, a rhythm on the 31st passes through
 * February's 28th and comes back to the 31st; stepping from each result in
 * turn, it would stay on the 28th for good.
 *
 * The anchor itself counts as an occurrence, so an anchor already on or after
 * the target is returned unchanged. */
export function accountabilityOccurrenceOnOrAfter(
  anchorDate: string,
  frequency: DosAccountabilityFrequency,
  target: string,
) {
  const anchorKey = normalizeDateKey(anchorDate, anchorDate);

  if (frequency === "one_time" || anchorKey >= target) {
    return anchorKey;
  }

  const anchor = dateFromKey(anchorKey);

  if (Number.isNaN(anchor.getTime())) {
    return anchorKey;
  }

  for (let step = 1; step <= maxAccountabilityOccurrenceSteps; step += 1) {
    const candidate = frequency === "monthly"
      ? addCalendarMonth(anchor, step)
      : new Date(anchor.getTime() + step * (frequency === "every_two_weeks" ? 14 : 7) * 86_400_000);
    const candidateKey = keyFromDate(candidate);

    if (candidateKey >= target) {
      return candidateKey;
    }
  }

  return anchorKey;
}

/* The next reminder, counted from the day the check-in actually happened.
 *
 * Weekly is seven days later, fortnightly fourteen, monthly one calendar
 * month later clamped to the length of the shorter month. Nothing else: the
 * rhythm follows the conversation, so a Thursday reminder answered on a
 * Friday is next due on the Friday.
 *
 * The rhythm's original weekday is deliberately NOT consulted. Snapping back
 * to it moved the date away from the day the leader chose -- forward by
 * nearly a week when they answered late, or backwards when they answered
 * early -- and neither is what "a week from now" means. `day_of_week` still
 * describes the day a rhythm was set up on and still places its first date;
 * it has no say over the one after a check-in. */
export function nextAccountabilityCheckInDate(
  currentDate: string,
  frequency: DosAccountabilityFrequency,
) {
  if (frequency === "one_time") {
    return null;
  }

  const date = dateFromKey(normalizeDateKey(currentDate));

  if (frequency === "monthly") {
    return keyFromDate(addCalendarMonth(date));
  }

  date.setUTCDate(date.getUTCDate() + (frequency === "every_two_weeks" ? 14 : 7));

  return keyFromDate(date);
}

/* "This feature is not set up yet" is a very specific claim, and it was being
   made about any database error that merely mentioned one of these tables.
   Postgres names the table in constraint violations too --

     new row for relation "dos_commitment_updates" violates check constraint ...

   -- so a rejected row was reported to the user as missing setup, which sent
   the reader looking for a migration that was never the problem. A genuinely
   absent table or column says so in words: it does not exist, it could not be
   found, it is not in the schema cache. Anything else is a real error and must
   reach the user as itself. */
export function isMissingCommitmentsSchema(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  const namesCommitmentsSchema = [
    "dos_workspace_feature_flags",
    "dos_person_commitments",
    "dos_commitment_updates",
    "dos_accountability_schedules",
    "dos_accountability_check_ins",
    "dos_accountability_check_in_commitments",
  ].some((tableName) => message.includes(tableName))
    || message.includes("commitment")
    || message.includes("accountability");

  if (!namesCommitmentsSchema) {
    return false;
  }

  // A row the database refused is not a missing table, however it is worded.
  if (message.includes("violates") || message.includes("constraint")) {
    return false;
  }

  return message.includes("does not exist")
    || message.includes("could not find")
    || message.includes("schema cache");
}
