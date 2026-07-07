import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const preview = read("app/dos/app/preview/page.tsx");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const migration = read("supabase/migrations/20260707034007_dos_private_groups.sql");
const prayerMigration = read("supabase/migrations/20260707132434_dos_unified_prayer_context.sql");
const prayerRoute = read("app/api/dos/app/prayer-requests/route.ts");
const publicGroupPage = read("app/groups/[slug]/page.tsx");

for (const table of [
  "dos_groups",
  "dos_group_members",
  "dos_group_gatherings",
  "dos_group_attendance",
  "dos_group_resources",
]) {
  assertIncludes(
    migration,
    `create table if not exists public.${table}`,
    `Migration must create ${table}.`,
  );
  assertIncludes(
    migration,
    `alter table public.${table} enable row level security`,
    `Migration must enable RLS for ${table}.`,
  );
  assertIncludes(
    migration,
    `grant select, insert, update, delete on table public.${table} to authenticated`,
    `Migration must grant authenticated CRUD for ${table}.`,
  );
  assertIncludes(
    migration,
    `revoke all on table public.${table} from anon`,
    `Migration must keep anon access off ${table}.`,
  );
}

assert(
  !migration.includes("create table if not exists public.dos_group_prayer_requests"),
  "Groups migration must not create a parallel group prayer table.",
);

assertIncludes(
  migration,
  "linked_table_event_id uuid references public.missionary_tables(id)",
  "Group gatherings must be wired for future Table log links.",
);
assertIncludes(migration, "'2three2'", "Migration must seed the 2three2 group.");
assertIncludes(migration, "'2 Timothy 2:22'", "Migration must seed the verse anchor.");
assertIncludes(migration, "'Run. Pray. Pursue.'", "Migration must seed the group tagline.");
assertIncludes(
  migration,
  "ryan_leader_person_id",
  "Migration must resolve an existing Ryan person before assigning leadership.",
);
assertIncludes(
  migration,
  "public.missionary_field_people",
  "Group membership must link to existing Field person records.",
);

assertIncludes(missionaryApp, "export type DosAppGroup", "DOS data model must export group data.");
assertIncludes(missionaryApp, "groups: DosAppGroup[]", "DOS app data must include groups.");
assertIncludes(
  missionaryApp,
  "async function loadGroupsForWorkspace",
  "DOS loader must load groups for the active workspace.",
);
for (const table of [
  "dos_groups",
  "dos_group_members",
  "dos_group_gatherings",
  "dos_group_attendance",
  "dos_group_resources",
]) {
  assertIncludes(missionaryApp, `.from("${table}")`, `DOS loader must query ${table}.`);
}
assert(
  !missionaryApp.includes('.from("dos_group_prayer_requests")'),
  "DOS loader must source group prayers from prayer_requests, not dos_group_prayer_requests.",
);
assertIncludes(
  missionaryApp,
  'isMissingWorkflowTable(groupsResult.error, "dos_groups")',
  "Groups loader must preserve compatibility before migrations land.",
);
assertIncludes(
  missionaryApp,
  "linkedTableEventId",
  "DOS group gatherings must expose future Table log linkage.",
);

assertIncludes(appClient, '"groups"', "Groups must be available as a DOS app view.");
assertIncludes(appClient, 'label: "Groups - My Record"', "Groups must appear under More as Groups - My Record.");
assertIncludes(appClient, "function GroupsWorkspace", "Groups list workspace must render.");
assertIncludes(appClient, "function GroupDetailWorkspace", "Groups detail workspace must render.");
assertIncludes(appClient, "My Groups", "Groups list must include My Groups tab.");
assertIncludes(appClient, "All Groups", "Groups list must include All Groups tab.");
for (const tab of [
  "Overview",
  "Members",
  "Gatherings",
  "Attendance",
  "Prayer",
  "Resources",
  "Settings",
]) {
  assertIncludes(appClient, `label: "${tab}"`, `Group detail must include ${tab} tab.`);
}
assertIncludes(appClient, "Run. Pray. Pursue.", "Groups intro/detail must include the 2three2 tagline.");
assertIncludes(appClient, "Log as Table", "Group detail must expose Log as Table.");
assertIncludes(appClient, "Pray Today", "Prayer app must include the Pray Today hub section.");
assertIncludes(appClient, "High Priority", "Prayer app must include the High Priority hub section.");
assertIncludes(appClient, "Needs Follow-Up", "Prayer app must include the Needs Follow-Up hub section.");
assertIncludes(appClient, "Group Prayers", "Prayer app must include the Group Prayers hub section.");
assertIncludes(appClient, "Person Prayers", "Prayer app must include the Person Prayers hub section.");
assertIncludes(appClient, "Answered Recently", "Prayer app must include the Answered Recently hub section.");
assertIncludes(
  appClient,
  'onLogAsTable={() => openForm("meeting")}',
  "Log as Table should open the existing Table form instead of adding a new flow.",
);

assertIncludes(preview, 'const groups: DosAppData["groups"]', "DOS preview data must include groups.");
assertIncludes(preview, 'name: "2three2"', "DOS preview must render the featured 2three2 group.");
assertIncludes(preview, 'const prayerRequests: DosAppData["prayerRequests"]', "DOS preview must seed central prayer requests.");
assertIncludes(preview, 'groupId: "demo-group-2three2"', "DOS preview group prayer must use central groupId context.");

for (const column of [
  "group_id",
  "gathering_id",
  "meeting_id",
  "created_by_person_id",
  "created_by_user_id",
  "priority",
  "follow_up_at",
]) {
  assertIncludes(
    prayerMigration,
    `add column if not exists ${column}`,
    `Unified prayer migration must add ${column}.`,
  );
}
assertIncludes(
  prayerMigration,
  "visibility in ('private', 'group_members', 'group_leaders', 'organization', 'public_profile'",
  "Unified prayer migration must support private-first visibility values.",
);
assertIncludes(
  prayerMigration,
  "visibility = 'public_profile'",
  "Public prayer RLS must only expose public_profile visibility.",
);
assertIncludes(
  prayerMigration,
  "status = 'active'",
  "Public prayer RLS must only expose active public_profile requests.",
);
assertIncludes(prayerRoute, "groupId", "DOS prayer API must accept group context.");
assertIncludes(prayerRoute, "gatheringId", "DOS prayer API must accept gathering context.");
assertIncludes(prayerRoute, "meetingId", "DOS prayer API must accept meeting context.");
assertIncludes(prayerRoute, "priority", "DOS prayer API must accept priority.");
assertIncludes(publicGroupPage, "2three2", "Public group route must render 2three2.");
assertIncludes(publicGroupPage, "Powered by", "Public group route must include the powered-by footer.");

assert(exists("app/groups/[slug]/page.tsx"), "Groups must create the public share route.");
assert(!exists("app/dos/groups/page.tsx"), "Groups should stay inside the authenticated DOS app surface.");

console.log("DOS groups regression passed.");
