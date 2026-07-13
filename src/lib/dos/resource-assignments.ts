export const dosResourceAssignmentStatuses = ["not_started", "in_progress", "completed", "paused"] as const;
export const dosResourceAssignmentFollowUpCadences = ["none", "midpoint_and_completion", "due_only", "weekly"] as const;

export type DosResourceAssignmentStatus = typeof dosResourceAssignmentStatuses[number];
export type DosResourceAssignmentFollowUpCadence = typeof dosResourceAssignmentFollowUpCadences[number];

export function isDosResourceAssignmentStatus(value: string): value is DosResourceAssignmentStatus {
  return dosResourceAssignmentStatuses.includes(value as DosResourceAssignmentStatus);
}

export function isDosResourceAssignmentFollowUpCadence(value: string): value is DosResourceAssignmentFollowUpCadence {
  return dosResourceAssignmentFollowUpCadences.includes(value as DosResourceAssignmentFollowUpCadence);
}

export function todayResourceAssignmentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeResourceAssignmentDateKey(value: string | null | undefined, fallback = todayResourceAssignmentDateKey()) {
  const trimmed = value?.trim() ?? "";

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

export function addDaysToResourceAssignmentDateKey(value: string, days: number) {
  const date = new Date(`${normalizeResourceAssignmentDateKey(value)}T12:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.round(days)));

  return date.toISOString().slice(0, 10);
}

export function defaultResourceAssignmentDueDate(startDate: string, durationDays?: number | null) {
  return addDaysToResourceAssignmentDateKey(startDate, typeof durationDays === "number" ? durationDays : 14);
}

export function resourceAssignmentCommitmentTitle(resourceTitle: string) {
  return `Complete "${resourceTitle}"`;
}
