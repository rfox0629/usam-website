/* USA-282 follow-up: the DELETE handlers, end to end.
 *
 * Real route modules -> real supabase-js -> real PostgREST -> real Postgres
 * running the repository's own migrations. The only substitution is
 * getDosAuthorization(), which reads a session cookie; everything it feeds
 * (workspace access, scope loading, the feature flag, the guards, the
 * deletes) runs for real.
 *
 * Every row involved belongs to two throwaway workspaces created by seed.sql.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const seedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "dos-accountability-e2e", "seed.sql");
const port = process.env.USA282_PGPORT ?? "55432";

const WS_A = "00000000-0000-4282-8000-0000000000a1";
const WS_B = "00000000-0000-4282-8000-0000000000b1";
const RHYTHM = "00000000-0000-4282-8000-000000000101";
const FOLLOW_UP = "00000000-0000-4282-8000-000000000102";
const OTHER_WORKSPACE_RHYTHM = "00000000-0000-4282-8000-000000000103";
const GOAL = "00000000-0000-4282-8000-000000000201";
const MISSED_RHYTHM = "00000000-0000-4282-8000-000000000104";
const PERSON = "00000000-0000-4282-8000-0000000000a2";
const SHADOW_COMMITMENT = "00000000-0000-4282-8000-000000000202";

const sql = (query) => execFileSync("psql", [
  "-h", "127.0.0.1", "-p", port, "-U", "postgres", "-d", "usam_test", "-tAc", query,
], { encoding: "utf8" }).trim();

const reseed = () => execFileSync("psql", [
  "-h", "127.0.0.1", "-p", port, "-U", "postgres", "-d", "usam_test", "-q", "-v", "ON_ERROR_STOP=1",
  "-f", seedPath,
], { encoding: "utf8" });

const { DELETE: deleteSchedule } = await import("../app/api/dos/app/accountability/schedules/route.ts");
const { DELETE: deleteCommitment } = await import("../app/api/dos/app/commitments/route.ts");
const { POST: recordCheckIn } = await import("../app/api/dos/app/accountability/check-ins/route.ts");

const identities = {
  admin: { access: "admin", email: "admin@example.test", role: "admin", status: "authorized", userId: "00000000-0000-4282-8000-00000000ad01" },
  member: { access: "member", email: "member@example.test", status: "authorized", userId: "00000000-0000-4282-8000-00000000be01" },
  unauthenticated: { status: "unauthenticated" },
};

function as(identity) {
  globalThis.__usa282Authorization__ = identities[identity];
}

const request = (body, method = "DELETE") => new Request("http://localhost/api", {
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
  method,
});

const results = [];
async function check(label, run) {
  try {
    await run();
    results.push({ label, ok: true });
    console.log(`PASS  ${label}`);
  } catch (error) {
    results.push({ label, ok: false });
    console.log(`FAIL  ${label}\n      ${error.message.split("\n").slice(0, 4).join("\n      ")}`);
  }
}

const call = async (handler, body, method = "DELETE") => {
  const response = await handler(request(body, method));
  return { body: await response.json().catch(() => ({})), status: response.status };
};
const post = (handler, body) => call(handler, body, "POST");

// --- authorization -----------------------------------------------------
await check("An unauthenticated caller cannot delete a schedule", async () => {
  as("unauthenticated");
  const result = await call(deleteSchedule, { id: RHYTHM, workspaceId: WS_A });
  assert.equal(result.status, 401);
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${RHYTHM}'`), "1");
});

await check("An unauthenticated caller cannot delete a goal", async () => {
  as("unauthenticated");
  const result = await call(deleteCommitment, { id: GOAL, workspaceId: WS_A });
  assert.equal(result.status, 401);
  assert.equal(sql(`select count(*) from dos_person_commitments where id = '${GOAL}'`), "1");
});

await check("A signed-in user without access to the workspace is refused", async () => {
  as("member");
  const result = await call(deleteSchedule, { id: RHYTHM, workspaceId: WS_A });
  assert.equal(result.status, 403, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.match(result.body.error, /do not have access/i);
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${RHYTHM}'`), "1");
});

await check("A record in another workspace is not found from this one", async () => {
  as("admin");
  const result = await call(deleteSchedule, { id: OTHER_WORKSPACE_RHYTHM, workspaceId: WS_A });
  assert.equal(result.status, 404, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${OTHER_WORKSPACE_RHYTHM}'`), "1",
    "workspace B's rhythm is untouched");
});

// --- the Journey refusals ----------------------------------------------
await check("A Journey's generated follow-up refuses deletion", async () => {
  as("admin");
  const result = await call(deleteSchedule, { id: FOLLOW_UP, workspaceId: WS_A });
  assert.equal(result.status, 409, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.match(result.body.error, /belongs to a Journey/i);
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "1");
});

await check("A Journey's shadow commitment refuses deletion", async () => {
  as("admin");
  const result = await call(deleteCommitment, { id: SHADOW_COMMITMENT, workspaceId: WS_A });
  assert.equal(result.status, 409, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.match(result.body.error, /belongs to a Journey/i);
  assert.equal(sql(`select count(*) from dos_person_commitments where id = '${SHADOW_COMMITMENT}'`), "1");
  assert.equal(sql(`select count(*) from dos_resource_assignments where linked_commitment_id = '${SHADOW_COMMITMENT}'`), "1",
    "the assignment still points at it");
});

// --- the deletes themselves ---------------------------------------------
await check("Deleting a rhythm removes it and keeps the check-ins recorded under it", async () => {
  /* Every case that writes starts from the same fixture, so the script does
     not depend on the order it ran in -- or on what a previous run left. */
  reseed();
  as("admin");
  assert.equal(sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${RHYTHM}'`), "2");

  const result = await call(deleteSchedule, { id: RHYTHM, workspaceId: WS_A });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(result.body.deletedScheduleId, RHYTHM);
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${RHYTHM}'`), "0", "the rhythm is gone");
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where id in ('00000000-0000-4282-8000-000000000111','00000000-0000-4282-8000-000000000112')`),
    "2",
    "both recorded check-ins survive",
  );
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where id in ('00000000-0000-4282-8000-000000000111','00000000-0000-4282-8000-000000000112') and schedule_id is null`),
    "2",
    "they are detached rather than deleted",
  );
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where person_id = '${PERSON}'`),
    "5",
    "every check-in on the person's record is still there",
  );
});

await check("Deleting a goal removes it with its own progress, and leaves the check-ins beside it", async () => {
  reseed();
  as("admin");
  assert.equal(sql(`select count(*) from dos_commitment_updates where commitment_id = '${GOAL}'`), "2");

  const result = await call(deleteCommitment, { id: GOAL, workspaceId: WS_A });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(result.body.deletedCommitmentId, GOAL);
  assert.equal(sql(`select count(*) from dos_person_commitments where id = '${GOAL}'`), "0", "the goal is gone");
  assert.equal(sql(`select count(*) from dos_commitment_updates where commitment_id = '${GOAL}'`), "0",
    "its own progress goes with it");
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where id = '00000000-0000-4282-8000-000000000113'`),
    "1",
    "the check-in written beside it stays on the record",
  );
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "1",
    "nothing else in the workspace is touched");
});

await check("Deleting the same record twice reports not found rather than erroring", async () => {
  reseed();
  as("admin");
  assert.equal((await call(deleteSchedule, { id: RHYTHM, workspaceId: WS_A })).status, 200);
  const second = await call(deleteSchedule, { id: RHYTHM, workspaceId: WS_A });
  assert.equal(second.status, 404);
});

await check("Workspace B's rows are untouched by everything above", async () => {
  assert.equal(sql(`select count(*) from dos_accountability_schedules where workspace_id = '${WS_B}'`), "1");
  assert.equal(sql(`select count(*) from missionary_field_people where household_id = '${WS_B}'`), "1");
});

// --- a missed rhythm, and the late check-in that catches it up -----------
await check("Four missed weeks leave ONE outstanding reminder, not four", async () => {
  reseed();

  assert.equal(
    sql(`select count(*) from dos_accountability_schedules where person_id = '${PERSON}' and title = 'Weekly with Kyle'`),
    "1",
    "one rhythm",
  );
  assert.equal(sql(`select next_check_in::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`), "2026-08-24");
  /* Nothing anywhere generates an occurrence row per missed week: the rhythm
     is one record carrying one date. */
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}'`),
    "2",
    "only the two real check-ins recorded before the gap",
  );
});

await check("Recording the late check-in advances from the day it happened", async () => {
  reseed();
  as("admin");

  const result = await post(recordCheckIn, {
    date: "2026-09-22",
    generalUpdate: "Met at the shop. Doing better.",
    scheduleId: MISSED_RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);

  // One real check-in, for the date it happened.
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}' and check_in_date = '2026-09-22'`),
    "1",
  );
  // No completed entries invented for the weeks that were missed.
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}'`),
    "3",
    "the two recorded before the gap, plus this one -- nothing back-filled",
  );
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}' and check_in_date between '2026-08-25' and '2026-09-21'`),
    "0",
    "no catch-up entries for the missed weeks",
  );
  // The next date is a week after the check-in, on the rhythm's own weekday,
  // and not another stale date in the past.
  const next = sql(`select next_check_in::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`);

  /* A cadence step from the day it happened, landing on the rhythm's own
     weekday. The check-in was a Tuesday and the rhythm is Mondays, so the
     existing rule adds a week and then snaps forward to Monday -- 13 days,
     not 6. That is the rule this repository already had; it is asserted here
     rather than changed, and raised for the founder. */
  assert.equal(next, "2026-10-05");
  assert.equal(next > "2026-09-22", true, "and is genuinely ahead of the check-in");
  assert.equal(next > sql("select current_date::text"), true, "the rhythm is not left cycling through missed dates");
  // History is preserved.
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where id in ('00000000-0000-4282-8000-000000000121','00000000-0000-4282-8000-000000000122')`),
    "2",
  );
});

await check("A back-dated check-in still leaves the rhythm due in the future", async () => {
  reseed();
  as("admin");

  /* The date is the leader's to set: "we actually met three weeks ago". One
     cadence step from that date would land in the past and the rhythm would
     read as overdue the moment it was answered. */
  const result = await post(recordCheckIn, {
    date: "2026-08-31",
    generalUpdate: "Recording this late -- we met at the end of August.",
    scheduleId: MISSED_RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}' and check_in_date = '2026-08-31'`),
    "1",
    "the check-in is saved for the date it happened",
  );

  const next = sql(`select next_check_in::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`);
  const todayKey = sql("select current_date::text");

  assert.equal(next >= todayKey, true, `next_check_in ${next} must not be in the past (today ${todayKey})`);
  assert.equal(sql(`select extract(dow from next_check_in)::int::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`), "1",
    "and it keeps the rhythm's own weekday");
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${MISSED_RHYTHM}'`),
    "3",
    "still no catch-up entries",
  );
});

await check("Checking in on one item leaves this person's other items alone", async () => {
  reseed();
  as("admin");

  const before = sql(`select status || '|' || target_date::text from dos_person_commitments where id = '${GOAL}'`);
  const result = await post(recordCheckIn, {
    date: "2026-09-22",
    generalUpdate: "Checked in on the rhythm only.",
    scheduleId: MISSED_RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(
    sql(`select status || '|' || target_date::text from dos_person_commitments where id = '${GOAL}'`),
    before,
    "the goal is untouched",
  );
  assert.equal(
    sql(`select next_check_in::text from dos_accountability_schedules where id = '00000000-0000-4282-8000-000000000101'`),
    "2026-09-20",
    "the person's other rhythm keeps its own date",
  );
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "active",
    "and the Journey's follow-up is still outstanding",
  );
});

await check("A check-in never completes a Journey or its milestone", async () => {
  reseed();
  as("admin");

  const assignmentBefore = sql(`select status from dos_resource_assignments where id = '00000000-0000-4282-8000-000000000301'`);
  const result = await post(recordCheckIn, {
    date: "2026-09-22",
    generalUpdate: "Talked about the reading.",
    scheduleId: FOLLOW_UP,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(
    sql(`select status from dos_resource_assignments where id = '00000000-0000-4282-8000-000000000301'`),
    assignmentBefore,
    "the assignment's own status is the Journey's to change",
  );
  assert.equal(
    sql(`select status from dos_person_commitments where id = '${SHADOW_COMMITMENT}'`),
    "active",
    "and its shadow commitment is not completed by a leader's check-in",
  );
  /* A one-time follow-up has no next date, so the rhythm pauses rather than
     rolling forward -- the milestone is answered, not repeated. */
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "paused");
});

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
