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
const groupSeeds = read("src/lib/dos/group-seeds.ts");
const migration = read("supabase/migrations/20260707034007_dos_private_groups.sql");
const realWorkspaceSeedMigration = read("supabase/migrations/20260707171021_seed_ryan_dos_groups.sql");
const prayerMigration = read("supabase/migrations/20260707132434_dos_unified_prayer_context.sql");
const joinRequestsMigration = read("supabase/migrations/20260709160043_dos_group_join_requests.sql");
const prayerRoute = read("app/api/dos/app/prayer-requests/route.ts");
const groupMembersRoute = read("app/api/dos/app/groups/members/route.ts");
const groupJoinRequestsRoute = read("app/api/dos/app/groups/join-requests/route.ts");
const groupSettingsRoute = read("app/api/dos/app/groups/settings/route.ts");
const publicGroupActions = read("app/groups/actions.ts");
const publicGroupsDirectoryPage = read("app/groups/page.tsx");
const publicGroupPage = read("app/groups/[slug]/page.tsx");
const publicGroupPageTemplate = read("app/groups/PublicGroupPageTemplate.tsx");
const dosWorkspaceRoute = read("app/dos/[collectiveSlug]/page.tsx");
const dosAppCompatibilityRoute = read("app/dos/app/page.tsx");
const publicSingleGroupRoute = `${publicGroupPage}\n${publicGroupPageTemplate}`;

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
assertIncludes(realWorkspaceSeedMigration, "on conflict (workspace_id, slug)", "Ryan workspace seed must upsert groups idempotently.");
assertIncludes(realWorkspaceSeedMigration, "where slug in ('ryan-fox', 'ryan-brooke-fox')", "Ryan workspace seed must target the real DOS workspace slugs.");
assertIncludes(realWorkspaceSeedMigration, "public_slug = 'fox-family'", "Ryan workspace seed must tolerate the Fox public profile slug.");
assertIncludes(realWorkspaceSeedMigration, "'2three2'", "Ryan workspace seed must include 2three2.");
assertIncludes(realWorkspaceSeedMigration, "'tuesday-mens-group'", "Ryan workspace seed must include Tuesday Men's Group.");
assertIncludes(realWorkspaceSeedMigration, "'wednesday-mens-group'", "Ryan workspace seed must include Wednesday Men's Group.");
assertIncludes(realWorkspaceSeedMigration, "'private'", "Ryan workspace seed must keep groups private.");
assertIncludes(realWorkspaceSeedMigration, "ryan_leader_person_id", "Ryan workspace seed must resolve an existing Ryan person before assigning leadership.");
assertIncludes(realWorkspaceSeedMigration, "on conflict (group_id, person_id)", "Ryan workspace seed must not duplicate leader membership rows.");

assertIncludes(missionaryApp, "export type DosAppGroup", "DOS data model must export group data.");
assertIncludes(missionaryApp, "groups: DosAppGroup[]", "DOS app data must include groups.");
assertIncludes(missionaryApp, "ensureRyanDosWorkspaceGroups", "Real DOS workspace loader must run the Ryan groups seed path.");
assertIncludes(
  missionaryApp,
  "type DosAppWorkspaceRef",
  "DOS app data loader must accept the resolved active workspace identity.",
);
assertIncludes(
  missionaryApp,
  'query.eq("id", workspaceId)',
  "DOS app data loader must prefer the authorized workspace_id over slug fallback.",
);
assertIncludes(
  missionaryApp,
  "logEmptyGroupsLoad(workspace)",
  "Groups loader must log the resolved workspace when no groups load.",
);
assertIncludes(
  missionaryApp,
  "workspaceId: workspace.id",
  "Empty groups debug logging must include the resolved workspace_id.",
);
assertIncludes(
  missionaryApp,
  "workspaceSlug: workspace.slug",
  "Empty groups debug logging must include the resolved workspace slug.",
);
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
assertIncludes(groupSeeds, "export const ryanDosGroupSeeds", "Ryan DOS group seeds must live outside preview fixtures.");
assertIncludes(groupSeeds, "ensureRyanDosWorkspaceGroups", "Ryan DOS group seeds must expose a real workspace bootstrap helper.");
assertIncludes(groupSeeds, 'workspace.slug', "Ryan DOS group seed helper must inspect the real workspace slug.");
assertIncludes(groupSeeds, '"ryan-fox"', "Ryan DOS group seed helper must target /dos/ryan-fox.");
assertIncludes(groupSeeds, '"tuesday-mens-group"', "Ryan DOS group seed helper must include Tuesday Men's Group.");
assertIncludes(groupSeeds, '"wednesday-mens-group"', "Ryan DOS group seed helper must include Wednesday Men's Group.");
assertIncludes(groupSeeds, 'onConflict: "workspace_id,slug"', "Ryan DOS group seed helper must upsert by workspace and slug.");
assertIncludes(groupSeeds, 'onConflict: "group_id,person_id"', "Ryan DOS group seed helper must upsert leader membership.");
assertIncludes(groupSeeds, 'visibility: "private"', "Ryan DOS group seed helper must keep default visibility private.");
assertIncludes(
  dosWorkspaceRoute,
  "id: workspaceAccess.workspace.id",
  "/dos/[slug] must pass the resolved active workspace_id into DOS data loading.",
);
assertIncludes(
  dosWorkspaceRoute,
  "slug: workspaceAccess.workspace.slug",
  "/dos/[slug] must also pass the canonical resolved workspace slug into DOS data loading.",
);
assertIncludes(
  dosWorkspaceRoute,
  "loadDosAppData({",
  "/dos/ryan-fox must load DOS data from the resolved workspace object.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  'const workspaceAccess = await getDosWorkspaceAccess(authorization, params.workspace)',
  "/dos/app?workspace=ryan-fox must resolve workspace access before canonical route loading.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  "redirect(cleanWorkspacePath(workspaceAccess.workspace.slug, params))",
  "/dos/app?workspace=ryan-fox must normalize to the same canonical workspace route.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  '"ryan-brooke-fox": "ryan-fox"',
  "Legacy Ryan workspace aliases must normalize to /dos/ryan-fox.",
);
assertIncludes(
  dosAppCompatibilityRoute,
  '"fox-family": "ryan-fox"',
  "Public Fox profile slug must normalize to /dos/ryan-fox.",
);

assertIncludes(appClient, '"groups"', "Groups must be available as a DOS app view.");
assertIncludes(appClient, 'label: "My Record"', "My Record must remain a separate desktop navigation item.");
assertIncludes(appClient, 'label: "Groups"', "Groups must appear under More as its own item.");
assertIncludes(appClient, 'const dosMoreLauncherAppLabels = ["Groups", "Fruit", "Library", "Reports", "Stewardship", "Testimony Practice"] as const', "Groups must be registered in the shared DOS Apps/More launcher manifest.");
assertIncludes(appClient, "dosMoreLauncherAppLabelSet.has(item.label)", "Desktop and mobile Apps launchers must filter through the shared manifest instead of an ad hoc label list.");
assertIncludes(appClient, 'data-dos-app-card={item.label}', "Apps launcher cards must expose a stable marker for production verification.");
assertIncludes(appClient, 'label: "Groups"', "Groups launcher card must be registered with the Groups label.");
assertIncludes(appClient, 'onClick: () => openMoreApp("groups")', "Groups launcher card must open the Groups workspace.");
assertIncludes(appClient, 'const groupsLauncherCard = desktopAppCatalogItems.find((item) => item.label === "Groups")', "Desktop launcher must explicitly verify the Groups card registration.");
assertIncludes(appClient, 'const mobileGroupsLauncherCard = mobileAppCatalogItems.find((item) => item.label === "Groups")', "Mobile launcher must explicitly verify the Groups card registration.");
assert(
  !appClient.includes("Groups - My Record"),
  "Groups and My Record must not be combined into one navigation item.",
);
assertIncludes(appClient, "function GroupsWorkspace", "Groups list workspace must render.");
assertIncludes(appClient, "function GroupDetailWorkspace", "Groups detail workspace must render.");
assertIncludes(appClient, "My Groups", "Private DOS Groups must include My Groups.");
assertIncludes(appClient, "All Groups", "Private DOS Groups must include All Groups.");
assertIncludes(appClient, "GroupsSearchInput", "Private DOS Groups must include search.");
assertIncludes(appClient, "New Group", "Private DOS Groups must expose New Group.");
assertIncludes(appClient, "Copy Public Directory Link", "Private DOS Groups must expose public directory copy without becoming the public directory.");
assertIncludes(appClient, "onCopyPublicDirectoryLink", "Private DOS Groups must wire public directory link copying.");
assertIncludes(appClient, "xl:grid-cols-[minmax(28rem,1fr)_minmax(22rem,auto)]", "Desktop group detail header must preserve a sensible text column width.");
assertIncludes(appClient, "max-w-4xl", "Group detail title and scripture column must use the available width instead of collapsing.");
assertIncludes(appClient, "whitespace-normal text-sm leading-6", "Group scripture text must render as normal paragraph copy.");
assertIncludes(appClient, "hidden min-w-0 flex-wrap gap-2 md:flex xl:justify-end", "Desktop group detail actions must wrap without squeezing the title column.");
assertIncludes(appClient, "More Actions", "Mobile group detail must move secondary actions into a compact More Actions sheet.");
assertIncludes(appClient, "isMobileActionSheetOpen", "Mobile group detail must keep secondary actions out of the crowded header.");
assertIncludes(appClient, "runMobileAction", "Mobile group secondary actions must close the sheet before running.");
assertIncludes(appClient, "inline-flex min-h-10 shrink-0", "Group detail action buttons must wrap as whole buttons instead of shrinking text.");
assertIncludes(appClient, "md:grid-cols-4", "Group metadata row must use four equal desktop columns.");
assertIncludes(appClient, "title={value}", "Group metadata chips must truncate with a readable title fallback.");
assertIncludes(appClient, "overflow-x-auto px-1 pb-1", "Group detail tabs must stay horizontally scrollable on narrow screens.");
assertIncludes(appClient, "grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-3", "Today's Gathering workflow metrics must be compact on mobile.");
assertIncludes(appClient, "pb-32 md:space-y-4 md:pb-4", "Group detail must keep mobile bottom navigation from covering content.");
assertIncludes(appClient, "xl:grid-cols-2 xl:items-start", "Group overview must use a two-column desktop dashboard layout.");
assertIncludes(appClient, "GroupMobileSummaryCard", "Mobile group overview must use compact summary cards instead of the full desktop dashboard.");
assertIncludes(appClient, "Upcoming Discipleship Rhythms", "Mobile group overview must summarize upcoming rhythms.");
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
assertIncludes(appClient, "Discipleship happens in rhythms.", "Groups intro must use the cross-group hero title.");
assertIncludes(appClient, "Build consistent rhythms of discipleship through weekly gatherings, prayer, accountability, and community.", "Groups intro must use the cross-group hero description.");
assertIncludes(appClient, "Featured Group", "Groups intro must label the featured group section.");
assertIncludes(appClient, "Log as Table", "Group detail must expose Log as Table.");
assertIncludes(appClient, "Start Gathering", "Group detail must expose Start Gathering.");
assertIncludes(appClient, "GroupInviteSheet", "Group Invite must open a real add-member sheet.");
assertIncludes(appClient, "Add to Group", "Group Invite must label the action as Add to Group.");
assertIncludes(appClient, 'label: "Add to Group"', "Group detail action must be renamed Add to Group.");
assertIncludes(appClient, "Pending Requests", "Private DOS Groups members tab must show pending public join requests.");
assertIncludes(appClient, "/api/dos/app/groups/join-requests", "Private DOS Groups must load pending requests through the authenticated review API.");
assertIncludes(appClient, "reviewJoinRequest", "Private DOS Groups must let leaders review pending group requests.");
assertIncludes(appClient, "onJoinRequestAccepted", "Accepted public join requests must update private group membership locally.");
assertIncludes(appClient, "Copy Public Link", "Group detail and cards must expose a public link copy action.");
assertIncludes(appClient, "View Public Page", "Group detail and cards must expose View Public Page.");
assertIncludes(appClient, "copyPublicGroupLink", "Group detail must wire public group link copying.");
assertIncludes(appClient, "/api/dos/app/groups/members", "Group Invite must call the member API route.");
assertIncludes(appClient, "groupMemberAdditions", "Group Invite must update group members locally after adding.");
assertIncludes(appClient, "setGroupDetailTab(\"members\")", "Group Invite success must switch to Members.");
assertIncludes(appClient, "GroupSettingsSheet", "Group Settings must open an edit sheet.");
assertIncludes(appClient, "Edit Group", "Group Settings must expose Edit Group.");
assertIncludes(appClient, "/api/dos/app/groups/settings", "Group Settings must call the settings API route.");
assertIncludes(appClient, "Update future scheduled gatherings with this location?", "Group Settings must confirm future location updates.");
assertIncludes(appClient, "Archive group", "Group Settings must archive instead of hard delete.");
assertIncludes(appClient, "Public-shareable", "Group Settings must expose public-shareable visibility copy.");
assert(
  !appClient.includes("Invite will be wired after group management is ready."),
  "Group Invite placeholder copy must be removed.",
);
assertIncludes(appClient, "● Gathering In Progress", "Active gathering state must be visible.");
assertIncludes(appClient, "Attendance Progress", "Active gathering state must show attendance progress.");
assertIncludes(appClient, "End Gathering Wizard", "Groups must include the end gathering wizard.");
assertIncludes(appClient, "Prayer Requests", "End gathering wizard must include prayer requests.");
assertIncludes(appClient, "What happened today?", "End gathering wizard must include the Fruit step prompt.");
assertIncludes(appClient, "Gospel conversation", "End gathering wizard must include fruit options.");
assertIncludes(appClient, "Create Follow-Up", "End gathering wizard must include follow-up creation.");
assertIncludes(appClient, "Complete Gathering", "End gathering wizard must include completion action.");
assertIncludes(appClient, "Gathering Completed", "End gathering wizard must include completion success state.");
assertIncludes(appClient, "Attendance Recorded", "Completion success state must confirm attendance.");
assertIncludes(appClient, "Prayer Updated", "Completion success state must confirm prayer.");
assertIncludes(appClient, "Fruit Recorded", "Completion success state must confirm fruit.");
assertIncludes(appClient, "Table Logged", "Completion success state must confirm Table logging.");
assertIncludes(appClient, "Create Person after gathering", "Guest attendance must support creating People later.");
assertIncludes(appClient, "Attendance Trend", "Group dashboard must include attendance trend.");
assertIncludes(appClient, "Recent Prayer Requests", "Group dashboard must include recent prayer requests.");
assertIncludes(appClient, "Recent Fruit", "Group dashboard must include recent fruit.");
assertIncludes(appClient, "Recent Activity", "Group dashboard must include recent activity.");
assertIncludes(appClient, "Upcoming Follow Ups", "Group dashboard must include upcoming follow-ups.");
assertIncludes(appClient, "Group Health", "Group dashboard must include a health snapshot.");
assertIncludes(appClient, "Momentum", "Group health must include momentum.");
assertIncludes(appClient, "No attendance has been recorded yet.", "Attendance empty state must use the polished title.");
assertIncludes(appClient, "Record attendance after your next gathering.", "Attendance empty state must use the polished body.");
assertIncludes(appClient, "No active prayer requests.", "Prayer empty state must use the polished title.");
assertIncludes(appClient, "Prayer requests added during gatherings will automatically appear here.", "Prayer empty state must use the polished body.");
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
assertIncludes(preview, 'process.env.DOS_DISABLE_DEMO_PREVIEW !== "true"', "DOS preview must stay token-available for production smoke checks unless explicitly disabled.");
assert(!preview.includes('process.env.VERCEL_ENV === "preview"'), "DOS preview must not disappear in production when the valid demo token is supplied.");
assertIncludes(preview, 'name: "2three2"', "DOS preview must render the featured 2three2 group.");
assertIncludes(preview, 'tagline: "Run. Pray. Pursue."', "DOS preview must seed the 2three2 tagline.");
assertIncludes(preview, "name: \"Tuesday Men's Group\"", "DOS preview must seed Tuesday Men's Group.");
assertIncludes(preview, "name: \"Wednesday Men's Group\"", "DOS preview must seed Wednesday Men's Group.");
assertIncludes(preview, 'tagline: "Grow together."', "DOS preview must seed Tuesday Men's Group tagline.");
assertIncludes(preview, 'tagline: "Brotherhood. Prayer. Discipleship."', "DOS preview must seed Wednesday Men's Group tagline.");
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
assertIncludes(groupMembersRoute, "requireDosWorkspaceRouteAccess", "Group member API must be authenticated and workspace-scoped.");
assertIncludes(groupMembersRoute, ".from(\"dos_group_members\")", "Group member API must write dos_group_members.");
assertIncludes(groupMembersRoute, ".eq(\"group_id\", groupId)", "Group member API must check existing group membership.");
assertIncludes(groupMembersRoute, ".eq(\"person_id\", person.id)", "Group member API must prevent duplicate memberships by person.");
assertIncludes(groupMembersRoute, ".from(\"missionary_field_people\")", "Group member API must create or link DOS person records.");
assertIncludes(groupMembersRoute, "alreadyMember", "Group member API must report duplicate-safe existing membership.");
assertIncludes(groupJoinRequestsRoute, "requireDosWorkspaceRouteAccess", "Group join request API must be authenticated and workspace-scoped.");
assertIncludes(groupJoinRequestsRoute, "isAdminDosAuthorization", "Group join request API must allow DOS admins without leaking public access.");
assertIncludes(groupJoinRequestsRoute, "\"leader\", \"co_leader\"", "Group join request API must restrict non-admin review to group leaders.");
assertIncludes(groupJoinRequestsRoute, ".from(\"dos_group_join_requests\")", "Group join request API must read and update pending join requests.");
assertIncludes(groupJoinRequestsRoute, ".eq(\"workspace_id\", workspaceId)", "Group join request API must scope requests to the active workspace.");
assertIncludes(groupJoinRequestsRoute, ".eq(\"group_id\", groupId)", "Group join request API must scope requests to the selected group.");
assertIncludes(groupJoinRequestsRoute, ".from(\"missionary_field_people\")", "Accepting a private join request must create or link the shared DOS Person record.");
assertIncludes(groupJoinRequestsRoute, ".from(\"dos_group_members\")", "Accepting a private join request must add the person to dos_group_members.");
assertIncludes(groupJoinRequestsRoute, "status: nextStatus", "Group join request API must close reviewed requests through status updates.");
assertIncludes(groupJoinRequestsRoute, "missingJoinRequestsTable", "Group join request API must fail softly before the migration lands.");
assertIncludes(groupSettingsRoute, "requireDosWorkspaceRouteAccess", "Group settings API must be authenticated and workspace-scoped.");
assertIncludes(groupSettingsRoute, ".from(\"dos_groups\")", "Group settings API must update dos_groups.");
assertIncludes(groupSettingsRoute, ".neq(\"id\", groupId)", "Group settings API must validate slug uniqueness excluding the current group.");
assertIncludes(groupSettingsRoute, ".from(\"dos_group_gatherings\")", "Group settings API must update future gathering locations when confirmed.");
assertIncludes(groupSettingsRoute, ".from(\"dos_group_members\")", "Group settings API must update leader membership.");
assertIncludes(publicGroupPage, "2three2", "Public group route must render 2three2.");
assertIncludes(publicGroupPage, ".from(\"dos_groups\")", "Public group route must resolve from real group data.");
assertIncludes(publicGroupPage, ".eq(\"slug\", slug)", "Public group route must resolve groups by slug.");
assertIncludes(publicGroupPage, ".eq(\"active\", true)", "Public group route must only render active groups.");
assert(
  !publicGroupPage.includes(".eq(\"visibility\", \"workspace\")"),
  "Public group route must not 404 private DOS groups that are rendered through safe public fields.",
);
assert(
  !publicSingleGroupRoute.includes("dos_group_members"),
  "Public group route must not expose member data.",
);
assert(
  !publicSingleGroupRoute.includes("dos_group_attendance"),
  "Public group route must not expose attendance data.",
);
assert(
  !publicSingleGroupRoute.includes("prayer_requests"),
  "Public group route must not expose private prayer data.",
);
for (const privatePublicTerm of [
  "Members",
  "Attendance",
  "Settings",
  "Start Gathering",
  "Add to Group",
  "Log as Table",
]) {
  assert(
    !publicSingleGroupRoute.includes(privatePublicTerm),
    `Public group route must not expose private admin term: ${privatePublicTerm}.`,
  );
}
assertIncludes(publicSingleGroupRoute, "What to Expect", "Public group route must include What to Expect.");
assertIncludes(publicSingleGroupRoute, "Typical Schedule", "Public group route must include Typical Schedule.");
assertIncludes(publicSingleGroupRoute, "Who This Is For", "Public group route must include Who This Is For.");
assertIncludes(publicSingleGroupRoute, "Next Gathering", "Public group route must include Next Gathering.");
assertIncludes(publicSingleGroupRoute, "Request Information", "Public group route must include Request Information.");
assertIncludes(publicSingleGroupRoute, "Join Group", "Public group route must include Join Group.");
assertIncludes(publicSingleGroupRoute, "Request received. A group leader will follow up.", "Public group route must include the requested success state.");
assertIncludes(publicSingleGroupRoute, "submitGroupJoinRequest", "Public group route must submit the live join request action.");
assertIncludes(publicSingleGroupRoute, 'name="firstName"', "Public group join form must include First Name.");
assertIncludes(publicSingleGroupRoute, 'name="lastName"', "Public group join form must include Last Name.");
assertIncludes(publicSingleGroupRoute, 'name="email"', "Public group join form must include Email.");
assertIncludes(publicSingleGroupRoute, 'name="phone"', "Public group join form must include Phone.");
assertIncludes(publicSingleGroupRoute, 'name="message"', "Public group join form must include Message.");
assert(exists("public/images/usam/groups-share.png"), "Default Groups social share image must exist.");
assertIncludes(publicGroupsDirectoryPage, "Groups | USA Missionaries", "Public groups directory must set a specific metadata title.");
assertIncludes(publicGroupsDirectoryPage, "Find discipleship groups connected to USA Missionaries.", "Public groups directory must set a specific metadata description.");
assertIncludes(publicGroupsDirectoryPage, "/images/usam/groups-share.png", "Public groups directory must use the default Groups social image.");
assertIncludes(publicGroupsDirectoryPage, "summary_large_image", "Public groups directory must configure Twitter large image metadata.");
assertIncludes(publicGroupPage, "image_url", "Public group metadata must support a group-specific public image when present.");
assertIncludes(publicGroupPage, "groupShareImageUrl", "Public group metadata must normalize group share images.");
assertIncludes(publicGroupPage, "/images/usam/groups-share.png", "Public group metadata must fall back to the default Groups social image.");
assertIncludes(publicGroupPage, "summary_large_image", "Public group metadata must configure Twitter large image metadata.");
assert(
  !publicGroupsDirectoryPage.includes("the-table-source") && !publicGroupPage.includes("the-table-source"),
  "Public groups metadata must not point at the Table graphic.",
);
assertIncludes(publicGroupPageTemplate, "PrimaryNav", "Public group template must use the standard public header.");
assert(
  !publicGroupPageTemplate.includes("Powered by"),
  "Public group template must not render the removed custom powered-by footer.",
);
assert(
  !publicGroupPageTemplate.includes("PublicGroupNav"),
  "Public group template must not use a custom group-specific header.",
);
assertIncludes(publicGroupsDirectoryPage, ".from(\"dos_groups\")", "Public groups directory must resolve from real group data.");
assertIncludes(publicGroupsDirectoryPage, ".eq(\"active\", true)", "Public groups directory must only list active groups.");
assertIncludes(publicGroupsDirectoryPage, "fallbackPublicDirectoryGroups", "Public groups directory must have safe local fallback data.");
assertIncludes(publicGroupsDirectoryPage, "href={`/groups/${group.slug}`}", "Public groups directory cards must link to public group pages.");
assertIncludes(publicGroupsDirectoryPage, "Powered by", "Public groups directory must include the powered-by footer.");
assert(
  !publicGroupsDirectoryPage.includes("dos_group_members"),
  "Public groups directory must not expose member data.",
);
assert(
  !publicGroupsDirectoryPage.includes("dos_group_attendance"),
  "Public groups directory must not expose attendance data.",
);
assert(
  !publicGroupsDirectoryPage.includes("prayer_requests"),
  "Public groups directory must not expose private prayer data.",
);
for (const privateDirectoryTerm of [
  "Members",
  "Attendance",
  "Settings",
  "Start Gathering",
  "Add to Group",
  "Log as Table",
]) {
  assert(
    !publicGroupsDirectoryPage.includes(privateDirectoryTerm),
    `Public groups directory must not expose private admin term: ${privateDirectoryTerm}.`,
  );
}

assertIncludes(joinRequestsMigration, "create table if not exists public.dos_group_join_requests", "Join request migration must create pending group request storage.");
assertIncludes(joinRequestsMigration, "status text not null default 'pending'", "Join request migration must default requests to pending.");
assertIncludes(joinRequestsMigration, "source_type text not null default 'group_join_request'", "Join request migration must store source_type.");
assertIncludes(joinRequestsMigration, "source_group_slug text not null", "Join request migration must store source_group_slug.");
assertIncludes(joinRequestsMigration, "source_group_id uuid references public.dos_groups(id)", "Join request migration must store source_group_id.");
assertIncludes(joinRequestsMigration, "source_path text not null", "Join request migration must store source_path.");
assertIncludes(joinRequestsMigration, "submitted_at timestamptz not null default now()", "Join request migration must store submitted_at.");
assertIncludes(joinRequestsMigration, "alter table public.dos_group_join_requests enable row level security", "Join request migration must enable RLS.");
assertIncludes(joinRequestsMigration, "grant insert (", "Public join requests must use column-limited insert grants.");
assertIncludes(joinRequestsMigration, "email,", "Public join requests must allow email submission.");
assertIncludes(joinRequestsMigration, "source_group_slug,", "Public join requests must allow source_group_slug submission.");
assertIncludes(joinRequestsMigration, "to anon", "Public join requests must allow public insert only through the anon role.");
assertIncludes(joinRequestsMigration, "revoke all on table public.dos_group_join_requests from authenticated", "Join request migration must revoke direct authenticated table access.");
assertIncludes(joinRequestsMigration, "dos_group_join_requests_pending_group_email_unique", "Join request migration must prevent duplicate pending requests by group/email.");
assertIncludes(joinRequestsMigration, "Public can create pending group join requests", "Join request migration must include public pending insert policy.");
assertIncludes(joinRequestsMigration, "status = 'pending'", "Public insert policy must keep requests pending.");
assertIncludes(joinRequestsMigration, "group_id is null", "Direct public insert must not be able to set group_id.");
assertIncludes(joinRequestsMigration, "source_group_id is null", "Direct public insert must not be able to set source_group_id.");
assertIncludes(joinRequestsMigration, "workspace_id is null", "Direct public insert must not be able to set workspace_id.");
assertIncludes(joinRequestsMigration, "Private DOS server routes review requests with workspace/group scoping.", "Join request migration must document private DOS review scoping.");
assert(
  !joinRequestsMigration.includes("grant insert, select, update, delete on table public.dos_group_join_requests to authenticated"),
  "Join request migration must not grant direct authenticated CRUD access.",
);
assert(
  !joinRequestsMigration.includes("for select\nto anon"),
  "Join request migration must not allow public request selection.",
);
assertIncludes(publicGroupActions, ".from(\"dos_group_join_requests\")", "Join request action must write to dos_group_join_requests.");
assertIncludes(publicGroupActions, ".from(\"dos_groups\")", "Join request action must resolve the active group.");
assertIncludes(publicGroupActions, "emailPattern.test(email)", "Join request action must validate email format.");
assertIncludes(publicGroupActions, "normalizePhone", "Join request action must intentionally keep phone optional and normalized.");
assertIncludes(publicGroupActions, ".eq(\"status\", \"pending\")", "Join request action must check existing pending requests.");
assertIncludes(publicGroupActions, "(error as { code?: string }).code === \"23505\"", "Join request action must handle duplicate pending requests safely.");
assertIncludes(publicGroupActions, "status: \"pending\"", "Join request action must save requests as pending.");
assertIncludes(publicGroupActions, "source_type: \"group_join_request\"", "Join request action must save source_type.");
assertIncludes(publicGroupActions, "source_group_slug: group.slug", "Join request action must save source_group_slug.");
assertIncludes(publicGroupActions, "source_group_id: group.id", "Join request action must save source_group_id.");
assertIncludes(publicGroupActions, "source_path: sourcePath", "Join request action must save source_path.");
assertIncludes(publicGroupActions, "submitted_at: submittedAt", "Join request action must save submitted_at.");
assert(
  !publicGroupActions.includes(".from(\"dos_group_members\")"),
  "Join request action must not create group members directly.",
);
assert(
  !publicGroupActions.includes(".from(\"missionary_field_people\")"),
  "Join request action must not create DOS Person records directly.",
);

assert(exists("app/groups/page.tsx"), "Groups must create the public directory route.");
assert(exists("app/groups/[slug]/page.tsx"), "Groups must create the public share route.");
assert(exists("app/groups/PublicGroupPageTemplate.tsx"), "Groups must use a reusable public group page template.");
assert(exists("app/groups/actions.ts"), "Groups must create a live public join request action.");
assert(exists("app/api/dos/app/groups/members/route.ts"), "Groups must create the authenticated member add route.");
assert(exists("app/api/dos/app/groups/join-requests/route.ts"), "Groups must create the authenticated join request review route.");
assert(exists("app/api/dos/app/groups/settings/route.ts"), "Groups must create the authenticated settings route.");
assert(!exists("app/dos/groups/page.tsx"), "Groups should stay inside the authenticated DOS app surface.");

console.log("DOS groups regression passed.");
