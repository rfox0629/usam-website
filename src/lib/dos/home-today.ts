/* USA-282 follow-up: Home's "Today".
 *
 * Notifications and Accountability were showing the same backlog twice -- the
 * notification said "9 due" and the section below listed the same nine. This
 * module owns the other half of the fix: what TODAY means, said in units.
 *
 * Today is today only. Not what is late (Accountability carries that, and
 * carrying it here too is the duplication), and not what is coming (Upcoming
 * carries that). The day key is the caller's, computed once from the server
 * render's instant in the workspace's display timezone, so the section and
 * the buckets under it can never disagree about which day it is.
 *
 * Deliberately pure: no clock, no locale, no React.
 */

export type HomeTodayCounts = {
  anniversaries: number;
  birthdays: number;
  meetings: number;
  /* PEOPLE, not check-ins: the unit the leader acts on today is a person to
     sit with. One person with three items due today is one visit. */
  peopleToCheckIn: number;
};

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export const homeTodayEmptyLabel = "Nothing scheduled for today.";

/* "2 meetings · 1 birthday · 3 people to check in with".
 *
 * Every number says what it counts. A bare "3" beside a person's day is the
 * thing the retired count boxes did wrong. */
export function homeTodaySummaryLabel(counts: HomeTodayCounts) {
  const parts = [
    counts.meetings ? plural(counts.meetings, "meeting") : null,
    counts.birthdays ? plural(counts.birthdays, "birthday") : null,
    counts.anniversaries ? plural(counts.anniversaries, "anniversary", "anniversaries") : null,
    counts.peopleToCheckIn
      ? `${counts.peopleToCheckIn} ${counts.peopleToCheckIn === 1 ? "person" : "people"} to check in with`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : homeTodayEmptyLabel;
}

export function homeTodayTotal(counts: HomeTodayCounts) {
  return counts.anniversaries + counts.birthdays + counts.meetings + counts.peopleToCheckIn;
}

/* Whether a dated thing belongs to today. Anything without a date is not
   today's: an undated item makes no claim on any day, so it can never be
   counted as due now. */
export function isHomeTodayDate(value: string | null | undefined, today: string) {
  return Boolean(value) && String(value).slice(0, 10) === today;
}
