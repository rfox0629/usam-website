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
