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

const seedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "dos-accountability-delete-e2e", "seed.sql");
const port = process.env.USA282_PGPORT ?? "55432";

const WS_A = "00000000-0000-4282-8000-0000000000a1";
const WS_B = "00000000-0000-4282-8000-0000000000b1";
const RHYTHM = "00000000-0000-4282-8000-000000000101";
const FOLLOW_UP = "00000000-0000-4282-8000-000000000102";
const OTHER_WORKSPACE_RHYTHM = "00000000-0000-4282-8000-000000000103";
const GOAL = "00000000-0000-4282-8000-000000000201";
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

const identities = {
  admin: { access: "admin", email: "admin@example.test", role: "admin", status: "authorized", userId: "00000000-0000-4282-8000-00000000ad01" },
  member: { access: "member", email: "member@example.test", status: "authorized", userId: "00000000-0000-4282-8000-00000000be01" },
  unauthenticated: { status: "unauthenticated" },
};

function as(identity) {
  globalThis.__usa282Authorization__ = identities[identity];
}

const request = (body) => new Request("http://localhost/api", {
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
  method: "DELETE",
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

const call = async (handler, body) => {
  const response = await handler(request(body));
  return { body: await response.json().catch(() => ({})), status: response.status };
};

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
    sql(`select count(*) from dos_accountability_check_ins where person_id = '00000000-0000-4282-8000-0000000000a2'`),
    "3",
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

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
