#!/usr/bin/env node
// Unit regression for the advisor access throttle.
//
// Time is injected rather than waited on, so the 15-minute window and its
// expiry are exercised in milliseconds. Run with Node's type stripping:
//   node --experimental-strip-types scripts/advisor-access-throttle-regression.mjs

import {
  ADVISOR_MAX_FAILED_ATTEMPTS,
  ADVISOR_RATE_LIMIT_MAX_CLIENTS,
  ADVISOR_RATE_LIMIT_WINDOW_MS,
  advisorRateLimitSize,
  clearAdvisorFailedAttempts,
  getAdvisorRateLimitState,
  recordAdvisorFailedAttempt,
  resetAdvisorRateLimit,
} from "../src/lib/advisor-rate-limit.ts";

const failures = [];
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(detail ? `${label} — ${detail}` : label);
}

const CLIENT = "client-a";
const OTHER = "client-b";
const T0 = 1_000_000;

/* -- allowed attempts: the budget is not spent early -------------------- */

resetAdvisorRateLimit();

for (let attempt = 1; attempt < ADVISOR_MAX_FAILED_ATTEMPTS; attempt += 1) {
  recordAdvisorFailedAttempt(CLIENT, T0);
  const state = getAdvisorRateLimitState(CLIENT, T0);
  check(
    `attempt ${attempt} of ${ADVISOR_MAX_FAILED_ATTEMPTS} is still allowed`,
    !state.limited,
    `limited=${state.limited}`,
  );
}

/* -- lockout on the limit ----------------------------------------------- */

recordAdvisorFailedAttempt(CLIENT, T0);
const locked = getAdvisorRateLimitState(CLIENT, T0);
check(`attempt ${ADVISOR_MAX_FAILED_ATTEMPTS} triggers lockout`, locked.limited);

/* -- Retry-After is correct and shrinks as the window elapses ----------- */

check(
  "Retry-After at lockout equals the full window",
  locked.retryAfterSeconds === ADVISOR_RATE_LIMIT_WINDOW_MS / 1000,
  `got ${locked.retryAfterSeconds}`,
);

const midway = getAdvisorRateLimitState(CLIENT, T0 + 5 * 60 * 1000);
check(
  "Retry-After shrinks as the window elapses",
  midway.limited && midway.retryAfterSeconds === 10 * 60,
  `got ${midway.retryAfterSeconds}`,
);

const nearlyOver = getAdvisorRateLimitState(CLIENT, T0 + ADVISOR_RATE_LIMIT_WINDOW_MS - 1);
check("Retry-After never reaches 0 while limited", nearlyOver.retryAfterSeconds >= 1);

check(
  "further failures do not extend the window",
  (() => {
    recordAdvisorFailedAttempt(CLIENT, T0 + 60_000);
    const s = getAdvisorRateLimitState(CLIENT, T0 + 60_000);
    return s.limited && s.retryAfterSeconds === 14 * 60;
  })(),
);

/* -- one client's lockout does not affect another ----------------------- */

check("a different client is unaffected", !getAdvisorRateLimitState(OTHER, T0).limited);

/* -- expiration ---------------------------------------------------------- */

check(
  "the lockout expires exactly at the window boundary",
  !getAdvisorRateLimitState(CLIENT, T0 + ADVISOR_RATE_LIMIT_WINDOW_MS).limited,
);
check(
  "the lockout is over well after the window",
  !getAdvisorRateLimitState(CLIENT, T0 + ADVISOR_RATE_LIMIT_WINDOW_MS + 1000).limited,
);

check(
  "a failure after expiry starts a fresh window",
  (() => {
    const later = T0 + ADVISOR_RATE_LIMIT_WINDOW_MS + 5000;
    recordAdvisorFailedAttempt(CLIENT, later);
    return !getAdvisorRateLimitState(CLIENT, later).limited;
  })(),
);

/* -- success resets the client ------------------------------------------ */

resetAdvisorRateLimit();

for (let i = 0; i < ADVISOR_MAX_FAILED_ATTEMPTS; i += 1) {
  recordAdvisorFailedAttempt(CLIENT, T0);
}

check("locked out before success", getAdvisorRateLimitState(CLIENT, T0).limited);

clearAdvisorFailedAttempts(CLIENT);

check("successful authentication clears the lockout", !getAdvisorRateLimitState(CLIENT, T0).limited);
check("cleared client is no longer tracked", advisorRateLimitSize() === 0);

check(
  "the full budget is available again after a success",
  (() => {
    for (let i = 0; i < ADVISOR_MAX_FAILED_ATTEMPTS - 1; i += 1) {
      recordAdvisorFailedAttempt(CLIENT, T0);
    }
    return !getAdvisorRateLimitState(CLIENT, T0).limited;
  })(),
);

/* -- the store is bounded and pruned ------------------------------------ */

resetAdvisorRateLimit();

// Expired records are dropped rather than accumulating.
for (let i = 0; i < 50; i += 1) {
  recordAdvisorFailedAttempt(`stale-${i}`, T0);
}
check("stale records are present before expiry", advisorRateLimitSize() === 50);

recordAdvisorFailedAttempt("fresh", T0 + ADVISOR_RATE_LIMIT_WINDOW_MS + 1);
check(
  "expired records are pruned on the next write",
  advisorRateLimitSize() === 1,
  `size=${advisorRateLimitSize()}`,
);

// A spray of unique clients inside one window cannot exceed the hard cap.
resetAdvisorRateLimit();

for (let i = 0; i < ADVISOR_RATE_LIMIT_MAX_CLIENTS + 250; i += 1) {
  recordAdvisorFailedAttempt(`spray-${i}`, T0);
}
check(
  "the store never exceeds its hard cap",
  advisorRateLimitSize() <= ADVISOR_RATE_LIMIT_MAX_CLIENTS,
  `size=${advisorRateLimitSize()} cap=${ADVISOR_RATE_LIMIT_MAX_CLIENTS}`,
);

resetAdvisorRateLimit();

/* ------------------------------------------------------------------------ */

if (failures.length > 0) {
  console.error(`\nadvisor access throttle: ${failures.length} of ${checks} checks failed\n`);
  failures.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}

console.log(`advisor access throttle: all ${checks} checks passed`);
