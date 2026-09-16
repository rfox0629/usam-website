/* DOS display dates.
 *
 * These primitives were defined inside `DosMvpAppClient.tsx`. They moved here
 * unchanged so that logic outside that 47k-line client -- and a regression
 * script -- can read a date exactly the way the screens do, rather than
 * growing a second, slightly different implementation of "which day is this
 * in the DOS display time zone".
 *
 * Two shapes of value arrive from the loader and they are NOT the same thing:
 *
 *   - a calendar date ("2026-09-16") is a day with no instant. It is read in
 *     UTC, so it stays the day it says it is wherever the reader sits.
 *   - a timestamp ("2026-09-16T19:00:00Z") is an instant. Its day is the day
 *     it falls on in the DOS display time zone, which is what the Meetings
 *     calendar shows.
 *
 * Everything that compares days therefore goes through `displayDayStart`, and
 * `isUpcomingDate` takes `now` so a caller can be tested at a fixed instant
 * instead of at whatever the machine's clock says.
 */
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";

const displayCalendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDisplayCalendarDateParts(value: string | null | undefined) {
  const match = value?.trim().match(displayCalendarDatePattern);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const normalized = new Date(timestamp).toISOString().slice(0, 10);

  return normalized === value?.trim()
    ? { day, month, year }
    : null;
}

export function isDisplayCalendarDate(value: string | null | undefined) {
  return Boolean(parseDisplayCalendarDateParts(value));
}

export function parseDisplayDate(value: string | null) {
  if (!value) {
    return null;
  }

  const calendarParts = parseDisplayCalendarDateParts(value);
  const date = calendarParts
    ? new Date(Date.UTC(calendarParts.year, calendarParts.month - 1, calendarParts.day, 12, 0, 0, 0))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export const dosDisplayTimeZone = groupDisplayTimeZone;

export function displayTimeZoneForValue(value: string | null | undefined) {
  return isDisplayCalendarDate(value) ? "UTC" : dosDisplayTimeZone;
}

const dosDisplayDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: dosDisplayTimeZone,
  year: "numeric",
});

export function displayDateParts(date: Date) {
  const parts = dosDisplayDatePartsFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? { day, month, year }
    : null;
}

export function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function displayDateKey(date: Date) {
  const parts = displayDateParts(date);

  return parts ? dateKeyFromParts(parts.year, parts.month, parts.day) : "";
}

export function displayDayStart(date: Date) {
  const parts = displayDateParts(date);

  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : null;
}

export function startOfDisplayDay(value: string | null | undefined) {
  const date = value ? parseDisplayDate(value) : null;

  if (!date) {
    return null;
  }

  return displayDayStart(date);
}

/* Today counts as upcoming: a meeting at 7pm is still ahead of a reader
   looking at the screen that morning, and a calendar date carries no time to
   compare against. `now` is a parameter so a caller can be pinned in a test;
   the screens pass nothing and read the clock, as they always did. */
export function isUpcomingDate(value: string | null | undefined, now: Date = new Date()) {
  const date = startOfDisplayDay(value);

  if (!date) {
    return false;
  }

  const today = displayDayStart(now);
  const todayStart = today?.getTime();

  return typeof todayStart === "number" && date.getTime() >= todayStart;
}

export function dateSortValue(value: string | null | undefined) {
  return parseDisplayDate(value ?? null)?.getTime() ?? 0;
}

/* ---- Wall-clock times in the DOS display time zone ------------------------
 *
 * A meeting is entered as a day plus a clock time ("16 September", "6:30 PM"),
 * and B9 says every DOS screen reads times in `dosDisplayTimeZone`. Building
 * the instant with `new Date("2026-09-16T18:30:00")` reads that clock in
 * WHOEVER'S BROWSER is saving, so one entry meant two different instants
 * depending on where the person sat, and the screens then read all of them
 * back in Chicago. Production shows it: the same "noon" stamp is 17:00Z on the
 * America/Chicago rows and 19:00Z on the America/Phoenix ones, and the second
 * group reads as 2:00 PM on every screen.
 *
 * These are the one conversion between a wall clock in a named zone and an
 * instant, in both directions, so what is typed is what every screen shows.
 * The offset is read from the zone at the instant in question rather than
 * assumed, so daylight saving is the zone database's answer, not arithmetic
 * here.
 */
const zonedPartsFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedPartsFormatter(timeZone: string) {
  const existing = zonedPartsFormatters.get(timeZone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  });

  zonedPartsFormatters.set(timeZone, formatter);

  return formatter;
}

/* The wall clock `timeZone` shows at `utcMs`, expressed as if it were UTC, so
   two wall clocks can be compared as numbers. */
function zonedWallMs(utcMs: number, timeZone: string) {
  const parts = zonedPartsFormatter(timeZone).formatToParts(new Date(utcMs));
  const partValue = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = partValue("hour");
  /* Some engines render midnight as hour 24 under hour12: false. */
  const normalizedHour = Number.isFinite(hour) ? hour % 24 : Number.NaN;

  return Date.UTC(
    partValue("year"),
    partValue("month") - 1,
    partValue("day"),
    normalizedHour,
    partValue("minute"),
    partValue("second"),
  );
}

/* Minutes east of UTC that `timeZone` was on at `utcMs`. */
function zoneOffsetMinutes(utcMs: number, timeZone: string) {
  const wallMs = zonedWallMs(utcMs, timeZone);

  return Number.isFinite(wallMs) ? (wallMs - utcMs) / 60_000 : 0;
}

const displayClockPattern = /^(\d{1,2}):(\d{2})$/;

export function parseDisplayClockTime(value: string | null | undefined) {
  const match = value?.trim().match(displayClockPattern);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? { hours, minutes } : null;
}

/* A calendar date plus a clock time, read in `timeZone`, as an instant.
   Null when either half is missing or malformed: an unknown start time is
   null, never a stand-in value. A clock time that does not exist on the day
   (the spring-forward gap) resolves forward to the instant the clock actually
   reached, which is what a calendar application does. */
export function zonedDateTimeIso(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined,
  timeZone: string = dosDisplayTimeZone,
) {
  const dateParts = parseDisplayCalendarDateParts(dateValue);
  const clock = parseDisplayClockTime(timeValue);

  if (!dateParts || !clock) {
    return null;
  }

  const wallMs = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, clock.hours, clock.minutes);
  /* Two candidates: one from the offset at the wall time read as UTC, one from
     the offset actually in force at that first answer. On an ordinary day they
     are the same instant. On the two days a year they differ, the candidate
     that reads back as the clock time asked for is the right one -- and when
     NEITHER does, the clock time never happened (the spring-forward gap), so
     the later candidate is taken, which is the instant the clock reached
     instead. An ambiguous autumn hour takes the first, earlier occurrence. */
  const firstPass = wallMs - zoneOffsetMinutes(wallMs, timeZone) * 60_000;
  const secondPass = wallMs - zoneOffsetMinutes(firstPass, timeZone) * 60_000;
  const candidates = [secondPass, firstPass].filter((candidate) => Number.isFinite(candidate));

  if (!candidates.length) {
    return null;
  }

  const exact = candidates.find((candidate) => zonedWallMs(candidate, timeZone) === wallMs);
  const utcMs = exact ?? Math.max(...candidates);

  return new Date(utcMs).toISOString();
}

/* The "HH:MM" an instant reads in `timeZone`. A calendar date carries no
   instant, so it has no clock time and returns null rather than the midnight
   or noon an anchor would invent. */
export function zonedClockTime(value: string | null | undefined, timeZone: string = dosDisplayTimeZone) {
  if (!value || isDisplayCalendarDate(value)) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = zonedPartsFormatter(timeZone).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/* Whether a stored value carries a real clock time at all. `table_date` is a
   day; `scheduled_start_at` is an instant. Only the second can be shown as a
   time, and a screen that cannot tell them apart is how a date-only meeting
   came to read "7:00 AM": a calendar date anchored at noon UTC is 7am in
   Chicago, 6am outside daylight saving. */
export function hasDisplayClockTime(value: string | null | undefined) {
  if (!value || isDisplayCalendarDate(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}
