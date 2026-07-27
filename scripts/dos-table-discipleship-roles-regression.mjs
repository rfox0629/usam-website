import { readFileSync } from "node:fs";

const files = {
  appClient: "app/dos/app/DosMvpAppClient.tsx",
  dataLoader: "src/lib/dos/missionary-app.ts",
  meetingsRoute: "app/api/dos/app/meetings/route.ts",
  migration: "supabase/migrations/20260702194002_dos_table_discipleship_roles.sql",
  peopleRoute: "app/api/dos/app/people/route.ts",
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
const dataLoader = read(files.dataLoader);
const meetingsRoute = read(files.meetingsRoute);
const migration = read(files.migration);
const peopleRoute = read(files.peopleRoute);

for (const role of ["ministering", "being_mentored", "mutual_discipleship", "leadership_planning"]) {
  assert(migration.includes(`'${role}'`) && dataLoader.includes(`"${role}"`), `Table role missing from schema or shared model: ${role}.`);
}

for (const column of [
  "table_role text not null default 'ministering'",
  "growth_what_god_taught",
  "growth_scriptures",
  "growth_action_step",
  "growth_mentor_assignment",
  "growth_follow_up_needed boolean not null default false",
  "planning_decisions",
  "planning_action_items",
  "planning_follow_up",
  "discipleship_relationship",
]) {
  assert(migration.includes(column), `Migration missing column/default: ${column}.`);
}

assert(
  meetingsRoute.includes("tableRoleReflectionFields") && meetingsRoute.includes("isMissingTableRoleColumn"),
  "Meetings API must save table role reflections with missing-column compatibility.",
);
assert(
  meetingsRoute.includes("includesGrowthReflection ? asNullableText(payload.growthWhatGodTaught)") &&
  meetingsRoute.includes("includesPlanningReflection ? asNullableText(payload.planningDecisions)"),
  "Meetings API must store adaptive growth and planning reflection fields.",
);
assert(
  dataLoader.includes("table_role, table_date") &&
  dataLoader.includes("growthReflection:") &&
  dataLoader.includes("planningReflection:") &&
  dataLoader.includes("tableRole: mapTableRole(meeting.table_role)"),
  "DOS data loader must hydrate role and reflection fields.",
);

for (const copy of [
  "What best describes your role at this table?",
  "Ministering",
  "Being Mentored",
  "Mutual Discipleship",
  "Leadership / Planning",
  "Growth Reflection",
  "What did God teach you?",
  "What Scriptures were discussed?",
  "What action will you take?",
  "Did your mentor give you an assignment?",
  "Planning Notes",
  "Decisions made",
  "Action items",
]) {
  assert(appClient.includes(copy), `DOS table role UI missing: ${copy}.`);
}

for (const emojiCopy of ["🍞 Ministering", "📖 Being Mentored", "🤝 Mutual Discipleship", "📅 Leadership / Planning"]) {
  assert(!appClient.includes(emojiCopy), `DOS table role UI must not include emoji label: ${emojiCopy}.`);
}

assert(
  appClient.includes("tableRoleIncludesMinistering(tableRole)") &&
  appClient.includes("setPostMeetingFollowUpId(shouldUseLeaderReflection ?"),
  "Quick Review/Testimony prompt must remain gated to ministering and mutual discipleship roles.",
);
assert(
  appClient.includes("ministryLoggedMeetings") &&
  appClient.includes("loggedMeetings.filter((meeting) => tableRoleIncludesMinistering(meeting.tableRole))"),
  "Ministry metrics must exclude received discipleship and leadership planning meetings.",
);
assert(
  appClient.includes("Mentored by") &&
  appClient.includes("Ministered to") &&
  appClient.includes("Mutual Discipleship with") &&
  appClient.includes("Leadership Planning with"),
  "Activity labels must reflect the table role.",
);
assert(
  migration.includes("set growth_follow_up_needed = false") &&
  migration.includes("where growth_follow_up_needed is null"),
  "Migration must clean nullable growth follow-up values before enforcing NOT NULL.",
);

for (const relationship of ["mentor", "mentee", "peer", "pastor", "coach", "spiritual_parent", "family", "friend", "other"]) {
  assert(migration.includes(`'${relationship}'`) && peopleRoute.includes(`"${relationship}"`), `Discipleship relationship missing: ${relationship}.`);
}
assert(
  peopleRoute.includes("discipleship_relationship: discipleshipRelationshipFromPayload(payload)") &&
  dataLoader.includes("discipleshipRelationship: mapDiscipleshipRelationship(person.discipleship_relationship)"),
  "Person discipleship relationship must save and hydrate.",
);

console.log("DOS table discipleship roles regression passed.");
