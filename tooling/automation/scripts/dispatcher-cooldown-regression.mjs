import assert from "node:assert/strict";
import { classifyRunnerCooldown, parseRunnerResetTime } from "../src/runner-cooldowns.mjs";

const now = new Date("2026-07-22T15:00:00.000Z");

const claudeLimit = classifyRunnerCooldown({
  code: 1,
  stderr: "",
  stdout: "You've hit your session limit - resets 1:30pm (America/Chicago)",
  timedOut: false,
}, {
  defaultTimeZone: "America/Chicago",
  now,
  resumeDelayMs: 120_000,
});

assert.equal(claudeLimit.reason, "runner_cooldown");
assert.equal(claudeLimit.resetAt, "2026-07-22T18:30:00.000Z");
assert.equal(claudeLimit.resumeAfter, "2026-07-22T18:32:00.000Z");
assert.equal(claudeLimit.inferredReset, false);

const relativeReset = parseRunnerResetTime("rate limit reached, try again in 15 minutes", {
  now,
});

assert.equal(relativeReset.resetAt.toISOString(), "2026-07-22T15:15:00.000Z");

const codexLimit = classifyRunnerCooldown({
  code: 1,
  stderr: "429 Too Many Requests. Please retry after 2 hours.",
  stdout: "",
  timedOut: false,
}, {
  now,
  resumeDelayMs: 0,
});

assert.equal(codexLimit.reason, "runner_cooldown");
assert.equal(codexLimit.resetAt, "2026-07-22T17:00:00.000Z");

const codexLimitFinalMessage = classifyRunnerCooldown({
  code: 0,
  finalText: "You've hit your usage limit. Visit settings to purchase more credits or try again at 2026-07-22T17:00:00Z.",
  stderr: "",
  stdout: "",
  timedOut: false,
}, {
  now,
  resumeDelayMs: 0,
});

assert.equal(codexLimitFinalMessage.reason, "runner_cooldown");
assert.equal(codexLimitFinalMessage.resetAt, "2026-07-22T17:00:00.000Z");

const successfulTranscriptMention = classifyRunnerCooldown({
  code: 0,
  finalText: "Validation passed and the dispatcher remains running.",
  stderr: "",
  stdout: "Source fixture: the runner_cooldown message says usage limit reached; retry later.",
  timedOut: false,
}, {
  now,
});

assert.equal(successfulTranscriptMention, null);

const unparseableLimit = classifyRunnerCooldown({
  code: 1,
  stderr: "usage limit reached; retry later",
  stdout: "",
  timedOut: false,
}, {
  defaultCooldownMs: 15 * 60 * 1000,
  now,
  resumeDelayMs: 120_000,
});

assert.equal(unparseableLimit.inferredReset, true);
assert.equal(unparseableLimit.resetAt, "2026-07-22T15:15:00.000Z");
assert.equal(unparseableLimit.resumeAfter, "2026-07-22T15:17:00.000Z");

const normalFailure = classifyRunnerCooldown({
  code: 1,
  stderr: "TypeError: Cannot read properties of undefined",
  stdout: "",
  timedOut: false,
}, {
  now,
});

assert.equal(normalFailure, null);

const timedOut = classifyRunnerCooldown({
  code: null,
  stderr: "rate limit reached",
  stdout: "",
  timedOut: true,
}, {
  now,
});

assert.equal(timedOut, null);

process.stdout.write("dispatcher cooldown regression passed\n");
