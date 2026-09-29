/* USA-273: scheduling a DOS meeting intermittently answered Gateway Timeout /
   500 and the user resubmitted -- six times, on 2026-09-12. The cause was one
   request doing two jobs: writing the meeting, then holding the invocation open
   on an unbounded Google Calendar call until the platform killed it.

   These checks defend the split. The first half executes the shipped decision
   module; the second half pins the wiring in the route, the library and the
   client, because those are HTTP and React code the harness cannot invoke. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  dosCalendarSyncCanRetry,
  dosCalendarSyncFailedWarning,
  dosCalendarSyncWarning,
  dosMeetingCalendarDescription,
  dosMeetingCalendarTitle,
  dosMeetingSaveResponse,
  dosSaveFailureMessage,
  dosSaveGenericFailureMessage,
  dosSaveTemporaryFailureMessage,
  dosSaveUnreachableMessage,
  isDosCalendarSyncState,
} from "../src/lib/dos/meeting-calendar-sync.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const failures = [];
const check = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

/* ---- A saved meeting always reports as saved ---------------------------- */

for (const state of ["disabled", "synced", "not_connected", "needs_reconnect", "failed"]) {
  const response = dosMeetingSaveResponse("meeting-1", state);

  assert.equal(response.ok, true, `a saved meeting reports ok with calendar state "${state}"`);
  assert.equal(response.id, "meeting-1", "the saved meeting id is always returned");
  assert.equal(response.calendarSync, state, "the calendar outcome travels beside the meeting, not instead of it");
}

/* A clean schedule says nothing about the calendar; a failed sync says the
   meeting saved FIRST, because that is the question being asked. */
assert.equal(dosMeetingSaveResponse("m", "synced").calendarWarning, null);
assert.equal(dosMeetingSaveResponse("m", "disabled").calendarWarning, null);
assert.equal(dosMeetingSaveResponse("m", "failed").calendarWarning, dosCalendarSyncFailedWarning);
assert.match(dosCalendarSyncFailedWarning, /^Meeting scheduled\./, "the recoverable state opens by confirming the meeting saved");
assert.match(dosCalendarSyncFailedWarning, /Google Calendar sync failed/, "and names which half failed");
assert.match(dosCalendarSyncWarning("not_connected") ?? "", /^Meeting scheduled\./);
assert.match(dosCalendarSyncWarning("needs_reconnect") ?? "", /^Meeting scheduled\./);

/* Only a failure is retryable: not-connected and needs-reconnect are fixed in
   Settings, so offering Retry there would be a dead button. */
assert.equal(dosCalendarSyncCanRetry("failed"), true);
assert.equal(dosCalendarSyncCanRetry("not_connected"), false);
assert.equal(dosCalendarSyncCanRetry("needs_reconnect"), false);
assert.equal(dosCalendarSyncCanRetry("synced"), false);
assert.equal(dosCalendarSyncCanRetry("disabled"), false);

assert.equal(isDosCalendarSyncState("failed"), true);
assert.equal(isDosCalendarSyncState("Gateway Timeout"), false);
assert.equal(isDosCalendarSyncState(undefined), false);

/* ---- The three failure states the user can be in ------------------------ */

/* 1. The meeting itself did not save, and the request never landed. */
assert.equal(dosSaveFailureMessage(null), dosSaveUnreachableMessage);
assert.match(dosSaveUnreachableMessage, /Nothing was saved/, "an unsent request says nothing was saved");

/* 2. Temporary backend failure: safe to retry, because the write is keyed. */
for (const status of [408, 425, 429, 500, 502, 503, 504]) {
  assert.equal(dosSaveFailureMessage(status), dosSaveTemporaryFailureMessage, `HTTP ${status} is a safe retry`);
}
assert.match(dosSaveTemporaryFailureMessage, /Try again/, "a temporary failure tells the user to try again");
assert.match(dosSaveTemporaryFailureMessage, /Nothing was lost/, "and that retrying is safe");

/* 3. Anything else is a real rejection the server explained. */
assert.equal(dosSaveFailureMessage(400), dosSaveGenericFailureMessage);
assert.equal(dosSaveFailureMessage(403), dosSaveGenericFailureMessage);

for (const message of [dosSaveUnreachableMessage, dosSaveTemporaryFailureMessage, dosCalendarSyncFailedWarning]) {
  assert.ok(!/gateway timeout/i.test(message), "no user-facing message is the raw platform error");
}

/* ---- The retried calendar event is the same event ----------------------- */

/* Title and description are shared so the retry endpoint rebuilds an identical
   event rather than a near-miss copy that would look like a second meeting. */
assert.equal(dosMeetingCalendarTitle(["Anthony Mounsa"], "kitchen_table"), "Meeting with Anthony Mounsa");
assert.equal(dosMeetingCalendarTitle(["A", "B", "C"], "kitchen_table"), "Meeting with A, B +");
assert.equal(dosMeetingCalendarTitle([], "kitchen_table"), "kitchen table meeting");
assert.equal(dosMeetingCalendarTitle(["  "], "one_on_one"), "one on one meeting", "blank names never become a title");
assert.equal(dosMeetingCalendarDescription(null), "Created from DOS.");
assert.equal(dosMeetingCalendarDescription("  notes  "), "notes\n\nCreated from DOS.");

/* The derived Google event id must stay inside base32hex (0-9, a-v) or Google
   rejects the create outright -- which would turn the idempotency fix into a
   permanent sync failure. */
const derivedEventId = `dos${createHash("sha256").update("meeting:3f1c2a7e-0000-4000-8000-000000000001").digest("hex").slice(0, 40)}`;

assert.match(derivedEventId, /^[0-9a-v]{5,1024}$/, "the derived Google event id is valid base32hex");
assert.equal(derivedEventId.length, 43);

/* ---- Wiring: the meeting write and the calendar write are separate ------ */

const meetingsRoute = read("app/api/dos/app/meetings/route.ts");
const googleCalendar = read("src/lib/dos/google-calendar.ts");
const eventSyncRoute = read("app/api/dos/app/calendar/google/event-sync/route.ts");
const syncRoute = read("app/api/dos/app/calendar/google/sync/route.ts");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const packageJson = JSON.parse(read("package.json"));

check(
  meetingsRoute.split("dosMeetingSaveResponse(String(data.id), calendarSync)").length === 3,
  "Both the create and the update path must answer through dosMeetingSaveResponse, so the calendar outcome can never become the HTTP status.",
);

/* Nothing between the calendar sync and the answer may reject the request: the
   meeting is already written by then. */
const calendarSyncStart = meetingsRoute.indexOf("const calendarSync: DosCalendarSyncState");
const calendarSyncEnd = meetingsRoute.indexOf("dosMeetingSaveResponse(String(data.id), calendarSync)", calendarSyncStart);
const calendarSyncBlock = calendarSyncStart >= 0 && calendarSyncEnd > calendarSyncStart
  ? meetingsRoute.slice(calendarSyncStart, calendarSyncEnd)
  : "";

check(calendarSyncBlock.length > 0, "The meetings route must compute a calendar state and then answer with it.");
check(
  !/status:\s*(4|5)\d\d/.test(calendarSyncBlock),
  "No error status may be returned between writing the meeting and answering the request.",
);
check(
  calendarSyncBlock.includes(': "disabled";'),
  "A meeting scheduled without Google sync must report the disabled state rather than omitting the field.",
);
check(
  meetingsRoute.includes("): Promise<DosCalendarSyncState> {")
    && meetingsRoute.includes("return syncDosMeetingCalendarEvent(input);"),
  "The meetings route must delegate calendar sync to the shared helper that returns a state instead of throwing.",
);
check(
  !meetingsRoute.includes("syncGoogleCalendarEvent(")
    && !meetingsRoute.includes("meetingTitleForCalendar"),
  "The meetings route must no longer build or write Google events itself.",
);
check(
  meetingsRoute.includes('console.info("[DOS meetings] saved"')
    && meetingsRoute.includes('console.error("[DOS meetings] save failed"')
    && googleCalendar.includes('console.info("[DOS calendar] meeting sync"')
    && googleCalendar.includes('console.warn("[DOS calendar] meeting sync failed"'),
  "Production logs must name the meeting-save phase and the calendar-sync phase separately.",
);
check(
  meetingsRoute.includes("durationMs: Date.now() - requestStartedAt")
    && googleCalendar.includes("durationMs: Date.now() - startedAt"),
  "Both phases must log their duration, so an intermittent slow dependency is identifiable from the logs.",
);
check(
  meetingsRoute.includes("replayedExistingMeeting = true")
    && meetingsRoute.includes("replayed: replayedExistingMeeting"),
  "A replayed idempotent write must be visible in the logs rather than looking like a fresh meeting.",
);
check(
  meetingsRoute.includes("export const maxDuration") && syncRoute.includes("export const maxDuration"),
  "Both incident endpoints must declare a duration ceiling.",
);

/* ---- Wiring: no Google call may run unbounded --------------------------- */

check(
  googleCalendar.includes("AbortSignal.timeout(timeoutMs)")
    && googleCalendar.includes("const googleRequestTimeoutMs")
    && googleCalendar.includes("googleTimeout"),
  "Google requests must be bounded by a timeout that is reported as a dependency failure.",
);

const unboundedGoogleFetches = googleCalendar
  .split("\n")
  .map((line, index) => ({ index: index + 1, line }))
  .filter(({ line }) => /await fetch\(/.test(line) && !/signal: AbortSignal\.timeout/.test(line));

check(
  unboundedGoogleFetches.length === 0,
  `Every Google call must go through googleFetch; unbounded fetch remains at line(s) ${unboundedGoogleFetches.map(({ index }) => index).join(", ")}.`,
);

/* ---- Wiring: retrying cannot duplicate ---------------------------------- */

check(
  googleCalendar.includes("export function googleCalendarEventIdForSource")
    && googleCalendar.includes('createHash("sha256").update(`${sourceType}:${sourceId}`)')
    && googleCalendar.includes("isGoogleCalendarDuplicateEventError(createError)"),
  "The Google event id must be derived from the DOS record and a duplicate must be adopted, not re-created.",
);
check(
  googleCalendar.includes('onConflict: "workspace_id,source_type,source_id,provider"'),
  "The calendar link must upsert on a stable key so repeated syncs cannot create a second link.",
);
check(
  client.includes("scheduleOperationKeyRef")
    && client.includes("scheduleOperationKeyRef.current = scheduleOperationKeyRef.current ?? crypto.randomUUID()")
    && client.includes("idempotencyKey: scheduleOperationKeyRef.current"),
  "Scheduling must carry one operation id that every retry reuses, so a resubmit cannot create a second meeting.",
);
check(
  meetingsRoute.includes("if (error && idempotencyKey && isUniqueViolation(error))")
    && meetingsRoute.includes('.eq("id", idempotencyKey)'),
  "The server must answer a replayed operation id with the meeting it already wrote.",
);

/* ---- Wiring: the calendar retries on its own ---------------------------- */

check(
  eventSyncRoute.includes("syncDosMeetingCalendarEvent")
    && eventSyncRoute.includes("dosCalendarSyncWarning")
    && eventSyncRoute.includes("requireDosWorkspaceRouteAccess"),
  "The calendar retry endpoint must re-run the shared sync under the same workspace authorization.",
);
check(
  eventSyncRoute.includes('or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)'),
  "The retry endpoint must only sync a meeting inside the caller's workspace.",
);
check(
  client.includes("function retryMeetingCalendarSync(meetingId: string)")
    && client.includes('fetch("/api/dos/app/calendar/google/event-sync"'),
  "Retry must call the calendar endpoint, never resubmit the meeting.",
);
check(
  client.includes("meetingCalendarAlert")
    && client.includes("dosCalendarSyncCanRetry(meetingCalendarAlert.state)")
    && client.includes("setMeetingCalendarAlert(null)"),
  "The saved-but-unsynced state must be shown with a Retry action and be dismissible.",
);
check(
  client.includes("disabled={isRetryingCalendarSync}"),
  "Repeated taps on Retry must not fire overlapping calendar writes.",
);
check(
  client.includes("dosSaveFailureMessage(response.status)")
    && client.includes("dosSaveFailureMessage(null)")
    && client.includes("let reachedServer = false"),
  "The client must tell an unreachable server apart from one that answered, instead of showing the raw gateway error.",
);

/* ---- Wiring: one bad calendar cannot fail the whole pull ---------------- */

check(
  googleCalendar.includes("failedSourceCount")
    && googleCalendar.includes('status: failedSourceCount ? "partial" as const : "synced" as const'),
  "A single failing calendar source must be reported as partial, not thrown out of the pull.",
);
check(
  syncRoute.includes('result.status === "partial"') && client.includes('result.status === "partial"'),
  "The sync route and the client must both handle a partial pull instead of treating it as a failure.",
);

/* ---- The suite must actually run ---------------------------------------- */

check(
  typeof packageJson.scripts["test:dos-scheduling-reliability"] === "string"
    && packageJson.scripts["test:dos"].includes("test:dos-scheduling-reliability"),
  "This suite must be registered and included in the test:dos chain.",
);

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }

  process.exit(1);
}

console.log("DOS scheduling reliability regression checks passed.");
