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
