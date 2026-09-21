/**
 * Failed-attempt throttling for the advisor access endpoint.
 *
 * DEFENCE IN DEPTH, NOT THE PRIMARY CONTROL.
 *
 * This limiter lives in the memory of a single serverless instance. Vercel may
 * run several instances concurrently and may recycle them at any time, so the
 * counters are NOT durable and NOT shared: an attacker spread across instances
 * gets more than `ADVISOR_MAX_FAILED_ATTEMPTS` tries in total, and a cold start
 * forgets everything it had counted.
 *
 * It is still worth having — it ends the cheapest attack, a fast loop against
 * one warm instance — but the real protection against brute force is a long,
 * unguessable ADVISOR_ACCESS_KEY. Treat this as a speed bump, not a lock.
 *
 * A durable limiter would need shared state (Redis, Postgres, Edge Config).
 * That is a deliberate non-goal here: no new paid service and no migration.
 *
 * Nothing in this module reads, stores, or emits a submitted code, a cookie, a
 * payload, or a raw IP address. Clients are identified only by a truncated
 * hash of their address, held in memory and never logged.
 */

export const ADVISOR_MAX_FAILED_ATTEMPTS = 5;
export const ADVISOR_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Hard ceiling on tracked clients, so a spray of unique addresses cannot grow
// the map without bound. Expired records are pruned first; if the map is still
// full, the oldest window is evicted.
export const ADVISOR_RATE_LIMIT_MAX_CLIENTS = 10_000;

type FailureRecord = {
  count: number;
  windowStartedAt: number;
};

const failuresByClient = new Map<string, FailureRecord>();

function isExpired(record: FailureRecord, now: number) {
  return now - record.windowStartedAt >= ADVISOR_RATE_LIMIT_WINDOW_MS;
}

function pruneExpired(now: number) {
  // Map.forEach rather than for...of: this project compiles to an ES5 target,
  // where iterating a Map directly is not available.
  const expired: string[] = [];

  failuresByClient.forEach((record, key) => {
    if (isExpired(record, now)) {
      expired.push(key);
    }
  });

  expired.forEach((key) => {
    failuresByClient.delete(key);
  });
}

function enforceCapacity() {
  if (failuresByClient.size < ADVISOR_RATE_LIMIT_MAX_CLIENTS) {
    return;
  }

  // Map preserves insertion order, but a record's window is refreshed in place,
  // so scan for the genuinely oldest window rather than trusting that order.
  let oldestKey: string | null = null;
  let oldestStartedAt = Number.POSITIVE_INFINITY;

  failuresByClient.forEach((record, key) => {
    if (record.windowStartedAt < oldestStartedAt) {
      oldestKey = key;
      oldestStartedAt = record.windowStartedAt;
    }
  });

  if (oldestKey !== null) {
    failuresByClient.delete(oldestKey);
  }
}

export type AdvisorRateLimitState = {
  limited: boolean;
  /** Whole seconds until the window expires; 0 when not limited. */
  retryAfterSeconds: number;
};

/**
 * Whether this client is currently locked out, and for how much longer.
 * Read-only: it never records an attempt.
 */
export function getAdvisorRateLimitState(
  clientKey: string,
  now: number = Date.now(),
): AdvisorRateLimitState {
  const record = failuresByClient.get(clientKey);

  if (!record || isExpired(record, now)) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (record.count < ADVISOR_MAX_FAILED_ATTEMPTS) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  const remainingMs = record.windowStartedAt + ADVISOR_RATE_LIMIT_WINDOW_MS - now;

  return {
    limited: true,
    // Always at least one second, so a Retry-After of 0 never invites an
    // immediate retry that would just be refused again.
    retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
  };
}

/**
 * Count one failed authentication attempt. The 15-minute window is anchored to
 * the first failure, so a locked-out client is released a fixed 15 minutes
 * after that first attempt rather than being extended by further guesses.
 */
export function recordAdvisorFailedAttempt(clientKey: string, now: number = Date.now()) {
  pruneExpired(now);

  const record = failuresByClient.get(clientKey);

  if (!record || isExpired(record, now)) {
    enforceCapacity();
    failuresByClient.set(clientKey, { count: 1, windowStartedAt: now });
    return;
  }

  record.count += 1;
}

/** Called after a successful authentication: that client starts clean. */
export function clearAdvisorFailedAttempts(clientKey: string) {
  failuresByClient.delete(clientKey);
}

/* -- test seams -------------------------------------------------------- */

export function resetAdvisorRateLimit() {
  failuresByClient.clear();
}

export function advisorRateLimitSize() {
  return failuresByClient.size;
}
