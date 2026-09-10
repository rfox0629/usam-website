import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* USA-264 People experience correction.
   Guards the causes found in Danny Lundquist's records and the shared
   experience that replaced five inconsistent detail sheets. Each assertion
   names the defect it prevents, so a future edit that reintroduces one fails
   here with the reason attached. */

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");
const loader = read("src/lib/dos/missionary-app.ts");
const pillRail = read("src/components/dos/ui/PillRail.tsx");
const migration = read("supabase/migrations/20260910150000_dos_person_feedback_import.sql");
const rollback = read("supabase/migrations/20260910150000_dos_person_feedback_import_rollback.sql");
const slice = (start, end = "\nfunction ") => {
  const index = client.indexOf(start);
  assert.ok(index !== -1, `${start} must exist`);
  return client.slice(index, client.indexOf(end, index + start.length));
};

/* ---- 1. The duplicate prayer ------------------------------------------- */
/* One prayer_requests row plus the same text on that meeting's reflection
   rendered as two open prayers while the count said one. */
assert.ok(
  client.includes("export function meetingIdsWithCanonicalPrayer(prayerRequests: ReadonlyArray<{ meetingId: string | null }>)"),
  "one provenance helper decides when a reflection's prayer text is a copy",
);
assert.ok(
  (client.match(/meetingIdsWithCanonicalPrayer\(/g) ?? []).length >= 4,
  "the Person overview and both Prayer lists all use it",
);
assert.ok(
  client.includes(".filter((reflection) => !meetingsWithCanonicalPrayer.has(reflection.meetingId))")
    && client.includes(".filter((reflection) => !desktopMeetingsWithCanonicalPrayer.has(reflection.meetingId))")
    && client.includes(".filter((reflection) => !mobileMeetingsWithCanonicalPrayer.has(reflection.meetingId))"),
  "the reflection copy is dropped by meeting id, never by comparing text",
);
assert.ok(
  client.includes("const openPrayerCount = conceptPrayerItems.length;"),
  "the open count is the length of the list it summarises, so they cannot disagree",
);

/* ---- 2. The unexpected reminder ----------------------------------------- */
/* A blank Reminder section saved "Reminder from meeting" due tomorrow. */
assert.ok(!client.includes('"Reminder from meeting"'), "no reminder title is ever invented");
assert.ok(
  client.includes("    if (!trimmedFollowUpNote) {\n      return true;\n    }"),
  "an empty reminder creates nothing",
);
assert.ok(
  !client.includes("? followUpDate : dateValueFromToday(1)"),
  "a missing reminder date is refused, never defaulted to tomorrow",
);
assert.ok(
  client.includes("const followUpNeeded = reminderRead.items.length > 0;"),
  "an opened-but-empty Reminder section is not a follow-up",
);

/* ---- 3. One detail shell ------------------------------------------------ */
const shell = surfaces.slice(surfaces.indexOf("export function DosDetailSheet({"), surfaces.indexOf("export function DosDetailSection("));
assert.ok(shell.includes('h-[calc(100dvh-2.75rem)]') && shell.includes("md:h-[min(720px,calc(100dvh-4rem))]"), "fixed height on mobile and desktop");
assert.ok(shell.includes('<header className="shrink-0') && shell.includes("min-h-0 flex-1 overflow-y-auto") && shell.includes('className="shrink-0 border-t'), "fixed header and actions, scrolling body");
assert.ok(shell.includes("pb-[calc(env(safe-area-inset-bottom)+0.85rem)]"), "the action area respects the safe area");
assert.ok(shell.includes("panelRef.current?.focus"), "keyboard focus moves into the dialog");
for (const name of [
  "function PersonAccountabilityDetailSheet({",
  "function PrayerRequestDetailSheet({",
  "function PersonFruitDetailSheet({",
  "function PersonFeedbackDetailSheet({",
  "function PersonPrayerSheet({",
]) {
  const body = slice(name);
  assert.ok(body.includes("<DosDetailSheet") && !body.includes("<Sheet "), `${name} uses the shared shell`);
}
assert.ok(
  client.includes("{formMode === \"reminder\" ? (() => {") && client.includes("<ReminderDetailContent"),
  "a reminder opens as a record first",
);
assert.ok(
  client.includes("const isEditingReminder = !selectedReminder || isReminderSheetEditing;")
    && client.includes("setIsReminderSheetEditing(false);\n    setSelectedReminderId(null)") === false,
  "editing a reminder is an explicit state",
);
const prayerDetail = slice("function PrayerRequestDetailSheet({");
assert.ok(
  prayerDetail.includes("/* Save returns to the updated detail rather than closing it. */\n      setIsEditing(false);")
    && prayerDetail.includes("function cancelEditing() {"),
  "saving a prayer returns to its detail and Cancel restores what was saved",
);

/* ---- 4. Reminder simplified --------------------------------------------- */
const reminderForm = slice("function ReminderFormContent({");
assert.ok(!reminderForm.includes("CalendarConnectionCard"), "no calendar connection card in a reminder");
assert.ok(!reminderForm.includes("Daily soon"), "no dead 'soon' control");
assert.ok(reminderForm.includes("{isPrayerReminder ? (\n          <div>\n            <FieldLabel>Prayer rhythm</FieldLabel>"), "prayer rhythm only on a prayer reminder");
assert.ok(reminderForm.includes('name="person_id" type="hidden"'), "no Person picker when the reminder already belongs to someone");
assert.ok(reminderForm.includes("reminder?.googleSyncEnabled === true"), "an existing reminder is on the calendar only if it already was");
assert.ok(reminderForm.includes("Add to Google Calendar") && reminderForm.includes("Calendar settings"), "one compact calendar choice and a settings link");
const reminderDetail = slice("function ReminderDetailContent({");
assert.ok(reminderDetail.includes("DOS itself does not send a notification."), "the wording says what DOS actually does");
assert.ok(reminderDetail.includes("Could not be added to Google Calendar") && reminderDetail.includes("onRetryCalendarSync"), "a calendar failure is visible and retryable");
assert.ok(client.includes('}, "PATCH", false);') && client.includes("function retryReminderCalendarSync()"), "a retry updates the same reminder rather than creating another");

/* ---- 5. Legacy feedback ------------------------------------------------- */
assert.ok(/alter column meeting_id drop not null/.test(migration), "feedback may belong to a Person and no meeting");
assert.ok(/check \(meeting_id is not null or reviewer_person_id is not null\)/.test(migration), "but it must belong to something");
assert.ok(/dos_meeting_reviews_import_source_unique[\s\S]*response_details #>> '\{import,submission_id\}'/.test(migration), "an import is unique per source submission");
assert.ok(/raise exception/.test(rollback) && /meeting_id is null/.test(rollback), "rollback refuses while person-level feedback exists");
assert.ok(loader.includes('.is("meeting_id", null)') && loader.includes('.in("reviewer_person_id", personIds)'), "person-level feedback is loaded");
assert.ok(loader.includes("function legacyFeedbackFormFromDetails(details: unknown): DosAppLegacyFeedbackForm | null"), "the imported form is read, not guessed");
const feedback = slice("function PersonFeedbackDetailSheet({");
assert.ok(feedback.includes("legacyForm.answers.map((entry) =>") && feedback.includes("entry.answers.map((answer) =>"), "every original question and answer is shown verbatim");
assert.ok(feedback.includes('" · time zone not recorded"'), "an unrecorded time zone is stated, not invented");
assert.ok(feedback.includes("review?.comments?.trim() && !legacyForm"), "imported answers are not re-presented as DOS feedback fields");
assert.ok(client.includes("function legacyFeedbackSubmittedLabel(submittedAtLocal: string | null, fallbackDate: string | null)"), "the stated submission time is displayed without conversion");

/* ---- 6. People screen --------------------------------------------------- */
assert.ok(pillRail.includes("fit?: boolean;") && pillRail.includes("gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`"), "the rail can fit its options without scrolling");
assert.ok(client.includes('options={peopleCircleTabs} value={peopleCircleView}'), "the People tabs are the plain labels");
assert.ok(
  client.includes('{ label: "All", value: "all" },\n  { label: "My 3", value: "three" },\n  { label: "My 12", value: "twelve" },\n  { label: "My 70", value: "seventy" },\n  { label: "My 120", value: "my_120" },'),
  "the tabs read exactly All | My 3 | My 12 | My 70 | My 120",
);
assert.ok(client.includes("`No one in ${circleDisplayName(peopleCircleView)}.`"), "one short empty state");

/* ---- 7. Manage circles, contracts unchanged ----------------------------- */
const manage = client.slice(client.indexOf("function ManageCirclesWorkflow({"), client.indexOf("\nfunction ManageCirclesRow("));
assert.ok(manage.includes('className="grid grid-cols-4 gap-1.5"') && manage.includes("How circles work"), "compact capacity and optional help");
assert.ok(manage.includes("capacityConflicts(counts)") && manage.includes("Confirm these changes"), "capacity enforcement and review-before-save remain");
assert.ok(manage.includes("setSavedCount(changes.length);") && manage.indexOf('if (outcome.status === "rejected")') < manage.indexOf("setSavedCount(changes.length);"), "success is shown only after persistence succeeds");

console.log("DOS People experience correction (USA-264) regression passed.");
