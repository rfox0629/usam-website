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
export const dosAccountabilityScheduleStatuses = ["active", "paused"] as const;

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

export function nextAccountabilityCheckInDate(
  currentDate: string,
  frequency: DosAccountabilityFrequency,
  dayOfWeek?: number | null,
) {
  if (frequency === "one_time") {
    return null;
  }

  const date = dateFromKey(normalizeDateKey(currentDate));

  if (frequency === "monthly") {
    date.setUTCMonth(date.getUTCMonth() + 1);
    return keyFromDate(date);
  }

  date.setUTCDate(date.getUTCDate() + (frequency === "every_two_weeks" ? 14 : 7));

  if (typeof dayOfWeek === "number" && dayOfWeek >= 0 && dayOfWeek <= 6 && date.getUTCDay() !== dayOfWeek) {
    const offset = (dayOfWeek - date.getUTCDay() + 7) % 7;
    date.setUTCDate(date.getUTCDate() + offset);
  }

  return keyFromDate(date);
}
