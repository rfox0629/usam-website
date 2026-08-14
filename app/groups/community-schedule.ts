/**
 * One canonical schedule presentation for every Community surface.
 *
 * USA-57. The production Wednesday page was conceptually broken: it stated a
 * confident recurring rhythm ("Weekly · Wednesday · 5:30–6:30") while, beside
 * it, "Next gathering" said TBD. Those read as two competing schedules.
 *
 * There is only ever one canonical schedule. A Group has a recurring rhythm,
 * and it may additionally have a specific next gathering row. This helper
 * folds both into a single answer to "when does this meet?" so the public
 * page, the member Home and the leader view can never disagree.
 *
 * It formats canonical DOS data. It does not own or duplicate it.
 */

export type CommunitySchedule = {
  /** The one-line answer to "when does this meet?". */
  headline: string;
  /** Supporting line. Never contradicts the headline. */
  detail: string;
  /** True when a specific dated gathering is on the calendar. */
  isDated: boolean;
  /** Location to display, already safe for this surface. */
  location: string;
};

export function buildCommunitySchedule({
  location,
  nextGatheringStartsAt,
  nextGatheringTitle,
  rhythmLabel,
  timeZone,
}: {
  location?: string | null;
  nextGatheringStartsAt?: string | null;
  nextGatheringTitle?: string | null;
  rhythmLabel?: string | null;
  timeZone?: string | null;
}): CommunitySchedule {
  const rhythm = cleanText(rhythmLabel);
  const safeLocation = cleanText(location) || "Location shared by the leader";
  const dated = formatGatheringDate(nextGatheringStartsAt, timeZone);

  if (dated) {
    // A real date exists. It leads; the rhythm becomes supporting context so
    // the two can never look like rival schedules.
    const title = cleanText(nextGatheringTitle);

    return {
      detail: rhythm ? `${rhythm}${title ? ` · ${title}` : ""}` : title || "Next gathering",
      headline: dated,
      isDated: true,
      location: safeLocation,
    };
  }

  if (rhythm) {
    // No dated row yet. The rhythm IS the schedule — say so plainly rather
    // than pairing it with a contradictory "TBD" of equal weight.
    return {
      detail: "Next date confirmed by the leader",
      headline: rhythm,
      isDated: false,
      location: safeLocation,
    };
  }

  return {
    detail: "Ask a leader for the current rhythm",
    headline: "Schedule shared by the leader",
    isDated: false,
    location: safeLocation,
  };
}

/** Placeholder values must never surface as if they were real content. */
export function publicSafeText(value?: string | null): string {
  return cleanText(value);
}

function cleanText(value?: string | null): string {
  const trimmed = (value ?? "").trim();

  // Treat placeholder values as absent so they never surface as real content.
  if (!trimmed || /^(tbd|n\/a|none|unknown)$/i.test(trimmed) || /\btbd\b/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function formatGatheringDate(startsAt?: string | null, timeZone?: string | null): string {
  if (!startsAt) {
    return "";
  }

  const date = new Date(startsAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "long",
      timeZone: timeZone || undefined,
      weekday: "long",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "long",
      weekday: "long",
    }).format(date);
  }
}
