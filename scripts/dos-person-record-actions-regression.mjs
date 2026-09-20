/* USA-280 Person record actions: the floating plus adds, a three-dot menu manages.
 *
 * https://linear.app/usa-missionaries/issue/USA-280
 *
 * Older `USA-280` markers elsewhere in this repository refer to the Marriage
 * Assessment report work and are unrelated to this file.
 *
 * Two halves, the shape the rest of the DOS suite uses. First the ordering
 * rules, run for real. Then the contract over the two record surfaces: that
 * every action a section used to offer is still reachable, that no section
 * kept a competing door, and that a row carries one control rather than two.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  orderPersonRecordActions,
  personRecordActionPlacement,
  personRecordSectionOrder,
  personRecordSectionsWithoutCreation,
} from "../src/lib/dos/person-record-sections.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const personDetail = client.slice(
  client.indexOf("function PersonDetailOverlay({"),
  client.indexOf("\nfunction ReviewActionButton({"),
);
const myRecordOverview = client.slice(
  client.indexOf("function MyRecordOverviewPanel"),
  client.indexOf("type MyRecordTimelineFilter"),
);
const withoutComments = (source) => source
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

assert.ok(personDetail.length > 1000 && myRecordOverview.length > 1000, "both record surfaces must be found before anything is asserted about them");

/* ---- 1. The order, run rather than described --------------------------- */

/* Every action has a place, and every place is a section the record renders
   or a deliberate null. A new action cannot be added without choosing. */
for (const [key, placement] of Object.entries(personRecordActionPlacement)) {
  assert.ok(
    placement.section === null || personRecordSectionOrder.includes(placement.section),
    `${key} is placed in a section the record actually has`,
  );
}

const ordered = orderPersonRecordActions([
  { key: "add-reminder" },
  { key: "request-feedback" },
  { key: "add-prayer-request" },
  { key: "add-accountability" },
  { key: "add-resource" },
  { key: "add-discipleship-connection" },
  { key: "schedule-meeting" },
  { key: "log-meeting" },
]);

assert.deepEqual(
  ordered.map((item) => item.key),
  [
    "log-meeting",
    "schedule-meeting",
    "add-discipleship-connection",
    "add-resource",
    "add-accountability",
    "add-prayer-request",
    "request-feedback",
    "add-reminder",
  ],
  "the menu reads in the record's own top-to-bottom order, whatever order it was handed",
);

/* An action with no section of its own is last, and is its own group, which is
   what puts a divider above it rather than wedging it beside Feedback. */
const last = ordered[ordered.length - 1];
assert.equal(last.key, "add-reminder");
assert.equal(last.group, "later");
assert.notEqual(last.group, ordered[ordered.length - 2].group, "the unsectioned action is separated from what precedes it");

/* Sorting is stable against the section order, not against how the caller
   happened to list them. */
assert.deepEqual(
  orderPersonRecordActions([{ key: "add-prayer-request" }, { key: "log-meeting" }]).map((item) => item.key),
  ["log-meeting", "add-prayer-request"],
);

/* Groups and Fruit are recorded as having no creation action, so their absence
   from the menu is a decision this file can point at. */
assert.deepEqual([...personRecordSectionsWithoutCreation], ["groups", "fruit"]);
for (const section of personRecordSectionsWithoutCreation) {
  assert.ok(
    !Object.values(personRecordActionPlacement).some((placement) => placement.section === section),
    `${section} offers no creation action, and none is invented for it`,
  );
}

/* ---- 2. The inventory: nothing became unreachable ---------------------- */

/* Each action a Person record section used to carry, and where it lives now.
   A section losing its + Add without gaining an entry here is the failure this
   guards against. */
const personMenuEntries = [
  ['key: "log-meeting", label: "Log meeting", onClick: onLogMeeting', "Meetings"],
  ['key: "schedule-meeting", label: "Schedule meeting", onClick: onScheduleMeeting', "Meetings"],
  ['key: "add-discipleship-connection" as PersonRecordActionKey, label: "Add discipleship connection"', "Multiplication"],
  ['key: "add-resource", label: "Add resource"', "Resources"],
  ['key: "add-accountability", label: "Add accountability", onClick: onAddAccountabilitySchedule', "Accountability"],
  ['key: "add-prayer-request", label: "Add prayer request", onClick: onAddPrayerRequest', "Prayer"],
  ['key: "request-feedback" as PersonRecordActionKey, label: "Request feedback"', "Feedback"],
  ['key: "add-reminder", label: "Add reminder", onClick: onAddReminder', "no section of its own"],
];

for (const [entry, section] of personMenuEntries) {
  assert.ok(personDetail.includes(entry), `${section}: its action is in the Person plus menu`);
}

/* Multiplication is the one the audit was for: it had an inline Add and no
   menu entry, so removing the inline one without this would have taken
   discipleship connections off the record entirely. */
assert.ok(
  /multiplication\.discipleship\.supported\s*\?\s*\[\{ icon: "people" as IconName, key: "add-discipleship-connection"/.test(personDetail),
  "Add discipleship connection is offered exactly when the workspace supports it",
);

/* The menu is built through the shared order, so page and menu cannot drift. */
assert.ok(
  personDetail.includes("orderPersonRecordActions(personRecordActions)"),
  "the Person plus menu is generated from the shared ordering, not hand-sorted",
);

/* My Record's Resources section lost its + Add too, so its own menu carries
   the replacement. */
assert.ok(
  client.includes('label: "Add resource", onClick: onSendResource'),
  "My Record's plus menu can add a resource",
);

/* ---- 3. No section kept a competing door ------------------------------ */

const personSection = (label) => {
  const start = personDetail.indexOf(`aria-label="${label}"`);
  return start === -1 ? "" : withoutComments(personDetail.slice(start, personDetail.indexOf("</section>", start)));
};

for (const label of ["Resources", "Accountability", "Groups", "Prayer", "Fruit", "Feedback"]) {
  const body = personSection(label);
  assert.ok(body.length > 0, `the ${label} section is found`);
  assert.ok(!/>\s*\+ Add\s*</.test(body), `${label} carries no + Add of its own`);
  assert.ok(!/>\s*Request\s*</.test(body), `${label} carries no Request of its own`);
}

assert.ok(
  personDetail.includes('<PersonOverviewGroup label="Multiplication">'),
  "the Multiplication heading carries no action",
);

const myRecordCode = withoutComments(myRecordOverview);
assert.ok(
  !myRecordCode.includes("<MyRecordSectionAction onClick={() => onOpenSheet({ kind: \"encounter\""),
  "My Record's Time with God section carries no add of its own",
);
assert.ok(
  !myRecordCode.includes("<MyRecordSectionAction onClick={onSendResource}"),
  "My Record's Resources section carries no add of its own",
);
assert.ok(
  !myRecordCode.includes("<MyRecordSectionAction onClick={() => onOpenSheet({ kind: \"prayer\""),
  "My Record's prayer section carries no add of its own",
);

/* The life plan keeps its control on purpose: it is the only way to create or
   edit a life plan, and the plus menu has no equivalent. Removing it would
   have made the plan unreachable, which is the mistake the audit exists to
   prevent, so it is asserted rather than left to memory. */
assert.ok(
  client.includes('onOpenSheet({ kind: "life_plan", mode: record.lifePlan ? "edit" : "new", plan: lifePlan })'),
  "the life plan keeps its own control, because nothing else can reach it",
);

/* ---- 4. Empty sections stay, and the record says where adding lives ---- */

for (const [surface, source] of [["the Person record", personDetail], ["My Record", myRecordOverview]]) {
  assert.ok(source.includes("Use + to add to this record."), `${surface} says where adding lives`);
}

/* An empty section is still a section: it reads a sentence rather than
   disappearing or offering a button. */
assert.ok(personSection("Resources").includes("Nothing from the Library yet."), "an empty Resources section still reads");
assert.ok(personSection("Groups").includes("Not in a group yet."), "an empty Groups section still reads");
assert.ok(personSection("Feedback").includes("No feedback yet."), "an empty Feedback section still reads");

/* ---- 5. One control per row, in one order ----------------------------- */

const assessmentRow = client.slice(
  client.indexOf("function ResourceAssessmentRow"),
  client.indexOf("/* Copy link and, where the browser offers it"),
);
assert.ok(!assessmentRow.includes("<PDButton"), "the assessment row has no button beside its menu");
assert.equal((assessmentRow.match(/label: "View results"/g) ?? []).length, 1, "View results is offered once");
assert.equal((assessmentRow.match(/label: "Copy link"/g) ?? []).length, 1, "Copy link is offered once");
assert.ok(
  assessmentRow.indexOf('label: "View results"') < assessmentRow.indexOf('label: "Copy link"'),
  "the menu opens with the result, then the link",
);
assert.ok(
  assessmentRow.indexOf('label: "Copy link"') < assessmentRow.indexOf('danger: true, label: "Remove"'),
  "Remove is last",
);

/* The journey row on the Person record: Continue folded into the menu, and
   the assignment id travels with it. Journeys are scoped by assignment
   instance, so a person with one resource assigned twice, once through a
   group and once on their own, must open the study whose row was pressed. */
assert.ok(
  personDetail.includes("onOpenGuidedResource(journey.resource as DosResource, journey.assignment.personId, journey.assignment.id)"),
  "Continue opens this row's own assignment, not the person's first one",
);
const journeyRow = withoutComments(personDetail.slice(personDetail.indexOf("{conceptJourneys.map((journey) => (")));
assert.ok(
  !journeyRow.slice(0, journeyRow.indexOf("</div>")).includes("<PDButton"),
  "the journey row has no button beside its menu",
);

/* USA-280 follow-up: the dots open the menu first and View group then
   navigates. Groups used to be the one section where a tap navigated, which is
   the inconsistency the screenshot audit reported. */
assert.ok(
  personSection("Groups").includes('label: "View group", onSelect: () => onOpenGroup(group.id)'),
  "a group row opens the group",
);
assert.ok(!personSection("Groups").includes("<PDButton"), "a group row carries no competing button");
assert.ok(!personSection("Groups").includes("<PersonRecordRow"), "a group row is not itself a button");

/* Nothing on the record navigates on tap any more: no row is a button and no
   row draws a navigation chevron. This is the whole point of the change, so it
   is asserted over the record as a whole rather than section by section. */
assert.ok(!client.includes("function PersonRecordRow"), "the clickable-row primitive is gone");
assert.ok(!/<ChevronRight[^>]*text-dos-eyebrow/.test(personDetail), "no record row draws a navigation chevron");

/* Removal is last, set apart, and worded as removal. */
/* The menu is a shared primitive in its own module now, so the Multiplication
   tree uses the same control instead of a dots button of its own. */
const rowMenu = readFileSync(new URL("../src/components/dos/RowActionMenu.tsx", import.meta.url), "utf8");
assert.ok(rowMenu.includes("const startsDangerGroup = Boolean(item.danger) && !items[index - 1]?.danger;"), "the danger group is detected");
assert.ok(/startsDangerGroup && index > 0 \?/.test(rowMenu), "and separated from what precedes it");
assert.ok(rowMenu.includes("close();"), "the menu closes before it runs an action");

for (const source of [personDetail, myRecordOverview]) {
  assert.ok(!/label: "Delete"/.test(source), "a soft removal is never worded as a delete");
}

/* My Record's item delete asked the browser's own OK box, which named nothing
   and could not say what happened to the data. It is the app's dialog now.
   It still says "Delete", because that endpoint really does delete the row:
   the softer "Remove" is reserved for the removals that keep what they take
   away. */
assert.ok(
  !client.includes('window.confirm("Delete this My Record item?")'),
  "removing a My Record item does not ask the browser's own dialog",
);
assert.ok(
  client.includes("{pendingMyRecordDelete ? (") && client.includes('confirmLabel="Delete"'),
  "it asks the app's styled confirmation, with Cancel and Delete",
);
assert.ok(
  client.includes("pendingMyRecordDelete.itemLabel") && client.includes("cannot be restored afterwards"),
  "and it names the item and says the deletion is permanent",
);
assert.ok(
  /onCancel=\{\(\) => setPendingMyRecordDelete\(null\)\}/.test(client),
  "cancelling changes nothing",
);

/* ---- 6. Copy ---------------------------------------------------------- */

for (const [surface, source] of [["the Person record", personDetail], ["My Record", myRecordOverview]]) {
  const copy = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const line of copy.split("\n")) {
    if (line.includes("—") && !line.includes(".replace(")) {
      throw new Error(`${surface} contains an em dash: ${line.trim().slice(0, 90)}`);
    }
  }
}

/* ---- 7. The September 20 screenshot audit ----------------------------- *
 *
 * Every item below is a defect the founder photographed on production after
 * the first pass shipped. Each assertion names the behaviour, not the code, so
 * it keeps meaning if the implementation moves again.
 */

const rowMenuModule = read("src/components/dos/RowActionMenu.tsx");

/* One shared primitive, used by the record and by the Multiplication tree.
   Multiplication had grown its own dots button wired straight to a sheet,
   which is why it behaved differently from every other section. */
const multiplicationTree = read("src/components/dos/multiplication/MultiplicationTree.tsx");
assert.ok(multiplicationTree.includes('from "@/src/components/dos/RowActionMenu"'), "Multiplication uses the shared row menu");
assert.ok(!multiplicationTree.includes("MoreHorizontal"), "Multiplication has no dots button of its own");
assert.ok(!/<button[^>]*onClick=\{\(\) => onOpen\(entry\)\}/.test(multiplicationTree), "a Multiplication row is not itself a button");
assert.ok(multiplicationTree.includes('label: "View connection"'), "the menu names what opens the connection");

/* End and Remove are different operations and stay separate. Neither deletes
   the person. The menu names which one it is, and the sheet opens on that
   confirmation rather than asking the reader to choose twice. */
assert.ok(
  personDetail.includes('label: "End discipleship connection"') && personDetail.includes('label: "Remove, added by mistake"'),
  "End and Remove stay distinct on a connection",
);
const entrySheet = read("src/components/dos/multiplication/DiscipleshipSheets.tsx");
assert.ok(entrySheet.includes("initialConfirming"), "the sheet opens on the action the menu named");
assert.ok(entrySheet.includes('fit="content"'), "a connection sheet is sized by its content");

/* Meetings: the last creation controls outside the plus are gone. Both were
   already in the plus menu, in the Meetings position. */
assert.ok(!personDetail.includes("<MeetingActionRow"), "the person record carries no Log/Schedule button row");
for (const key of ["log-meeting", "schedule-meeting"]) {
  assert.ok(personDetail.includes(`key: "${key}"`), `${key} is still reachable from the plus menu`);
}

/* Accountability replaced direct arrow navigation with a named action. */
assert.ok(personSection("Accountability").includes('label: "View commitment"'), "Accountability opens from its menu");

/* Fruit keeps provenance and is never edited apart from its source. */
const fruitSection = personDetail.slice(personDetail.indexOf("const renderFruit = () => {"));
const fruitBody = fruitSection.slice(0, fruitSection.indexOf("\n  };"));
assert.ok(fruitBody.includes('label: "View meeting"'), "derived fruit can reach the meeting it came from");
assert.ok(!/label: "(Edit|Delete|Remove)"/.test(fruitBody), "derived fruit is not edited or deleted on its own");
assert.ok(client.includes('sourceIsMeeting ? "View meeting" : "View source"'), "the fruit sheet names the meeting rather than a vague source");

/* A short sheet is sized by its content rather than opening almost empty. */
const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");
assert.ok(surfaces.includes('fit?: "content" | "full"'), "a sheet may be sized by its content");
assert.ok(surfaces.includes('fit = "full"'), "and the fixed height stays the default");

/* Resources name the state the assignment is in, from real progress. */
const resourcesSection = personSection("Resources");
for (const label of ["Resume", "Start", "Review", "Continue"]) {
  assert.ok(resourcesSection.includes(`"${label}"`), `a journey row can read ${label}`);
}

/* "Week 2 of 7" sat beside "Not started" because the two read different
   sources and only one was current. Progress is the stronger evidence, so the
   state is derived from it. Nothing is written and no progress is invented. */
assert.ok(personDetail.includes("const derivedState: DosAppResourceAssignment[\"status\"]"), "assignment state is derived from real progress");
assert.ok(
  /resourceAssignmentIdentityLabel\(journey\.assignment, groups, journey\.derivedState\)/.test(personDetail),
  "the identity line reads the same derived state as the progress line",
);
assert.ok(!/\$\{unitLabel\} \$\{currentUnit\} of/.test(personDetail), "a position is no longer stated as though it were progress");
assert.ok(personDetail.includes("complete`"), "progress is stated as sessions done");

/* ---- 8. The second screenshot pass ------------------------------------ *
 *
 * Two things the first follow-up missed, both photographed on production.
 */

/* An empty state is still a creation entry point. "Nothing scheduled." kept a
   Schedule button on the Next meeting card, and the desktop rail kept a second
   copy, so scheduling still had two doors after the button row came out. */
assert.ok(
  !/Nothing scheduled\.[\s\S]{0,260}?<PDButton onClick=\{onScheduleMeeting\}>/.test(personDetail),
  "no empty state offers its own Schedule button",
);
assert.ok(
  (personDetail.match(/onClick=\{onScheduleMeeting\}/g) ?? []).length === 0,
  "scheduling is reached from the plus menu only",
);
assert.ok(personDetail.includes("Nothing scheduled."), "the card still states the fact");
assert.ok(personDetail.includes('key: "schedule-meeting"'), "and Schedule meeting is still in the plus menu");

/* A prayer captured in a group gathering is stored with category "group", a
   provenance marker rather than one of the six categories a person chooses.
   The sheet printed it raw and unlabelled, so it read as a stray word. */
assert.ok(client.includes("function prayerRequestCategoryDisplay("), "a category is resolved before it is shown");
assert.ok(
  /prayerRequestCategoryOptions\.some\(\(option\) => option\.value === value\)/.test(client),
  "and only a real category is shown as one",
);
const prayerSheet = client.slice(client.indexOf("function PrayerRequestDetailSheet("), client.indexOf("function PrayerDetailMetaRow("));
assert.ok(
  !/\{category \? <p[^>]*>\{category\}<\/p> : null\}/.test(prayerSheet),
  "the raw stored value is never printed on its own",
);
assert.ok(prayerSheet.includes(">Category<"), "the category carries a label");
assert.ok(prayerSheet.includes(">From<"), "and a group-origin request states where it came from instead");

console.log("dos-person-record-actions-regression: ok");
