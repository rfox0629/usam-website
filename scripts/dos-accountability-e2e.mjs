/* USA-282: accountability against a real database, end to end.
 *
 * The delete handlers, Stop and its undo, the Journey synchronisation that
 * must not resurrect a stopped reminder, and what a check-in does to the
 * dates around it.
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
const { PATCH: patchSchedule } = await import("../app/api/dos/app/accountability/schedules/route.ts");
const { PATCH: patchCommitment } = await import("../app/api/dos/app/commitments/route.ts");
/* The real Journey synchronisation, reached the way a leader reaches it:
   by editing the assignment. */
const { PATCH: patchAssignment } = await import("../app/api/dos/app/resource-assignments/route.ts");

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
const patch = (handler, body) => call(handler, body, "PATCH");

const MONTHLY_RHYTHM = "00000000-0000-4282-8000-000000000105";
const THURSDAY_RHYTHM = "00000000-0000-4282-8000-000000000106";
const ASSIGNMENT = "00000000-0000-4282-8000-000000000301";

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
  // The next date is exactly a week after the check-in, and not another stale
  // date in the past.
  const next = sql(`select next_check_in::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`);

  /* Seven days from the day it actually happened. The check-in was a Tuesday
     and the rhythm was set up on Mondays; the next one is the Tuesday,
     because the rhythm follows the conversation rather than being dragged
     back to the weekday it started on. */
  assert.equal(next, "2026-09-29");
  assert.equal(sql("select extract(dow from date '2026-09-29')::int::text"), "2", "which is a Tuesday,");
  assert.equal(sql(`select day_of_week::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`), "1",
    "while the rhythm's stored day is still Monday -- it simply has no say here");
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
  /* Catching up steps by whole weeks from the check-in, so the date keeps
     the weekday the check-in itself landed on. */
  assert.equal(
    sql(`select extract(dow from next_check_in)::int::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`),
    sql("select extract(dow from date '2026-08-31')::int::text"),
    "and it keeps the weekday of the day it was answered",
  );
  assert.equal(
    sql(`select ((next_check_in - date '2026-08-31') % 7)::text from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`),
    "0",
    "a whole number of weeks after it",
  );
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
  /* A one-time follow-up has no next date, so the reminder stops rather than
     rolling forward -- the milestone is answered, not repeated. Stopping is
     not completing: the assertions above are what the Journey's own status
     says. */
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "stopped");
});

// --- Stop: the reminder ends, and nothing else does ----------------------
await check("Stopping a rhythm ends the reminder and keeps every check-in", async () => {
  reseed();
  as("admin");

  const result = await patch(patchSchedule, { id: RHYTHM, status: "stopped", workspaceId: WS_A });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${RHYTHM}'`), "stopped");
  assert.equal(sql(`select count(*) from dos_accountability_schedules where id = '${RHYTHM}'`), "1", "nothing is deleted");
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${RHYTHM}'`),
    "2",
    "its history is untouched",
  );
  assert.equal(
    sql(`select next_check_in::text from dos_accountability_schedules where id = '${RHYTHM}'`),
    "2026-09-20",
    "and the date it was on is remembered, for when it is started again",
  );
});

await check("Stopping one reminder leaves this person's others alone", async () => {
  reseed();
  as("admin");

  await patch(patchSchedule, { id: RHYTHM, status: "stopped", workspaceId: WS_A });

  assert.equal(sql(`select status from dos_accountability_schedules where id = '${MISSED_RHYTHM}'`), "active");
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "active");
  assert.equal(sql(`select status from dos_person_commitments where id = '${GOAL}'`), "active");
});

await check("Undo puts a stopped reminder back exactly as it was", async () => {
  reseed();
  as("admin");

  const before = sql(`select next_check_in::text || '|' || frequency || '|' || title from dos_accountability_schedules where id = '${RHYTHM}'`);

  await patch(patchSchedule, { id: RHYTHM, status: "stopped", workspaceId: WS_A });
  const undo = await patch(patchSchedule, { id: RHYTHM, status: "active", workspaceId: WS_A });

  assert.equal(undo.status, 200, `status ${undo.status}: ${JSON.stringify(undo.body)}`);
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${RHYTHM}'`), "active");
  assert.equal(
    sql(`select next_check_in::text || '|' || frequency || '|' || title from dos_accountability_schedules where id = '${RHYTHM}'`),
    before,
    "the reminder comes back on the same date, cadence and topic",
  );
  assert.equal(sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${RHYTHM}'`), "2");
});

await check("Stopping a goal cancels it -- it is never recorded as achieved", async () => {
  reseed();
  as("admin");

  const result = await patch(patchCommitment, { id: GOAL, status: "cancelled", workspaceId: WS_A });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(sql(`select status from dos_person_commitments where id = '${GOAL}'`), "cancelled");
  assert.equal(
    sql(`select coalesce(completed_date::text, 'null') from dos_person_commitments where id = '${GOAL}'`),
    "null",
    "no completion date is written",
  );
  assert.equal(sql(`select count(*) from dos_commitment_updates where commitment_id = '${GOAL}'`), "2",
    "the progress recorded against it stays");
});

// --- Stop on a Journey-generated reminder --------------------------------
await check("Stopping a Journey's follow-up ends the reminder, not the Journey", async () => {
  reseed();
  as("admin");

  const result = await patch(patchSchedule, { id: FOLLOW_UP, status: "stopped", workspaceId: WS_A });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "stopped");
  assert.equal(
    sql(`select status from dos_resource_assignments where id = '${ASSIGNMENT}'`),
    "in_progress",
    "the assignment is still in progress",
  );
  assert.equal(
    sql(`select coalesce(completed_at::text, 'null') from dos_resource_assignments where id = '${ASSIGNMENT}'`),
    "null",
    "and it is not completed",
  );
  assert.equal(sql(`select status from dos_person_commitments where id = '${SHADOW_COMMITMENT}'`), "active",
    "nor is the goal behind it");
  assert.equal(
    sql(`select count(*) from dos_resource_assignments where linked_commitment_id = '${SHADOW_COMMITMENT}'`),
    "1",
    "and the Journey still points at its own record",
  );
});

await check("A Journey synchronisation does not resurrect a stopped reminder", async () => {
  reseed();
  as("admin");

  await patch(patchSchedule, { id: FOLLOW_UP, status: "stopped", workspaceId: WS_A });

  /* Editing the assignment is what runs the synchronisation -- the path that
     used to force every follow-up row back to 'active'. */
  const edit = await patch(patchAssignment, { dueDate: "2026-10-20", id: ASSIGNMENT, workspaceId: WS_A });

  assert.equal(edit.status, 200, `status ${edit.status}: ${JSON.stringify(edit.body)}`);
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "stopped",
    "the stopped reminder stays stopped");
  assert.equal(
    sql(`select count(*) from dos_accountability_schedules where title like '%${ASSIGNMENT}:midpoint%'`),
    "1",
    "and no replacement is inserted under a new id",
  );
  assert.equal(
    sql(`select count(*) from dos_accountability_schedules where title like '%${ASSIGNMENT}:midpoint%' and status = 'active'`),
    "0",
  );
});

await check("An answered one-time reminder clears without completing anything", async () => {
  reseed();
  as("admin");

  const result = await post(recordCheckIn, {
    date: "2026-09-22",
    generalUpdate: "Talked about the reading.",
    scheduleId: FOLLOW_UP,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  /* Answered, so it stops asking -- and 'stopped' rather than 'paused',
     because the synchronisation sets paused rows back to active and would ask
     again for a milestone that has already happened. */
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "stopped");
  assert.equal(sql(`select status from dos_person_commitments where id = '${SHADOW_COMMITMENT}'`), "active",
    "the goal behind it is not marked achieved");
  assert.equal(sql(`select status from dos_resource_assignments where id = '${ASSIGNMENT}'`), "in_progress",
    "and the Journey runs on");

  const edit = await patch(patchAssignment, { dueDate: "2026-10-20", id: ASSIGNMENT, workspaceId: WS_A });

  assert.equal(edit.status, 200, `status ${edit.status}: ${JSON.stringify(edit.body)}`);
  assert.equal(sql(`select status from dos_accountability_schedules where id = '${FOLLOW_UP}'`), "stopped",
    "and a later edit to the Journey does not ask for it again");
});

// --- the founder's example, end to end ------------------------------------
await check("A Thursday rhythm answered on a Friday is next due on the Friday", async () => {
  reseed();
  as("admin");

  assert.equal(sql(`select day_of_week::text from dos_accountability_schedules where id = '${THURSDAY_RHYTHM}'`), "4",
    "the rhythm was set up on Thursdays");

  /* A Friday, taken from the database's own clock so this reads the same on
     any day it runs -- and never the rhythm's own Thursday, which is the
     whole point. */
  const friday = sql("select (current_date + ((5 - extract(dow from current_date)::int + 7) % 7))::text");

  assert.equal(sql(`select extract(dow from date '${friday}')::int::text`), "5", "answered on a Friday");

  const result = await post(recordCheckIn, {
    date: friday,
    generalUpdate: "Met on Friday this week.",
    scheduleId: THURSDAY_RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);

  const next = sql(`select next_check_in::text from dos_accountability_schedules where id = '${THURSDAY_RHYTHM}'`);

  assert.equal(next, sql(`select (date '${friday}' + 7)::text`), "the next one is seven days later");
  assert.equal(sql(`select extract(dow from date '${next}')::int::text`), "5", "which is the Friday, not the Thursday");
  assert.equal(sql(`select day_of_week::text from dos_accountability_schedules where id = '${THURSDAY_RHYTHM}'`), "4",
    "and the stored day is left as it was rather than rewritten");
});

// --- month ends and the dates a check-in writes --------------------------
await check("A monthly rhythm on the 31st lands on the last day of a short month", async () => {
  reseed();
  as("admin");

  assert.equal(sql(`select next_check_in::text from dos_accountability_schedules where id = '${MONTHLY_RHYTHM}'`), "2026-01-31");

  const result = await post(recordCheckIn, {
    date: "2026-01-31",
    generalUpdate: "January's conversation.",
    scheduleId: MONTHLY_RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  /* Two things at once. February has no 31st, so the last day of February is
     the honest answer rather than the 3rd of March, which is where adding a
     month to the 31st used to land. And the check-in is eight months old, so
     the rhythm is caught up to the current month -- counting months from the
     check-in itself, which brings the 31st back rather than leaving the
     rhythm on the 28th for good. */
  const next = sql(`select next_check_in::text from dos_accountability_schedules where id = '${MONTHLY_RHYTHM}'`);
  const todayKey = sql("select current_date::text");

  assert.equal(next >= todayKey, true, `next_check_in ${next} must not be in the past (today ${todayKey})`);
  assert.equal(
    sql(`select extract(day from next_check_in)::int::text from dos_accountability_schedules where id = '${MONTHLY_RHYTHM}'`),
    sql(`select extract(day from (date_trunc('month', next_check_in) + interval '1 month - 1 day'))::int::text from dos_accountability_schedules where id = '${MONTHLY_RHYTHM}'`),
    "the rhythm is still on the last day of its month, not stranded on the 28th",
  );

  /* The single step, without a catch-up in the way, is asserted in the pure
     regression: a month after the 31st of January is the 28th of February,
     and the month after that is the 31st of March. */
});

await check("A check-in is stored on the day the leader chose, with no timezone drift", async () => {
  reseed();
  as("admin");

  /* The last day of a month, which is where an hour's drift in either
     direction changes the month as well as the day. */
  const result = await post(recordCheckIn, {
    date: "2026-09-30",
    generalUpdate: "End of the month.",
    scheduleId: RHYTHM,
    workspaceId: WS_A,
  });

  assert.equal(result.status, 200, `status ${result.status}: ${JSON.stringify(result.body)}`);
  assert.equal(
    sql(`select count(*) from dos_accountability_check_ins where schedule_id = '${RHYTHM}' and check_in_date = '2026-09-30'`),
    "1",
    "the date saved is the date chosen",
  );
  assert.equal(
    sql("select data_type from information_schema.columns where table_name = 'dos_accountability_check_ins' and column_name = 'check_in_date'"),
    "date",
    "a day is stored as a day, not as an instant that a timezone can move",
  );
  assert.equal(
    sql("select data_type from information_schema.columns where table_name = 'dos_accountability_schedules' and column_name = 'next_check_in'"),
    "date",
  );
});

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
