// USA-244: Add/Edit Person simplification and household visibility semantics.
//
// Three separate meanings, three separate controls: relationship stage
// ("How are you connected?", stored on relationship_type / role_in_my_life),
// context ("How do you know them?", relationship_context) and list visibility
// ("List visibility", field_visibility with the words Active person /
// Household only / Private). A spouse or child is a person of their own with
// their own visibility, carried by an additive `household_members` payload
// that the household sync honours instead of always writing "secondary".
// No schema change: the stored values are exactly what they were.
import { readFileSync } from "node:fs";
import { householdMemberColumns, normalizeHouseholdMembers } from "../src/lib/dos/household-members.ts";
import { householdMemberPersonCandidates } from "../src/lib/dos/household-member-people.ts";
import { listVisibilityLabel, listVisibilityOptions, relationshipModelFromRelationshipType, relationshipStageChoiceOptions, relationshipTypeOptions } from "../src/lib/dos/relationship-model.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function equal(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}\n  expected ${JSON.stringify(expected)}\n  received ${JSON.stringify(actual)}`);
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const route = read("app/api/dos/app/people/route.ts");
const sync = read("src/lib/dos/household-member-people.ts");
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start) + 1));
const form = between(client, "function PersonFormContent(", "\nfunction PersonEditSection(");

// 1. The same stored values, in plain language. Nothing is remapped.
equal(relationshipStageChoiceOptions.map((option) => option.value), relationshipTypeOptions.map((option) => option.value), "The stage choices are the four existing relationship types.");
equal(relationshipStageChoiceOptions.map((option) => option.label), ["Getting to know them", "Staying connected", "I am discipling them", "They mentor me"], "Stage labels say the direction in plain words.");
equal(listVisibilityOptions.map((option) => option.value), ["primary", "secondary", "hidden"], "List visibility keeps primary / secondary / hidden.");
equal(listVisibilityOptions.map((option) => option.label), ["Active person", "Household only", "Private"], "List visibility labels never read as a household role.");
equal(listVisibilityLabel("secondary"), "Household only", "The label helper follows the option list.");
equal(relationshipModelFromRelationshipType("mentor", { relationshipContext: "friend", relationshipType: "new", roleInMyLife: "not_active", discipleshipStage: "not_started" }).roleInMyLife, "mentoring_me", "\"They mentor me\" still stores mentoring_me.");
assert(!client.includes("personRoleOptions") && !client.includes("function PersonChoiceField("), "The old Person role button grid is gone, not left as dead code.");
assert(!/Primary Contact|Household Member|kept selectable for tables/.test(form), "The old role wording and the \"tables\" wording are gone from the form.");

// 2. The form asks the three questions as separate dropdowns.
assert(form.includes('label="How do you know them?"') && form.includes("options={relationshipContextOptions}"), "Context is a dropdown.");
assert(form.includes('label="How are you connected?"') && form.includes("options={relationshipStageChoiceOptions}"), "Stage is a dropdown.");
assert(form.includes('label="List visibility"') && form.includes("options={listVisibilityOptions}"), "List visibility is a dropdown.");
assert(form.includes("Only whether they appear in everyday People. It is not their relationship to you or their place in a household."), "List visibility explains itself.");
for (const name of ["name", "phone", "spouse_name", "children_names", "household_members", "field_visibility", "relationship_type_value", "relationship_context"]) {
  assert(form.includes(`<input name="${name}" type="hidden"`), `${name} travels as a plain hidden field.`);
}

// 3. Add and Edit are one form: the same sections, in the same order.
//    (USA-244 follow-up: Add Person's single oversized "more details"
//    expansion was replaced by the progressive sections Edit already used.)
equal(
  [...form.matchAll(/key: "(basic|relationship|household|details|reminder|notes)"/g)].map((match) => match[1]),
  ["basic", "relationship", "household", "details", "reminder", "notes"],
  "Person sections in the approved order, shared by Add and Edit.",
);
assert(!form.includes("if (isEditMode) {"), "Add and Edit share one form body rather than two layouts.");
assert(form.includes("{visibilitySelect}") && form.includes("{engagementField}"), "List visibility and Engagement Level both live in the Relationship section.");
assert(form.includes("content: householdFields,") && form.includes("content: detailsFields,") && form.includes("content: notesField,") && form.includes("<ImportantDatesReminderSection calendarConnected={calendarConnected} />"), "Household, details, notes and the reminder shortcut all remain.");
assert(client.includes('<div className={open ? "grid gap-3 pb-4" : "hidden"} data-person-section={id} hidden={!open} id={`person-section-${id}`}>'), "Collapsed sections hide their fields rather than unmounting them, so every value still submits.");
assert(client.includes("setOpenSection((current) => (current === key ? null : key))"), "One optional section is open at a time.");
assert(form.indexOf("Delete this person") > form.lastIndexOf("</PersonEditSection>"), "Delete stays separate at the bottom of the form.");
assert(between(client, 'formMode === "editPerson" && selectedPerson ?', "</DosWorkflowPage>").includes("people={people}"), "Edit Person receives the people list so household names can link to existing people.");

// 4. Household members carry their own visibility; linked people keep theirs.
assert(form.includes('memberVisibilitySelect("Spouse in everyday People?"') && form.includes('memberVisibilitySelect("Child in everyday People?"'), "Spouse and each child have their own visibility control.");
assert(client.includes('spouseVisibility: spouse.firstName ? "secondary" : "primary",') && client.includes('visibility: "secondary",'), "A newly typed spouse defaults to Active person, a new child to Household only.");
assert(form.includes("Links to the existing person"), "A name that matches an existing person shows the link instead of creating a duplicate.");
assert(client.includes("!touched && (seeded || findPersonByName(people, name, excludeName)) ? {} : { fieldVisibility: draftValue }"), "An untouched stored or linked member sends no visibility, so an existing person keeps their own setting and a plain Save changes nothing.");
assert(client.includes('householdMembers: normalizeHouseholdMembers(formData.get("household_members"))'), "The payload carries the normalized member list.");

// 5. The pure normalizer and the derived legacy columns.
equal(normalizeHouseholdMembers('[{"name":" Skylar  Gaffney ","relationship":"spouse","fieldVisibility":"primary"},{"name":"Ann","relationship":"child"},{"name":"ann","relationship":"child","fieldVisibility":"nope"},{"name":"Bob","relationship":"spouse"},{"name":"","relationship":"child"},{"name":"Zed","relationship":"cousin"}]'), [
  { fieldVisibility: "primary", name: "Skylar Gaffney", relationship: "spouse" },
  { name: "Ann", relationship: "child" },
], "Names are cleaned, duplicates and unknown relationships or visibilities are dropped, one spouse at most.");
equal(normalizeHouseholdMembers("not json"), [], "Bad JSON is an empty list.");
equal(normalizeHouseholdMembers(undefined), [], "Absent is an empty list.");
equal(householdMemberColumns([{ fieldVisibility: "primary", name: "Skylar Gaffney", relationship: "spouse" }, { name: "Ann", relationship: "child" }, { name: "Ben", relationship: "child" }]), { childrenNames: "Ann, Ben", spouseName: "Skylar Gaffney" }, "spouse_name and children_names derive from the member list.");
equal(householdMemberColumns([]), { childrenNames: null, spouseName: null }, "No members means null columns.");

// 6. The route derives the text columns from the members and passes them to the sync (POST and PATCH).
assert((route.match(/normalizeHouseholdMembers\(payload\.householdMembers \?\? payload\.household_members\)/g) ?? []).length === 2, "Both POST and PATCH read the member list.");
assert((route.match(/members: householdMembers,/g) ?? []).length === 2, "Both POST and PATCH hand the members to the sync.");
assert((route.match(/householdColumns \? householdColumns\.spouseName/g) ?? []).length === 2 && (route.match(/householdColumns \? householdColumns\.childrenNames/g) ?? []).length === 2, "Legacy columns come from the members when present.");

// 7. The sync honours a per-member choice and otherwise behaves as before.
const candidates = householdMemberPersonCandidates({ anchorName: "Samuel Gaffney", childrenNames: "Ann, Samuel Gaffney", members: [{ fieldVisibility: "primary", name: "Skylar Gaffney", relationship: "spouse" }, { name: "Ann", relationship: "child" }], spouseName: "Skylar Gaffney" });
equal(candidates, [{ fieldVisibility: "primary", name: "Skylar Gaffney", relationship: "spouse" }, { name: "Ann", relationship: "child" }], "Members win over the text columns for the same name; the anchor is never a candidate.");
equal(householdMemberPersonCandidates({ anchorName: "A", childrenNames: "B", spouseName: "C" }), [{ name: "C", relationship: "spouse" }, { name: "B", relationship: "child" }], "Older callers without members still work.");
assert(sync.includes('field_visibility: candidate.fieldVisibility ?? "secondary",'), "A new member is created with its chosen visibility, else household-only as before.");
assert(sync.includes("if (candidate.fieldVisibility && candidate.fieldVisibility !== cleanText(existing.field_visibility)) {\n    update.field_visibility = candidate.fieldVisibility;\n  } else if (!cleanText(existing.field_visibility)) {\n    update.field_visibility = \"secondary\";\n  }"), "An existing member changes visibility only on an explicit choice; blank is still filled with secondary.");
assert(!/anchor[A-Za-z]*\.field_visibility|update\.field_visibility = input/.test(sync), "The anchor's own visibility is never touched by a member's choice.");

// 8. No migration, no "table" wording on the touched surfaces.
assert(!read("package.json").includes("usa-244"), "No migration script was added for USA-244.");
assert(!/\btables?\b/i.test(form.replace(/DosTable\w*/g, "")), "The Person form no longer says \"table\".");

console.log("DOS Person form (USA-244) regression passed.");
