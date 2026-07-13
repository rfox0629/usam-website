export const dosResourceAssignmentStatuses = ["not_started", "in_progress", "completed", "paused"] as const;
export const dosResourceAssignmentFollowUpCadences = ["none", "midpoint_and_completion", "due_only", "weekly"] as const;
export const dosResourceAssignmentFollowUpKinds = ["midpoint", "completion"] as const;
export const resourceAssignmentFollowUpScheduleHeading = "Growth follow-up due";

export type DosResourceAssignmentStatus = typeof dosResourceAssignmentStatuses[number];
export type DosResourceAssignmentFollowUpCadence = typeof dosResourceAssignmentFollowUpCadences[number];
export type DosResourceAssignmentFollowUpKind = typeof dosResourceAssignmentFollowUpKinds[number];

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

function resourceAssignmentDateValue(value: string) {
  return new Date(`${normalizeResourceAssignmentDateKey(value)}T12:00:00.000Z`).getTime();
}

export function defaultResourceAssignmentDueDate(startDate: string, durationDays?: number | null) {
  return addDaysToResourceAssignmentDateKey(startDate, typeof durationDays === "number" ? durationDays : 14);
}

export function resourceAssignmentCommitmentTitle(resourceTitle: string) {
  return `Complete "${resourceTitle}"`;
}

export function resourceAssignmentFollowUpScheduleMarker(assignmentId: string, kind: DosResourceAssignmentFollowUpKind) {
  return `[resource-assignment:${assignmentId}:${kind}]`;
}

export function resourceAssignmentFollowUpScheduleTitle(assignmentId: string, kind: DosResourceAssignmentFollowUpKind) {
  return `${resourceAssignmentFollowUpScheduleHeading} ${resourceAssignmentFollowUpScheduleMarker(assignmentId, kind)}`;
}

export function parseResourceAssignmentFollowUpScheduleTitle(title: string) {
  const match = title.match(/\[resource-assignment:([0-9a-f-]{36}):(midpoint|completion)\]$/i);

  return match
    ? {
      assignmentId: match[1],
      kind: match[2] as DosResourceAssignmentFollowUpKind,
    }
    : null;
}

export function resourceAssignmentFollowUpScheduleDisplayTitle(title: string) {
  return title.replace(/\s*\[resource-assignment:[0-9a-f-]{36}:(?:midpoint|completion)\]$/i, "");
}

export function resourceAssignmentMidpointDate(startDate: string, dueDate: string | null | undefined) {
  const normalizedStartDate = normalizeResourceAssignmentDateKey(startDate);
  const normalizedDueDate = dueDate ? normalizeResourceAssignmentDateKey(dueDate, defaultResourceAssignmentDueDate(normalizedStartDate)) : defaultResourceAssignmentDueDate(normalizedStartDate);
  const durationDays = Math.max(1, Math.round((resourceAssignmentDateValue(normalizedDueDate) - resourceAssignmentDateValue(normalizedStartDate)) / (24 * 60 * 60 * 1000)));

  return addDaysToResourceAssignmentDateKey(normalizedStartDate, Math.max(1, Math.floor(durationDays / 2)));
}

export function resourceAssignmentFollowUpDates({
  dueDate,
  followUpCadence,
  startDate,
  status,
}: {
  dueDate: string | null | undefined;
  followUpCadence: DosResourceAssignmentFollowUpCadence;
  startDate: string;
  status: DosResourceAssignmentStatus;
}) {
  if (status === "completed" || status === "paused" || followUpCadence === "none") {
    return [] as Array<{ date: string; kind: DosResourceAssignmentFollowUpKind }>;
  }

  const normalizedStartDate = normalizeResourceAssignmentDateKey(startDate);
  const normalizedDueDate = dueDate ? normalizeResourceAssignmentDateKey(dueDate, defaultResourceAssignmentDueDate(normalizedStartDate)) : defaultResourceAssignmentDueDate(normalizedStartDate);
  const dates: Array<{ date: string; kind: DosResourceAssignmentFollowUpKind }> = [];

  if (followUpCadence === "midpoint_and_completion" || followUpCadence === "weekly") {
    dates.push({
      date: resourceAssignmentMidpointDate(normalizedStartDate, normalizedDueDate),
      kind: "midpoint",
    });
  }

  if (followUpCadence === "midpoint_and_completion" || followUpCadence === "due_only" || followUpCadence === "weekly") {
    dates.push({
      date: normalizedDueDate,
      kind: "completion",
    });
  }

  return dates;
}
