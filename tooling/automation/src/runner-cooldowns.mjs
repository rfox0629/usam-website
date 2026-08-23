const LIMIT_PATTERNS = [
  /you.?ve hit your (?:usage |session |rate )?limit/i,
  /(?:usage|session|rate|quota) limit/i,
  /(?:usage|session|rate|quota).{0,80}(?:exceeded|reached|hit)/i,
  /too many requests/i,
  /\b429\b/,
];

const ENVIRONMENT_UNAVAILABLE_PATTERNS = [
  /no available environments/i,
  /workspace has no available environments/i,
  /cannot start tasks? because .* no available environments/i,
  /no execution environments? available/i,
  /not logged in\s*[·.-]?\s*please run\s+\/login/i,
];

const DEFAULT_TIME_ZONE = "America/Chicago";

function textSnippet(text, maxChars = 1000) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  return compact.length > maxChars ? compact.slice(0, maxChars) : compact;
}

function runnerFailureText(result) {
  const finalOrErrorText = [result.finalText, result.error?.message].filter(Boolean).join("\n");
  if (result.code === 0) {
    return finalOrErrorText;
  }

  return [result.stdout, result.stderr, finalOrErrorText].filter(Boolean).join("\n");
}

function datePartsInZone(date, timeZone) {
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
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
}

function timeZoneOffsetMs(date, timeZone) {
  const parts = datePartsInZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedTimeToUtc({ day, hour, minute, month, second = 0, timeZone, year }) {
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let offset = timeZoneOffsetMs(new Date(wallClockUtc), timeZone);
  let utcDate = new Date(wallClockUtc - offset);
  const correctedOffset = timeZoneOffsetMs(utcDate, timeZone);
  if (correctedOffset !== offset) {
    utcDate = new Date(wallClockUtc - correctedOffset);
  }
  return utcDate;
}

function parseRelativeReset(text, now) {
  const match = text.match(/\b(?:reset(?:s)?|retry|try again|available|available again)\s+(?:after\s+|in\s+)?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit.startsWith("hour") || unit.startsWith("hr")
    ? 60 * 60 * 1000
    : unit.startsWith("min")
      ? 60 * 1000
      : 1000;

  return {
    resetAt: new Date(now.getTime() + amount * factor),
    source: match[0],
  };
}

function parseIsoReset(text) {
  const match = text.match(/\b(?:reset(?:s)?|reset at|try again at|retry at|available at)\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:.+-]+(?:Z|[+-][0-9:]{2,5})?)/i);
  if (!match) {
    return null;
  }

  const parsed = new Date(match[1].replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    resetAt: parsed,
    source: match[0],
  };
}

function parseClockReset(text, now, defaultTimeZone = DEFAULT_TIME_ZONE) {
  const match = text.match(/\breset(?:s)?(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*\(([^)]+)\))?/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase() || null;
  const timeZone = match[4] || defaultTimeZone;

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  } else if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  const parts = datePartsInZone(now, timeZone);
  let resetAt = zonedTimeToUtc({
    day: parts.day,
    hour,
    minute,
    month: parts.month,
    timeZone,
    year: parts.year,
  });

  if (resetAt.getTime() <= now.getTime()) {
    const nextDay = new Date(resetAt.getTime() + 24 * 60 * 60 * 1000);
    const nextParts = datePartsInZone(nextDay, timeZone);
    resetAt = zonedTimeToUtc({
      day: nextParts.day,
      hour,
      minute,
      month: nextParts.month,
      timeZone,
      year: nextParts.year,
    });
  }

  return {
    resetAt,
    source: match[0],
    timeZone,
  };
}

export function parseRunnerResetTime(text, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const defaultTimeZone = options.defaultTimeZone || DEFAULT_TIME_ZONE;
  return parseIsoReset(text)
    || parseRelativeReset(text, now)
    || parseClockReset(text, now, defaultTimeZone);
}

export function classifyRunnerCooldown(result, options = {}) {
  if (!result || result.timedOut) {
    return null;
  }

  const combinedText = runnerFailureText(result);
  if (!LIMIT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    return null;
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const defaultCooldownMs = Number(options.defaultCooldownMs || 60 * 60 * 1000);
  const resumeDelayMs = Number(options.resumeDelayMs || 2 * 60 * 1000);
  const parsedReset = parseRunnerResetTime(combinedText, {
    defaultTimeZone: options.defaultTimeZone || DEFAULT_TIME_ZONE,
    now,
  });
  const resetAt = parsedReset?.resetAt || new Date(now.getTime() + defaultCooldownMs);
  const resumeAfter = new Date(resetAt.getTime() + Math.max(0, resumeDelayMs));

  return {
    detectedAt: now.toISOString(),
    inferredReset: !parsedReset,
    outputSnippet: textSnippet(combinedText),
    reason: "runner_cooldown",
    resetAt: resetAt.toISOString(),
    resetSource: parsedReset?.source || "fallback cooldown window",
    resumeAfter: resumeAfter.toISOString(),
    timeZone: parsedReset?.timeZone || options.defaultTimeZone || DEFAULT_TIME_ZONE,
  };
}

export function classifyRunnerEnvironmentUnavailable(result, options = {}) {
  if (!result || result.timedOut) {
    return null;
  }

  const combinedText = runnerFailureText(result);
  if (!ENVIRONMENT_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    return null;
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const retryMs = Number(options.retryMs || 5 * 60 * 1000);
  const retryAfter = new Date(now.getTime() + Math.max(0, retryMs));

  return {
    detectedAt: now.toISOString(),
    outputSnippet: textSnippet(combinedText),
    reason: "runner_environment_unavailable",
    resetAt: retryAfter.toISOString(),
    resetSource: "fallback environment retry window",
    resumeAfter: retryAfter.toISOString(),
    timeZone: options.defaultTimeZone || DEFAULT_TIME_ZONE,
  };
}
