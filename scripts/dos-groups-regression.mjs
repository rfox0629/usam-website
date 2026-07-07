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

for (const table of [
  "dos_groups",
  "dos_group_members",
  "dos_group_gatherings",
  "dos_group_attendance",
  "dos_group_prayer_requests",
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
  "dos_group_prayer_requests",
  "dos_group_resources",
]) {
  assertIncludes(missionaryApp, `.from("${table}")`, `DOS loader must query ${table}.`);
}
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
assertIncludes(appClient, 'label: "Groups"', "Groups must appear in DOS navigation/apps.");
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
assertIncludes(
  appClient,
  'onLogAsTable={() => openForm("meeting")}',
  "Log as Table should open the existing Table form instead of adding a new flow.",
);

assertIncludes(preview, 'const groups: DosAppData["groups"]', "DOS preview data must include groups.");
assertIncludes(preview, 'name: "2three2"', "DOS preview must render the featured 2three2 group.");

assert(!exists("app/groups/page.tsx"), "Groups must not create a public /groups page.");
assert(!exists("app/dos/groups/page.tsx"), "Groups should stay inside the authenticated DOS app surface.");

console.log("DOS groups regression passed.");
