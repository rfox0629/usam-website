import { readFileSync } from "node:fs";

const files = {
  loader: "src/lib/dos/missionary-app.ts",
  migration: "supabase/migrations/20260625175625_dos_ministry_event_model.sql",
  page: "app/dos/[collectiveSlug]/page.tsx",
  route: "app/api/dos/app/meetings/route.ts",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function visibilityKey(row) {
  return row.ministry_event_id ? `event:${row.ministry_event_id}` : `table:${row.id}`;
}

function mergeVisibleRows(workspaceRows, roleVisibleRows) {
  const rowsByKey = new Map();

  for (const row of [...workspaceRows, ...roleVisibleRows]) {
    const key = visibilityKey(row);

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, row);
    }
  }

  return Array.from(rowsByKey.values());
}

const loader = read(files.loader);
const migration = read(files.migration);
const page = read(files.page);
const route = read(files.route);

assert(
  loader.includes("loadRoleVisibleMeetingsForViewer"),
  "DOS loader must include ministry_event_people role-visible meeting loading.",
);
assert(
  loader.includes('.in("role", ["ministry_team", "participant", "supporting_attendee"])'),
  "Role-visible query must include ministry team, participant, and supporting attendee roles.",
);
assert(
  loader.includes("user_id.eq.") && loader.includes("team_member_id.in.") && loader.includes("field_person_id.in."),
  "Role-visible identity matching must use secure user, team member, or field person ids.",
);
assert(
  !loader.includes("display_name.eq.") && !loader.includes("display_name.ilike("),
  "Display names must not grant ministry event visibility.",
);
assert(
  !loader.includes('.in("role", ["ministry_team", "participant", "supporting_attendee", "recorder"])'),
  "Recorder alone must not grant role-visible activity.",
);
assert(
  migration.includes("ministry_event_people_actor_check"),
  "Ministry event people rows must require a field_person_id, team_member_id, or user_id actor link.",
);
assert(
  loader.includes("loadMeetingsForWorkspace(supabase, workspace.id, viewer)"),
  "Canonical DOS loader must pass the viewer into meeting visibility loading.",
);
assert(
  page.includes("const result = await loadDosAppData({")
    && page.includes("id: activeWorkspace.id")
    && page.includes("slug: activeWorkspace.slug")
    && page.includes("}, authorization);"),
  "DOS app route must pass the authorized viewer to the data loader.",
);
assert(
  !loader.includes('.eq("workspace_id", workspaceId)\n    .in("ministry_event_id", eventIds)'),
  "Ministry event role details must not be filtered to only the current workspace.",
);
assert(
  migration.includes("ministry_event_people_event_field_participant_support_unique"),
  "Migration must prevent the same field person from being participant and supporting attendee on one event.",
);
assert(
  migration.includes("Backfill every historical linked person as") && migration.includes("do not infer old hosts"),
  "Migration must document the legacy field_person_ids backfill assumption.",
);
assert(
  migration.includes("role-aware RLS"),
  "Migration must document future role-aware RLS before direct client reads.",
);
assert(
  route.includes('.from("ministry_events")') && route.includes('.eq("source_id", id)'),
  "Notes-only table edits must sync the shared ministry_events record.",
);
assert(
  loader.includes("meetingSchedulingSelect")
    && loader.includes("meeting_status, scheduled_start_at, scheduled_end_at, timezone, google_sync_enabled")
    && loader.includes(".select(meetingSchedulingSelect)"),
  "Meeting fallback selects must preserve scheduled table lifecycle columns before using the legacy select.",
);

const merged = mergeVisibleRows(
  [{ id: "ryan-table", ministry_event_id: "event-1", viewer: "ryan" }],
  [{ id: "ryan-table", ministry_event_id: "event-1", viewer: "dirk" }],
);
assert(merged.length === 1, "Ryan and Dirk visibility paths must not duplicate the same ministry event.");

const legacyMerged = mergeVisibleRows(
  [{ id: "old-table", ministry_event_id: null }],
  [{ id: "shared-table", ministry_event_id: "event-2" }],
);
assert(legacyMerged.length === 2, "Legacy table rows without ministry_event_id must still render separately.");

console.log("DOS ministry event visibility regression passed.");
