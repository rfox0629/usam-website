export type DosMeetingLifecycleDateInput = {
  createdAt?: string | null;
  scheduledStartAt?: string | null;
  tableDate?: string | null;
  updatedAt?: string | null;
};

function dateKeyFromValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function dosMeetingEventDate(input: DosMeetingLifecycleDateInput) {
  return dateKeyFromValue(input.tableDate)
    ?? dateKeyFromValue(input.scheduledStartAt)
    ?? dateKeyFromValue(input.createdAt)
    ?? dateKeyFromValue(input.updatedAt);
}

export function dosMeetingEventTimestamp(input: DosMeetingLifecycleDateInput) {
  const eventDate = dosMeetingEventDate(input);

  return eventDate ? `${eventDate}T12:00:00.000Z` : null;
}

export function dosMeetingEventSortValue(input: DosMeetingLifecycleDateInput) {
  const eventTimestamp = dosMeetingEventTimestamp(input);

  if (!eventTimestamp) {
    return 0;
  }

  const timestamp = new Date(eventTimestamp).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/* How long a meeting ran.
 *
 * `duration_minutes` is what somebody entered. The start/end pair is the
 * fallback for a row written before that column existed. One resolver, used by
 * the loader, so the report, the calendar and the Person record can never
 * disagree about a meeting's length -- and so that separating "when it
 * started" from "how long it ran" does not quietly change a single total. */
export function dosMeetingDurationMinutes(input: {
  durationMinutes?: number | null;
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
}) {
  if (typeof input.durationMinutes === "number" && Number.isFinite(input.durationMinutes) && input.durationMinutes > 0) {
    return Math.round(input.durationMinutes);
  }

  if (!input.scheduledStartAt || !input.scheduledEndAt) {
    return null;
  }

  const start = Date.parse(input.scheduledStartAt);
  const end = Date.parse(input.scheduledEndAt);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60_000);
}
