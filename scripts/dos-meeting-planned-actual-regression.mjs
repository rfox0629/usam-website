// USA-246 — planned versus actual meeting time.
//
// A scheduled meeting and the meeting that eventually happened are one record.
// Before this work there was one pair of time columns for both, so logging
// stamped a synthetic local noon over the time the meeting was scheduled for —
// every one of the 59 logged meetings in production sits at exactly 12:00.
// These checks hold the contract that fixed it.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const route = read("app/api/dos/app/meetings/route.ts");
const reader = read("src/lib/dos/missionary-app.ts");
const migration = read("supabase/migrations/20260908180000_usa_246_planned_vs_actual_meeting_time.sql");
const rollback = read("supabase/migrations/20260908180000_usa_246_planned_vs_actual_meeting_time_rollback.sql");

// 1. The migration is additive, constrained, and backfills only what is known.
for (const column of ["planned_start_at", "planned_end_at", "planned_date", "planned_duration_minutes", "planned_timezone", "lifecycle_id", "logged_at", "log_operation_key"]) {
  assert(migration.includes(`add column if not exists ${column}`), `${column} must be added by the migration.`);
  assert(rollback.includes(`drop column if exists ${column}`), `${column} must be dropped by the rollback.`);
}
assert(!/alter\s+column|drop\s+column(?![^;]*if exists)/i.test(migration), "The migration must not alter or drop an existing column.");
assert(migration.includes("missionary_tables_planned_range_check"), "Planned end must be constrained to follow planned start.");
assert(migration.includes("where log_operation_key is not null"), "The idempotency index must be partial so null keys never collide.");
assert(
  migration.includes("where meeting_status = 'scheduled'") && migration.includes("and planned_start_at is null"),
  "Only still-scheduled meetings may be backfilled, and only once.",
);
assert(!/update[\s\S]*set[\s\S]*logged_at\s*=/i.test(migration), "logged_at must never be backfilled: when a historical meeting was logged is unknown.");
assert(migration.includes("set lifecycle_id = id"), "The lifecycle id backfill must be deterministic.");

// 2. Scheduling records the plan; logging records the actual and leaves the plan alone.
assert(
  client.includes("plannedDate: scheduledDate")
    && client.includes("plannedEndAt: scheduledEndAt")
    && client.includes("plannedStartAt: scheduledStartAt")
    && client.includes("plannedTimezone: timezone"),
  "Scheduling a meeting must snapshot its planned date, start, end and timezone.",
);
const loggingBlock = client.slice(client.indexOf("if (isLoggingScheduledMeeting) {"), client.indexOf("if (isLoggingScheduledMeeting) {") + 900);
assert(
  !/planned(Date|StartAt|EndAt|Timezone|DurationMinutes)/.test(loggingBlock),
  "The logging write must not send the planned snapshot, so the server cannot overwrite it.",
);
assert(loggingBlock.includes("payload.logOperationKey = loggingOperationKeyRef.current;"), "Logging must carry an idempotency key.");

// 3. The synthetic noon stamp is no longer what a planned meeting records.
assert(
  client.includes('const actualTimeInput = String(formData.get("actual_start_time") ?? "").trim();')
    && client.includes('localDateTimeIso(tableDate, actualTimeInput || plannedClockTime || "12:00")'),
  "The actual start must come from the correction field, then the planned start, and only then the historical noon placeholder.",
);
assert(
  client.includes('<DisclosureSection description="Only if it started at a different time." title="Adjust time">'),
  "A compact Adjust time disclosure must exist for a start that differed from the plan.",
);
assert(
  client.includes("{plannedStartAtDefault ? (")
    && client.includes('plannedStartAtDefault={selectedMeeting.meetingStatus === "scheduled" ? selectedMeeting.plannedStartAt ?? selectedMeeting.scheduledStartAt : null}'),
  "Adjust time belongs only to a meeting that was actually scheduled.",
);

// 4. The server keeps the plan, stamps the log, and is idempotent.
assert(route.includes("function plannedSnapshotFields(payload: MeetingPayload)"), "The server must read the planned snapshot from the payload.");
assert(
  route.includes("...(plannedSnapshotFields(payload) ?? {}),"),
  "An update writes the plan only when the caller sends one, so logging leaves it untouched.",
);
assert(
  route.includes('...(meetingStatus === "logged" ? {\n      logged_at: new Date().toISOString(),'),
  "Completing a meeting must stamp logged_at.",
);
assert(route.includes("async function alreadyLoggedWithKey("), "The server must be able to detect an already-applied logging write.");
assert(route.includes('return NextResponse.json({ id, status: "already_applied" });'), "A repeated logging write must be a no-op rather than a second transition.");
assert(
  route.includes('const plannedKeys = ["planned_start_at", "planned_end_at", "planned_date", "planned_duration_minutes", "planned_timezone", "lifecycle_id", "logged_at", "log_operation_key"];'),
  "The new columns must be droppable so code deployed ahead of the schema still writes.",
);

// 5. There is still exactly one meeting record.
assert(
  !/insert[\s\S]{0,400}meeting_status:\s*"logged"/.test(client),
  "Logging an existing scheduled meeting must never insert a second record.",
);
assert(
  route.includes(".update(candidate)"),
  "The scheduled-to-logged transition stays an update of the same row.",
);

// 6. The plan is readable, and shown only when it differs.
for (const field of ["planned_start_at", "planned_end_at", "planned_duration_minutes", "logged_at"]) {
  assert(reader.includes(field), `${field} must be selected so the app can compare plan with actual.`);
}
assert(reader.includes("plannedStartAt: meeting.planned_start_at ?? null"), "The reader must expose the planned start.");
assert(client.includes("function plannedVersusActualLine(meeting: DosAppMeeting)"), "There must be one place that decides whether the plan is worth showing.");
assert(
  client.includes('if (meeting.meetingStatus !== "logged" || !meeting.plannedStartAt) {'),
  "A meeting with no captured plan must say nothing, which is every meeting logged before this change.",
);
assert(client.includes("if (sameStart && sameDuration) {"), "A meeting that ran as planned must not add noise.");

console.log("DOS meeting planned-versus-actual (USA-246) regression passed.");
