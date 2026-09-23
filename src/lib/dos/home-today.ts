/* USA-282 follow-up: what belongs in Home's Notifications panel.
 *
 * Only today's. Not what is late -- the Accountability section below carries
 * that, and carrying it here too is how the panel became a second copy of the
 * backlog -- and not what is coming, which Upcoming carries.
 *
 * The day key is the caller's, computed once from the server render's instant
 * in the workspace's display timezone, so the panel and the section under it
 * can never disagree about which day it is.
 *
 * Deliberately pure: no clock, no locale, no React.
 */

export const homeTodayEmptyLabel = "No notifications today.";

/* Whether a dated thing belongs to today. Anything without a date is not
   today's: an undated item makes no claim on any day. */
export function isHomeTodayDate(value: string | null | undefined, today: string) {
  return Boolean(value) && String(value).slice(0, 10) === today;
}

/* "Derek's birthday". The first name is what a leader calls them, and the
   possessive keeps the line informational -- it states a fact about the day
   rather than handing out a task. */
export function homeTodayPossessive(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || name.trim();

  return firstName.endsWith("s") ? `${firstName}'` : `${firstName}'s`;
}
