import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const migration = readFileSync("supabase/migrations/20260704033834_dos_my_record.sql", "utf8");
const route = readFileSync("app/api/dos/app/my-record/route.ts", "utf8");
const loader = readFileSync("src/lib/dos/missionary-app.ts", "utf8");
const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const catalog = readFileSync("src/lib/dos/resource-catalog.ts", "utf8");

[
  "dos_user_records",
  "dos_user_journal_entries",
  "dos_user_prayer_logs",
  "dos_user_mentor_relationships",
  "dos_user_mentor_meetings",
  "dos_user_assessment_results",
].forEach((tableName) => {
  assert(migration.includes(`public.${tableName}`), `Migration should create ${tableName}.`);
  assert(migration.includes(`alter table public.${tableName} enable row level security`), `${tableName} should enable RLS.`);
  assert(migration.includes(`revoke all on table public.${tableName} from anon`), `${tableName} should revoke anon access.`);
});

assert(migration.includes("user_id = (select auth.uid())"), "My Record RLS should be scoped to the current authenticated user.");
assert(migration.includes("do not count as ministry table meetings"), "Migration comments should document metrics isolation.");

[
  ".from(\"dos_user_records\")",
  ".from(\"dos_user_journal_entries\")",
  ".from(\"dos_user_prayer_logs\")",
  ".from(\"dos_user_mentor_relationships\")",
  ".from(\"dos_user_mentor_meetings\")",
  ".from(\"dos_user_assessment_results\")",
].forEach((needle) => {
  assert(route.includes(needle), `Route should write through ${needle}.`);
});

[
  ".from(\"missionary_tables\")",
  ".from(\"fruit_events\")",
  ".from(\"missionary_fruit_items\")",
  "recalculateCircleScores",
].forEach((forbidden) => {
  assert(!route.includes(forbidden), `My Record route must not write to or recalculate ministry metrics via ${forbidden}.`);
});

assert(loader.includes("loadMyRecordForWorkspace(supabase, workspace.id, viewer)"), "Main loader should load My Record for the current viewer.");
assert(loader.includes("myRecord,"), "DosAppData should include myRecord.");
assert(loader.includes("assessmentResults"), "DosAppData My Record should include personal assessment results.");
assert(loader.includes("meetingsCount: meetings.filter"), "Existing meeting metrics should remain based on meetings.");
assert(loader.includes("fruitCount: fruit.length"), "Existing fruit metrics should remain based on fruit.");
assert(!loader.includes("meetingsCount: myRecord"), "My Record must not affect meeting metrics.");
assert(!loader.includes("fruitCount: myRecord"), "My Record must not affect fruit metrics.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, myRecord"), "My Record must not feed circle scoring.");

assert(catalog.includes("getDosAssessmentResources"), "DOS Library catalog should expose assessment resources for My Record.");
assert(client.includes("getDosAssessmentResources()"), "Client should list assessments from the DOS Library catalog.");
assert(client.includes("label: \"My Record\""), "Client should expose My Record in DOS navigation/apps.");
assert(client.includes("{ label: \"Assessments\", value: \"assessments\" }"), "My Record should expose the Assessments tab.");
assert(client.includes("Start Quiet Time"), "Client should expose Start Quiet Time quick action.");
assert(client.includes("Log Prayer Time"), "Client should expose Log Prayer Time quick action.");
assert(client.includes("Log Mentor Meeting"), "Client should expose Log Mentor Meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("MyRecordReportPanel"), "My Record should include the personal reporting framework.");
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");
assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
