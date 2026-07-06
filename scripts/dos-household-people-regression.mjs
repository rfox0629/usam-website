import { readFileSync } from "node:fs";

const files = {
  appClient: "app/dos/app/DosMvpAppClient.tsx",
  helper: "src/lib/dos/household-member-people.ts",
  loader: "src/lib/dos/missionary-app.ts",
  meetingsRoute: "app/api/dos/app/meetings/route.ts",
  migration: "supabase/migrations/20260706013016_dos_household_team_members_people.sql",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read(files.appClient);
const helper = read(files.helper);
const loader = read(files.loader);
const meetingsRoute = read(files.meetingsRoute);
const migration = read(files.migration);

assert(
  migration.includes("from public.missionary_team_members")
    && migration.includes("add column if not exists role_in_my_life")
    && migration.includes("add column if not exists discipleship_stage")
    && migration.includes("insert into public.missionary_field_people")
    && migration.includes("'Household roster member in this workspace.'"),
  "Migration must tolerate older hosted schemas and backfill public household roster members as real field people.",
);
assert(
  migration.includes("lower(trim(missionary_team_members.display_name)) not in ('god', 'new team member', 'unnamed team member')"),
  "Migration must skip non-person roster placeholders.",
);
assert(
  migration.includes("'secondary'") && migration.includes("'family'") && migration.includes("'not_started'"),
  "Roster-derived household people should be secondary family people with a safe starter relationship model.",
);
assert(
  migration.includes("when lower(coalesce(public.missionary_field_people.status, '')) in ('archived', 'deleted') then 'active'"),
  "Active household roster members must not remain hidden by an archived matching person row.",
);

assert(
  helper.includes("syncHouseholdTeamMembersAsPeople") && helper.includes("loadHouseholdTeamMembers"),
  "Runtime helper must reconcile household roster members into field people.",
);
assert(
  helper.includes('key !== "god"') && helper.includes('field_visibility: "secondary"') && helper.includes('relationship_context: "family"'),
  "Runtime sync must skip placeholders and create secondary family field people.",
);
assert(
  loader.includes("syncHouseholdTeamMembersAsPeople(supabase, { workspaceId: workspace.id })")
    && loader.indexOf("syncHouseholdTeamMembersAsPeople(supabase, { workspaceId: workspace.id })") < loader.indexOf("loadPeopleForWorkspace(supabase, workspace.id)"),
  "DOS loader must prepare household people before loading the people array.",
);

assert(
  appClient.includes('if (person.fieldVisibility === "primary")') && appClient.includes("return showSecondary;"),
  "Show Secondary / Household must reveal secondary and hidden household field people.",
);
assert(
  appClient.includes('people.filter((person) => person.fieldVisibility !== "primary").length'),
  "Show Secondary / Household count must include every non-primary household/secondary person.",
);
assert(
  appClient.includes("const meetingPeopleOptions = useMemo(() => filteredPeople(people, meetingPeopleQuery)")
    && appClient.includes("const selectedPerson = useMemo(() => people.find((person) => person.id === selectedPersonId)"),
  "Participant search and person detail must use the same real people collection.",
);
assert(
  appClient.includes("<MyRecordWorkspace") && appClient.includes("people={people}"),
  "My Record must receive the complete workspace people collection.",
);
assert(
  appClient.includes("fieldPersonIds: selectedMeetingPersonIds")
    && appClient.includes("participantPersonIds: selectedMeetingPersonIds"),
  "Table logging must submit selected real person ids as meeting participants.",
);
assert(
  meetingsRoute.includes("loadScopedPeople(supabase, workspaceId")
    && meetingsRoute.includes(".from(\"missionary_field_people\")")
    && meetingsRoute.includes("field_person_ids: validPersonIds")
    && meetingsRoute.includes("participants: validPeople")
    && meetingsRoute.includes("last_activity_at"),
  "Meetings API must validate participants as field people, persist their ids, sync ministry event participants, and update activity.",
);
assert(
  loader.includes("participantIdsForMeeting(meeting)") && loader.includes("fieldPersonIds: participantIds"),
  "Table history must hydrate participant ids back from ministry event people or missionary_tables.field_person_ids.",
);

console.log("DOS household people regression passed.");
