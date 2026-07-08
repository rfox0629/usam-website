export const dosTableInvitationKinds = ["coffee", "kitchen_table", "prayer"] as const;
export const dosTableInvitationStatuses = ["active", "draft", "paused", "archived"] as const;
export const dosTableInvitationHostModes = ["single", "household"] as const;

export type DosTableInvitationKind = typeof dosTableInvitationKinds[number];
export type DosTableInvitationStatus = typeof dosTableInvitationStatuses[number];
export type DosTableInvitationHostMode = typeof dosTableInvitationHostModes[number];

export type DosTableInvitationTimeWindow = {
  end: string;
  id: string;
  start: string;
};

export type DosTableInvitationDaySetting = {
  available: boolean;
  id: string;
  label: string;
  windows: DosTableInvitationTimeWindow[];
};

export type DosTableInvitationMeetingTypeSetting = {
  duration: number;
  enabled: boolean;
  id: DosTableInvitationKind;
  label: string;
};

export type DosTableInvitationSettings = {
  bookingRules: {
    bookingWindowDays: number;
    bufferMinutes: number;
    maxPerDay: number;
    maxPerWeek: number;
    minimumNoticeHours: number;
  };
  calendarRules: {
    blockDosMeetings: boolean;
    blockDosReminders: boolean;
    createDosMeeting: boolean;
    createGoogleCalendarEvent: boolean;
  };
  meetingTypes: DosTableInvitationMeetingTypeSetting[];
  preferredDays: string[];
  preferredTimes: string[];
  timezone: string;
  weeklySchedule: DosTableInvitationDaySetting[];
};

export type DosTableInvitation = {
  audience: string | null;
  createdAt: string | null;
  description: string | null;
  hostMemberIds: string[];
  hostMode: DosTableInvitationHostMode;
  id: string;
  kind: DosTableInvitationKind;
  publicEnabled: boolean;
  settings: DosTableInvitationSettings;
  status: DosTableInvitationStatus;
  title: string;
  token: string;
  updatedAt: string | null;
};

export type DosTableInvitationSlot = {
  dateLabel: string;
  endAt: string;
  id: string;
  startAt: string;
  timeLabel: string;
};

export type DosTableInvitationBusyInterval = {
  endAt: string;
  startAt: string;
};

const dayLabels = [
  { id: "sun", label: "Sunday" },
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
] as const;

const dayIds = dayLabels.map((day) => day.id);

const invitationKindDefaults: Record<DosTableInvitationKind, {
  audience: string;
  description: string;
  duration: number;
  title: string;
}> = {
  coffee: {
    audience: "1:1",
    description: "Invite someone to meet over coffee.",
    duration: 45,
    title: "Coffee",
  },
  kitchen_table: {
    audience: "1:1 or Couples",
    description: "Invite someone to your table for a focused conversation.",
    duration: 90,
    title: "Kitchen Table",
  },
  prayer: {
    audience: "1:1",
    description: "Invite someone to pray together.",
    duration: 30,
    title: "Prayer",
  },
};

export function defaultDosTableInvitationSettings(): DosTableInvitationSettings {
  return {
    bookingRules: {
      bookingWindowDays: 30,
      bufferMinutes: 30,
      maxPerDay: 2,
      maxPerWeek: 6,
      minimumNoticeHours: 12,
    },
    calendarRules: {
      blockDosMeetings: true,
      blockDosReminders: true,
      createDosMeeting: true,
      createGoogleCalendarEvent: true,
    },
    meetingTypes: [
      { duration: 90, enabled: true, id: "kitchen_table", label: "Kitchen Table" },
      { duration: 45, enabled: true, id: "coffee", label: "Coffee" },
      { duration: 30, enabled: true, id: "prayer", label: "Prayer" },
    ],
    preferredDays: ["tue", "thu"],
    preferredTimes: ["Evening"],
    timezone: "America/Chicago",
    weeklySchedule: dayLabels.map((day) => ({
      available: day.id === "tue" || day.id === "thu",
      id: day.id,
      label: day.label,
      windows: day.id === "tue" || day.id === "thu"
        ? [{ end: "21:00", id: `${day.id}-default`, start: "18:00" }]
        : [],
    })),
  };
}

export function dosTableInvitationKindDefaults(kind: DosTableInvitationKind) {
  return invitationKindDefaults[kind];
}

export function createDefaultDosTableInvitation(kind: DosTableInvitationKind = "kitchen_table"): Omit<DosTableInvitation, "createdAt" | "id" | "token" | "updatedAt"> {
  const defaults = dosTableInvitationKindDefaults(kind);

  return {
    audience: defaults.audience,
    description: defaults.description,
    hostMemberIds: [],
    hostMode: "single",
    kind,
    publicEnabled: true,
    settings: defaultDosTableInvitationSettings(),
    status: "active",
    title: defaults.title,
  };
}

export function normalizeDosTableInvitationKind(value: unknown): DosTableInvitationKind {
  return dosTableInvitationKinds.includes(value as DosTableInvitationKind) ? value as DosTableInvitationKind : "kitchen_table";
}

export function normalizeDosTableInvitationStatus(value: unknown): DosTableInvitationStatus {
  return dosTableInvitationStatuses.includes(value as DosTableInvitationStatus) ? value as DosTableInvitationStatus : "active";
}

export function normalizeDosTableInvitationHostMode(value: unknown): DosTableInvitationHostMode {
  return dosTableInvitationHostModes.includes(value as DosTableInvitationHostMode) ? value as DosTableInvitationHostMode : "single";
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  const nextValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(nextValue)));
}

function cleanTime(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";

  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeWindows(value: unknown, dayId: string): DosTableInvitationTimeWindow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index): DosTableInvitationTimeWindow[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as Record<string, unknown>;
    const start = cleanTime(row.start, "18:00");
    const end = cleanTime(row.end, "21:00");

    if (timeToMinutes(end) <= timeToMinutes(start)) {
      return [];
    }

    return [{
      end,
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `${dayId}-${index}`,
      start,
    }];
  });
}

export function normalizeDosTableInvitationSettings(value: unknown): DosTableInvitationSettings {
  const defaults = defaultDosTableInvitationSettings();
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const bookingRules = input.bookingRules && typeof input.bookingRules === "object" ? input.bookingRules as Record<string, unknown> : {};
  const calendarRules = input.calendarRules && typeof input.calendarRules === "object" ? input.calendarRules as Record<string, unknown> : {};
  const preferredDays = Array.isArray(input.preferredDays)
    ? input.preferredDays.filter((day): day is string => typeof day === "string" && dayIds.includes(day as typeof dayIds[number]))
    : defaults.preferredDays;
  const preferredTimes = Array.isArray(input.preferredTimes)
    ? input.preferredTimes.filter((time): time is string => typeof time === "string" && time.trim().length > 0)
    : defaults.preferredTimes;
  const meetingTypes = defaults.meetingTypes.map((defaultType) => {
    const match = Array.isArray(input.meetingTypes)
      ? input.meetingTypes.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).id === defaultType.id) as Record<string, unknown> | undefined
      : undefined;

    return {
      ...defaultType,
      duration: finiteNumber(match?.duration, defaultType.duration, 15, 240),
      enabled: typeof match?.enabled === "boolean" ? match.enabled : defaultType.enabled,
    };
  });
  const weeklySchedule = defaults.weeklySchedule.map((defaultDay) => {
    const match = Array.isArray(input.weeklySchedule)
      ? input.weeklySchedule.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).id === defaultDay.id) as Record<string, unknown> | undefined
      : undefined;
    const windows = normalizeWindows(match?.windows, defaultDay.id);

    return {
      ...defaultDay,
      available: typeof match?.available === "boolean" ? match.available : defaultDay.available,
      windows: windows.length ? windows : defaultDay.windows,
    };
  });

  return {
    bookingRules: {
      bookingWindowDays: finiteNumber(bookingRules.bookingWindowDays, defaults.bookingRules.bookingWindowDays, 1, 365),
      bufferMinutes: finiteNumber(bookingRules.bufferMinutes, defaults.bookingRules.bufferMinutes, 0, 240),
      maxPerDay: finiteNumber(bookingRules.maxPerDay, defaults.bookingRules.maxPerDay, 1, 24),
      maxPerWeek: finiteNumber(bookingRules.maxPerWeek, defaults.bookingRules.maxPerWeek, 1, 100),
      minimumNoticeHours: finiteNumber(bookingRules.minimumNoticeHours, defaults.bookingRules.minimumNoticeHours, 0, 720),
    },
    calendarRules: {
      blockDosMeetings: typeof calendarRules.blockDosMeetings === "boolean" ? calendarRules.blockDosMeetings : defaults.calendarRules.blockDosMeetings,
      blockDosReminders: typeof calendarRules.blockDosReminders === "boolean" ? calendarRules.blockDosReminders : defaults.calendarRules.blockDosReminders,
      createDosMeeting: typeof calendarRules.createDosMeeting === "boolean" ? calendarRules.createDosMeeting : defaults.calendarRules.createDosMeeting,
      createGoogleCalendarEvent: typeof calendarRules.createGoogleCalendarEvent === "boolean" ? calendarRules.createGoogleCalendarEvent : defaults.calendarRules.createGoogleCalendarEvent,
    },
    meetingTypes,
    preferredDays: preferredDays.length ? Array.from(new Set(preferredDays)) : defaults.preferredDays,
    preferredTimes: preferredTimes.length ? Array.from(new Set(preferredTimes)) : defaults.preferredTimes,
    timezone: typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim() : defaults.timezone,
    weeklySchedule,
  };
}

export function tableInvitationPublicHref(token: string) {
  return `/dos/book/${encodeURIComponent(token)}`;
}

export function tableInvitationPublicUrl(token: string, origin?: string) {
  const href = tableInvitationPublicHref(token);

  if (!origin) {
    return href;
  }

  return new URL(href, origin).toString();
}

export function tableInvitationDuration(settings: DosTableInvitationSettings, kind: DosTableInvitationKind) {
  return settings.meetingTypes.find((type) => type.id === kind)?.duration ?? dosTableInvitationKindDefaults(kind).duration;
}

export function timeToMinutes(value: string) {
  const [rawHour, rawMinute = "00"] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
}

function formatParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    second: Number(values.second),
    year: Number(values.year),
  };
}

function timezoneOffsetMinutes(date: Date, timezone: string) {
  const parts = formatParts(date, timezone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return (localAsUtc - date.getTime()) / 60_000;
}

function zonedDateTimeToUtc(dateKey: string, time: string, timezone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = timezoneOffsetMinutes(guess, timezone);

  return new Date(guess.getTime() - offset * 60_000);
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));

  return date.toISOString().slice(0, 10);
}

function zonedDateKey(date: Date, timezone: string) {
  const parts = formatParts(date, timezone);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dosTableInvitationDateKey(date: Date, timezone: string) {
  return zonedDateKey(date, timezone);
}

function zonedDayId(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);

  return dayIds[date.getUTCDay()] ?? "sun";
}

function rangesOverlap(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function bufferedInterval(interval: DosTableInvitationBusyInterval, bufferMinutes: number) {
  return {
    end: new Date(new Date(interval.endAt).getTime() + bufferMinutes * 60_000),
    start: new Date(new Date(interval.startAt).getTime() - bufferMinutes * 60_000),
  };
}

function formatSlotDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    weekday: "short",
  }).format(date);
}

function formatSlotTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function generateDosTableInvitationSlots({
  busyIntervals,
  kind,
  limit = 40,
  now = new Date(),
  settings,
}: {
  busyIntervals: DosTableInvitationBusyInterval[];
  kind: DosTableInvitationKind;
  limit?: number;
  now?: Date;
  settings: DosTableInvitationSettings;
}): DosTableInvitationSlot[] {
  const durationMinutes = tableInvitationDuration(settings, kind);
  const noticeTime = new Date(now.getTime() + settings.bookingRules.minimumNoticeHours * 60 * 60 * 1000);
  const lastAllowedTime = new Date(now.getTime() + settings.bookingRules.bookingWindowDays * 24 * 60 * 60 * 1000);
  const selectedDays = new Set(settings.preferredDays);
  const slots: DosTableInvitationSlot[] = [];
  const busy = busyIntervals.map((interval) => bufferedInterval(interval, settings.bookingRules.bufferMinutes));
  const startDateKey = zonedDateKey(now, settings.timezone);

  for (let dayOffset = 0; dayOffset <= settings.bookingRules.bookingWindowDays && slots.length < limit; dayOffset += 1) {
    const dateKey = addDaysToDateKey(startDateKey, dayOffset);
    const dayId = zonedDayId(dateKey);
    const day = settings.weeklySchedule.find((item) => item.id === dayId);

    if (!day?.available || !day.windows.length || (selectedDays.size > 0 && !selectedDays.has(dayId))) {
      continue;
    }

    for (const window of day.windows) {
      const windowEnd = timeToMinutes(window.end);
      const firstStart = timeToMinutes(window.start);

      for (let startMinutes = firstStart; startMinutes + durationMinutes <= windowEnd && slots.length < limit; startMinutes += 15) {
        const start = zonedDateTimeToUtc(dateKey, `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`, settings.timezone);
        const end = new Date(start.getTime() + durationMinutes * 60_000);

        if (start < noticeTime || start > lastAllowedTime) {
          continue;
        }

        if (busy.some((interval) => rangesOverlap(start, end, interval.start, interval.end))) {
          continue;
        }

        slots.push({
          dateLabel: formatSlotDate(start, settings.timezone),
          endAt: end.toISOString(),
          id: start.toISOString(),
          startAt: start.toISOString(),
          timeLabel: formatSlotTime(start, settings.timezone),
        });
      }
    }
  }

  return slots;
}
