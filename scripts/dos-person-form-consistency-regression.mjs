import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const route = read("app/api/dos/app/people/route.ts");
const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");

/* ---- 1. The Household-only save bug -------------------------------------
 *
 * Two independent defects made Save do nothing on a person with no phone:
 * the route rejected the write, and the browser refused to submit a form
 * whose invalid required control was hidden inside a collapsed section. */

const patchStart = route.indexOf("export async function PATCH(");
const patchBlock = route.slice(patchStart);
assert.ok(patchStart !== -1, "the people route still has a PATCH handler");
assert.ok(
  patchBlock.includes("if (!workspaceId || !isUuid(id) || !name) {"),
  "editing a person must require only a name: the app creates people without a phone (household sync), and demanding one made those records permanently unsaveable",
);
assert.ok(
  !patchBlock.includes("|| !phone) {"),
  "the PATCH handler must not reject an edit for a missing phone",
);
const postBlock = route.slice(route.indexOf("export async function POST("), patchStart);
assert.ok(
  postBlock.includes("if (!workspaceId || !name) {"),
  "creating a person requires a name; edit and create now agree on what is mandatory",
);

/* field_visibility must be written from the payload on both paths, and the
   three stored values are unchanged. */
assert.ok(
  postBlock.includes("field_visibility: fieldVisibilityFromPayload(payload)")
    && patchBlock.includes("field_visibility: fieldVisibilityFromPayload(payload)"),
  "both create and edit persist the chosen list visibility",
);
assert.ok(
  route.includes('const fieldVisibilityValues = ["primary", "secondary", "hidden"] as const;'),
  "the stored visibility values are unchanged",
);

/* The client sends it on every submit, from an always-mounted field, so a
   collapsed section can never drop it. */
assert.ok(
  client.includes('<input name="field_visibility" type="hidden" value={personRole} />'),
  "list visibility travels as an always-mounted hidden field",
);
assert.ok(
  client.includes('fieldVisibility: normalizeFieldVisibility(formData.get("field_visibility"), fallback.fieldVisibility ?? "primary")'),
  "the submitted payload carries the chosen visibility, falling back to the stored value rather than to a default",
);

/* Phone is required when adding and optional when editing. */
assert.ok(
  client.includes("required={!isEditMode}"),
  "mobile phone is required only when adding a person",
);
assert.ok(
  client.includes("label={<>Mobile Phone{isEditMode ? null : <RequiredMark />}</>}"),
  "the required marker matches the rule it describes",
);

/* Any invalid control in a collapsed section opens that section instead of
   silently blocking the submit. */
assert.ok(
  client.includes("function revealInvalidSection(") && client.includes("onInvalidCapture={revealInvalidSection}"),
  "an invalid field inside a collapsed section must reveal itself rather than blocking Save with no feedback",
);
assert.ok(
  client.includes('data-person-section={id}'),
  "each section marks its content so an invalid field can be traced back to it",
);

/* ---- 2. One structure for Add and Edit ---------------------------------- */
const formStart = client.indexOf("function PersonFormContent(");
const formEnd = client.indexOf("\ntype PersonEditSectionKey =", formStart);
const formBlock = client.slice(formStart, formEnd);

assert.ok(
  !formBlock.includes("if (isEditMode) {"),
  "Add and Edit render one shared form body, not two competing layouts",
);
assert.ok(
  !formBlock.includes('title="Add more details"'),
  "Add Person no longer hides everything behind a single enormous disclosure",
);

const order = ["basic", "relationship", "household", "details", "reminder", "notes"]
  .map((key) => ({ index: formBlock.indexOf(`key: "${key}"`), key }));
order.forEach(({ index, key }) => assert.ok(index !== -1, `the ${key} section exists`));
order.slice(1).forEach((section, position) => {
  assert.ok(
    section.index > order[position].index,
    `sections stay in the approved order: ${order[position].key} before ${section.key}`,
  );
});
assert.ok(
  formBlock.includes('const [openSection, setOpenSection] = useState<PersonEditSectionKey>("basic")'),
  "Basic information starts open on both forms",
);
assert.ok(
  client.includes("const toggleSection = (key: PersonEditSectionKey) => setOpenSection((current) => (current === key ? null : key));"),
  "one optional section is open at a time",
);
assert.ok(
  client.includes('<div className={open ? "grid gap-3 pb-4" : "hidden"} data-person-section={id} hidden={!open}'),
  "a collapsed section is hidden, never unmounted, so it still submits its values",
);
assert.ok(
  formBlock.includes("...(isEditMode ? [] : [{") && formBlock.includes('title: "Reminder",'),
  "the reminder shortcut is offered while adding, where a date is in hand, and sits in the shared order",
);

/* ---- 3. The person stays named while editing ---------------------------- */
assert.ok(
  surfaces.includes("identity?: string | null;") && surfaces.includes('className="sticky top-0 z-10'),
  "a workflow page about one record keeps that record's name in a compact sticky header",
);
assert.ok(
  client.includes('<DosWorkflowPage identity={selectedPerson.name} onClose={closeForm} title="Edit Person">'),
  "Edit Person names the person in its sticky header",
);
assert.ok(
  client.includes('buttonText={splitNameParts(selectedPerson.name).firstName ? `Save ${splitNameParts(selectedPerson.name).firstName}` : "Save person"}'),
  "the save action says whose record it saves, falling back to Save person",
);

/* ---- 4. Engagement Level is part of Relationship ------------------------ */
const relationshipSection = formBlock.slice(formBlock.indexOf('key: "relationship"') - 900, formBlock.indexOf('key: "relationship"'));
assert.ok(
  relationshipSection.includes("{stageSelect}")
    && relationshipSection.includes("{contextSelect}")
    && relationshipSection.includes("{visibilitySelect}")
    && relationshipSection.includes("{engagementField}"),
  "Engagement Level sits in Relationship, after the connection questions and list visibility, on both forms",
);
assert.ok(
  !formBlock.includes('title="Advanced"') && !client.includes('"advanced" | "basic"'),
  "there is no separate Advanced destination for Engagement Level in these forms",
);
assert.ok(
  client.includes("const engagementField = showEngagement ? ("),
  "the Engagement Levels feature flag still decides whether the control is shown at all",
);

/* ---- 5. The reminder says what it actually does ------------------------- */
const reminderStart = client.indexOf("function ImportantDatesReminderSection(");
const reminderBlock = client.slice(reminderStart, client.indexOf("\nfunction PersonFormContent(", reminderStart));

assert.ok(
  !reminderBlock.includes('label="Send to app"') && !client.includes("Send to app"),
  "the unexplained 'Send to app' label is gone",
);
assert.ok(
  reminderBlock.includes("Where should this appear?"),
  "the reminder asks where it should appear, in those words",
);
assert.ok(
  reminderBlock.includes("Person timeline — always recorded here."),
  "the person timeline is stated as always true rather than offered as a choice",
);
assert.ok(
  reminderBlock.includes('title="Show in Prayer"') && reminderBlock.includes("Nothing is sent to anyone."),
  "Prayer is a placement, and the copy says so: it never implies a message to another person",
);
assert.ok(
  reminderBlock.includes('title="Add to my calendar"') && reminderBlock.includes("disabled={!calendarConnected}"),
  "the calendar option is only offered when a calendar is actually connected",
);
assert.ok(
  reminderBlock.includes('title="Remind me on the Dashboard"'),
  "the dashboard toggle describes the reminder, not a storage location",
);
assert.ok(
  !reminderBlock.includes('label="Reminder timing"') && !client.includes("importantReminderTimingOptions = ["),
  "the reminder-timing control is gone: it was stored and never acted on, so it promised a lead time the system does not implement",
);
assert.ok(
  reminderBlock.includes('name="important_reminder_title"') && reminderBlock.includes('name="important_reminder_date"'),
  "the short path is still title and date",
);
assert.ok(
  reminderBlock.indexOf('title="More reminder options"') > reminderBlock.indexOf('name="important_reminder_date"'),
  "category, repeat, placement and notes sit behind progressive disclosure",
);

/* Prayer and Calendar are independent underneath, so both can be true. */
assert.ok(
  client.includes('const showInPrayer = formData.get("important_reminder_prayer") === "on";')
    && client.includes('const addToCalendar = formData.get("important_reminder_calendar") === "on";'),
  "the two placements are submitted independently rather than as one either/or",
);
assert.ok(
  client.includes('const reminderType = showInPrayer || tag === "prayer" ? "prayer" : reminderTypeForImportantTag(tag);'),
  "choosing Prayer is what makes it a prayer reminder",
);
assert.ok(
  client.includes("googleSyncEnabled: addToCalendar && calendarConnectionIsHealthy(calendarConnection),"),
  "choosing the calendar is what syncs it, and only with a healthy connection",
);
assert.ok(
  client.includes('const destination: ImportantReminderDestination = showInPrayer ? "prayer" : addToCalendar ? "calendar" : "person_timeline";'),
  "the stored metadata keeps its existing shape so reminders saved before this change still parse",
);

console.log("DOS Person form consistency (USA-244 follow-up) regression passed.");
