import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const migration = readFileSync("supabase/migrations/20260704033834_dos_my_record.sql", "utf8");
const propheticWordsMigration = readFileSync("supabase/migrations/20260704171602_dos_my_record_prophetic_words.sql", "utf8");
const externalAssessmentsMigration = readFileSync("supabase/migrations/20260704172801_dos_my_record_external_assessment_results.sql", "utf8");
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

assert(propheticWordsMigration.includes("public.dos_user_prophetic_words"), "V2 migration should create dos_user_prophetic_words.");
assert(propheticWordsMigration.includes("alter table public.dos_user_prophetic_words enable row level security"), "Prophetic words should enable RLS.");
assert(propheticWordsMigration.includes("revoke all on table public.dos_user_prophetic_words from anon"), "Prophetic words should revoke anon access.");
assert(propheticWordsMigration.includes("grant select, insert, update, delete on table public.dos_user_prophetic_words to authenticated"), "Prophetic words should grant explicit authenticated CRUD behind RLS.");
assert(propheticWordsMigration.includes("user_id = (select auth.uid())"), "Prophetic words RLS should be scoped to the current authenticated user.");
assert(propheticWordsMigration.includes("do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "Prophetic words comments should document metrics isolation.");

assert(externalAssessmentsMigration.includes("public.dos_user_external_assessment_results"), "V2 migration should create dos_user_external_assessment_results.");
assert(externalAssessmentsMigration.includes("alter table public.dos_user_external_assessment_results enable row level security"), "External assessment results should enable RLS.");
assert(externalAssessmentsMigration.includes("revoke all on table public.dos_user_external_assessment_results from anon"), "External assessment results should revoke anon access.");
assert(externalAssessmentsMigration.includes("grant select, insert, update, delete on table public.dos_user_external_assessment_results to authenticated"), "External assessment results should grant explicit authenticated CRUD behind RLS.");
assert(externalAssessmentsMigration.includes("user_id = (select auth.uid())"), "External assessment results RLS should be scoped to the current authenticated user.");
assert(externalAssessmentsMigration.includes("must not copy external assessment questions, scoring systems, or proprietary content"), "External assessment comments should document proprietary content boundaries.");
assert(externalAssessmentsMigration.includes("do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data"), "External assessment comments should document metrics isolation.");

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

assert(route.includes(".from(\"dos_user_prophetic_words\")"), "Route should support private prophetic word storage.");
assert(route.includes("My Record V2 is not enabled for this workspace."), "Route should reject prophetic word writes when V2 is disabled.");
assert(route.includes("isDosMyRecordV2Enabled"), "Route should enforce the Ryan-only V2 feature flag server-side.");
assert(route.includes(".from(\"dos_user_external_assessment_results\")"), "Route should support private external assessment result storage.");
assert(route.includes("kind === \"external_assessment_result\""), "Route should support the external assessment action.");
assert(route.includes("assessmentName"), "Route should require manual external assessment names.");
assert(route.includes("asOptionalHttpUrl"), "Route should validate external assessment links.");

[
  ".from(\"missionary_tables\")",
  ".from(\"fruit_events\")",
  ".from(\"missionary_fruit_items\")",
  "recalculateCircleScores",
].forEach((forbidden) => {
  assert(!route.includes(forbidden), `My Record route must not write to or recalculate ministry metrics via ${forbidden}.`);
});

assert(loader.includes("includeExternalAssessments: features.myRecordV2Enabled"), "Loader should only load external assessment results when V2 is enabled.");
assert(loader.includes("includePropheticWords: features.myRecordV2Enabled"), "Loader should only load prophetic words when V2 is enabled.");
assert(loader.includes("myRecord,"), "DosAppData should include myRecord.");
assert(loader.includes("assessmentResults"), "DosAppData My Record should include personal assessment results.");
assert(loader.includes("externalAssessmentResults"), "DosAppData My Record should include private external assessment results.");
assert(loader.includes("myRecordV2Enabled: isDosMyRecordV2Enabled"), "Loader should calculate the Ryan-only My Record V2 flag server-side.");
assert(loader.includes("dosMyRecordV2WorkspaceSlugs"), "Feature flag should use private workspace identifiers.");
assert(loader.includes("dosMyRecordV2UserEmails"), "Feature flag should have an email fallback.");
assert(loader.includes("const isRyanWorkspace = dosMyRecordV2WorkspaceSlugs.has(normalizedSlug);"), "Feature flag should identify Ryan's workspace explicitly.");
assert(loader.includes("const isRyanUser = dosMyRecordV2UserEmails.has(normalizedEmail);"), "Feature flag should identify Ryan's user explicitly.");
assert(loader.includes("return isRyanUser && isRyanWorkspace;"), "V2 should require Ryan's user and Ryan's workspace so other users stay on legacy My Record.");
assert(loader.includes("meetingsCount: meetings.filter"), "Existing meeting metrics should remain based on meetings.");
assert(loader.includes("fruitCount: fruit.length"), "Existing fruit metrics should remain based on fruit.");
assert(!loader.includes("meetingsCount: myRecord"), "My Record must not affect meeting metrics.");
assert(!loader.includes("fruitCount: myRecord"), "My Record must not affect fruit metrics.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, myRecord"), "My Record must not feed circle scoring.");
assert(!loader.includes("loadFreshCircleData(workspace.id, people, meetings.filter((meeting) => meeting.meetingStatus === \"logged\"), myRecord"), "Prophetic words must not feed circle scoring.");

assert(catalog.includes("getDosAssessmentResources"), "DOS Library catalog should expose assessment resources for My Record.");
assert(client.includes("getDosAssessmentResources()"), "Client should list assessments from the DOS Library catalog.");
assert(client.includes("label: \"My Record\""), "Client should expose My Record in DOS navigation/apps.");
assert(client.includes("{ label: \"Assessments\", value: \"assessments\" }"), "My Record should expose the Assessments tab.");
assert(client.includes("const myRecordLegacyTabs"), "Client should preserve the existing My Record tab list for non-V2 users.");
assert(client.includes("const myRecordV2Tabs"), "Client should define the Ryan-only V2 internal tab list.");
assert(client.includes("{ label: \"Scripture\", value: \"scripture\" }"), "V2 should include an internal Scripture tab.");
assert(client.includes("{ label: \"Prophetic Words\", value: \"prophetic_words\" }"), "V2 should include an internal Prophetic Words tab.");
assert(client.includes("Today's Alignment"), "V2 should include the Ryan-only dashboard experiment.");
assert(client.includes("myRecordV2Enabled ? data.myRecord.propheticWords.length : 0"), "Prophetic words should only affect private My Record activity count when V2 is enabled.");
assert(client.includes("Start Quiet Time"), "Client should expose Start Quiet Time quick action.");
assert(client.includes("Log Prayer Time"), "Client should expose Log Prayer Time quick action.");
assert(client.includes("Log Mentor Meeting"), "Client should expose Log Mentor Meeting quick action.");
assert(client.includes("Take Assessment"), "Client should expose Take Assessment quick action.");
assert(client.includes("kind: \"prophetic_word\""), "Client should save prophetic words through the private My Record API.");
assert(!client.includes("label: \"Abide\""), "Abide should not be added as a left-nav or app-catalog item.");
assert(!client.includes("label: \"Prophetic Words\", type: \"moreApp\""), "Prophetic Words must not be added to the left nav.");
assert(client.includes("MyRecordReportPanel"), "My Record should include the personal reporting framework.");
const reportPanelOccurrences = client.match(/<MyRecordReportPanel fruit=\{fruit\} meetings=\{meetings\} people=\{people\} record=\{record\} \/>/g)?.length ?? 0;
assert(reportPanelOccurrences >= 2, "V2 and legacy overviews should both render the private report panel.");
assert(client.includes("Add External Result"), "V2 Assessments should expose Add External Result.");
assert(client.includes("myRecordExternalAssessmentCategories"), "V2 Assessments should list external assessment categories.");
assert(client.includes("CliftonStrengths / StrengthsFinder"), "External assessment examples should include CliftonStrengths / StrengthsFinder.");
assert(client.includes("kind: \"external_assessment_result\""), "Client should save external results through the private My Record API.");
assert(client.includes("Do not copy questions, scoring systems, or proprietary content."), "External assessment UI should prevent proprietary content copying.");
assert(client.includes("myRecordV2Enabled ? data.myRecord.externalAssessmentResults.length : 0"), "External assessment results should only affect private My Record activity count when V2 is enabled.");
assert(!client.includes("propheticWords.filter((word) => isMyRecordDateInRange"), "Prophetic words should not be added to reports in this pass.");
assert(!client.includes("label: \"External Assessments\", type: \"moreApp\""), "External assessments must not be added to the left nav.");
assert(client.includes("Future: Permission-based My Record sharing"), "Future sharing permissions TODO should stay explicit.");
assert(client.includes("Future: PDF exports and shareable report links"), "Future report export TODO should stay explicit.");
assert(client.includes("Future: Smart prompts and check-in drafts based on Field records, prior meetings, reminders, and accountability cadence."), "Future AI/check-in TODO should stay explicit.");

console.log("DOS My Record regression checks passed.");
