// USA-242: the compact accountability composer. One editor at a time, the
// goal first, suggestions behind "Need an idea?", one Tracking select that
// reveals only its fields, collapsed summary rows with an overflow menu, and
// the USA-235 field contract untouched on every path (Log Meeting and Person).
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const between = (start, end) => client.slice(client.indexOf(start), client.indexOf(end, client.indexOf(start) + 1));
const fields = between("function AccountabilityFields({", "\ntype MeetingAccountabilityComposerDraft");
const composer = between("function MeetingAccountabilityComposer(", "\nfunction AccountabilityScheduleSheet(");
const leader = between("function MeetingLeaderReflectionSection(", "\nfunction MeetingGrowthReflectionSection(");
/* USA-257 removed the legacy Home LogCheckInSheet that used to follow this sheet. */
const personAdd = between("function AccountabilityScheduleSheet(", "\nfunction DesktopHomeDashboard(");
const personEdit = between("function PersonAccountabilityEditSheet(", "\nfunction PersonAccountabilityCheckInSheet(");

// 1. The goal comes first and needs no taxonomy; suggestions are a collapsed disclosure.
const titleAt = fields.indexOf("What are they working toward?");
const ideasAt = fields.indexOf("Need an idea?");
const trackingAt = fields.indexOf('label="Tracking"');
assert(titleAt > 0 && ideasAt > titleAt && trackingAt > ideasAt, "The editor must lead with the goal, then the Need an idea? disclosure, then Tracking.");

/* USA-242 follow-up: the goal is the card's primary question, so it is asked in
   DOS blue rather than in the muted field-label grey, it keeps the same
   label-to-control gap as Tracking and Frequency, its placeholder is short, and
   "Need an idea?" sits beside the prompt instead of below the input. */
assert(
  /<span className="[^"]*font-bold text-dos-blueText" id=\{goalLabelId\}>What are they working toward\?<\/span>/.test(fields),
  "The goal prompt must use the canonical DOS blue, not muted grey.",
);
assert(
  fields.includes('placeholder="Enter a goal"') && !fields.includes("Disciple 3 people, read John 4-6, pray each morning..."),
  "The goal input must use the short neutral placeholder, not a long example sentence.",
);
assert(
  fields.indexOf("Need an idea?") < fields.indexOf('name={`${namePrefix}_title`}'),
  "Need an idea? belongs beside the prompt, above the input, not below the field.",
);
assert(
  fields.includes('<div className="mt-1.5">\n          <input\n            aria-labelledby={goalLabelId}'),
  "The goal input must keep the same label-to-control spacing as Tracking and Frequency.",
);

/* Suggestions are short, one-tap, and get out of the way when chosen. */
assert(
  fields.includes("setIsIdeasOpen(false);\n    goalInputRef.current?.focus();"),
  "Choosing a suggestion must fill the goal and close the suggestion menu.",
);
assert(fields.includes("function writeMyOwn()") && fields.includes(">\n                Write my own\n              </button>"), "A custom path must stay available without choosing a suggestion.");
assert(
  client.includes('{ label: "Meet weekly", trackingMode: "regular" }')
    && client.includes('{ label: "Disciple 3 people", targetKind: "people", trackingMode: "number" }')
    && client.includes('{ label: "Complete a resource", trackingMode: "complete" }')
    && client.includes('{ label: "Read Scripture together", trackingMode: "regular" }')
    && client.includes('{ label: "Pray together", trackingMode: "regular" }'),
  "Discipleship suggestions must be the short, one-tap set.",
);
assert(!fields.includes("Write the goal in your own words above."), "The paragraph of helper copy is replaced by a one-tap custom path.");
/* rounded-dos-3 is the 999px pill radius: right for a chip, an ellipse on a
   panel. The suggestion popover uses the card radius instead. */
assert(
  fields.includes('<div className="grid gap-2 rounded-[18px] border border-dos-line bg-white p-2.5">'),
  "The suggestion panel must use the card radius, not the pill radius.",
);
assert(fields.includes("const [isIdeasOpen, setIsIdeasOpen] = useState(false);") && fields.includes("{isIdeasOpen ? ("), "Need an idea? must start collapsed and reveal focus chips only when opened.");
assert(
  ["Scripture", "Prayer", "Discipleship", "Relationships", "Health", "Other"].every((label) => client.includes(`{ label: "${label}", value: "${label.toLowerCase()}" }`))
    && !fields.includes("Start with an area")
    && !fields.includes("Suggested goals\">")
    && fields.includes('aria-label="Focus"'),
  "Focus chips must be the six categories inside the disclosure, not always-visible area pills.",
);
assert(
  fields.includes("function chooseSuggestion(suggestion: AccountabilitySuggestion) {")
    && fields.includes("setTitle(suggestion.label);")
    && fields.includes("setTrackingMode(suggestion.trackingMode);")
    && !fields.includes("useEffect(() => {\n    setTitle("),
  "A suggestion must populate the goal and tracking only on explicit selection, never by effect.",
);

// 2. Tracking is one select with three choices that reveal only their fields.
assert(
  client.includes('{ helper: "Weekly, every 2 weeks, or monthly", label: "Check in regularly", value: "regular" }')
    && client.includes('label: "Reach a target", value: "number" }')
    && client.includes('label: "Complete once", value: "complete" }')
    && fields.includes("<CompactOptionSelect\n              hideLabel\n              label=\"Tracking\"")
    && !fields.includes("trackingOptions.map((option) =>"),
  "Tracking must be one compact select (Check in regularly / Reach a target / Complete once), not stacked cards.",
);
const regularBlock = fields.slice(fields.indexOf('{trackingMode === "regular" ? ('), fields.indexOf('{trackingMode === "number" ? ('));
const numberBlock = fields.slice(fields.indexOf('{trackingMode === "number" ? ('), fields.indexOf('{trackingMode === "complete" ? ('));
const completeBlock = fields.slice(fields.indexOf('{trackingMode === "complete" ? ('));
assert(regularBlock.includes('label="Frequency"') && regularBlock.includes("name={`${namePrefix}_date`}") && !regularBlock.includes("_target_count"), "Check in regularly must show frequency and start only.");
assert(numberBlock.includes('label="Target number"') && numberBlock.includes('label="Unit"') && numberBlock.includes("name={`${namePrefix}_target_count`}") && numberBlock.includes("name={`${namePrefix}_target_kind`}") && numberBlock.includes("name={`${namePrefix}_date`}"), "Reach a target must show target number, unit and due date.");
assert(completeBlock.includes("name={`${namePrefix}_date`}") && !completeBlock.includes("_target_count") && !completeBlock.includes('label="Frequency"'), "Complete once must show the due date only.");
assert(fields.includes("<input name={`${namePrefix}_frequency`} type=\"hidden\" value={submittedFrequency} />") && fields.includes("accountabilityDraftFrequency({ frequency, trackingMode })"), "The submitted frequency must derive from the tracking choice (one_time for target and complete-once goals).");

// 3. Log Meeting: one editor at a time, collapsed summaries, menu with Edit/Remove, + Add another.
assert(leader.includes("<MeetingAccountabilityComposer") && !leader.includes("border-l-2 border-[#DCEBFF] pl-4\" key={index}"), "Log Meeting must render the composer without the tall guide line around accountability.");
assert(composer.includes("const [editing, setEditing] = useState<{ draft: MeetingAccountabilityComposerDraft; isNew: boolean } | null>"), "Exactly one editor may be open: the composer holds a single editing slot.");
assert(composer.includes("if (editing && editing.draft.key !== draft.key && !commitEditor()) {"), "Opening another draft's editor must first collapse the current one.");
assert(composer.includes("const summary = accountabilityDraftSummary(draft, formatShortDate);") && composer.includes("{summary.title}") && composer.includes("{summary.meta}"), "Saved drafts must collapse to a title + summary row.");
assert(composer.includes('role="menu"') && composer.includes("aria-label={`Options for ${summary.title}`}") && composer.includes(">\n                    <Pencil") && composer.includes("Remove\n") && !client.includes("Remove accountability"), "Each summary row must carry an overflow menu with Edit and Remove; no permanent Remove accountability control.");
assert(composer.includes("{editing === null && drafts.length > 0 ? (") && composer.includes("Add another"), "+ Add another must appear only beneath saved drafts while no editor is open.");
assert(composer.includes('{editing.isNew ? "Add accountability" : "Done"}') && composer.includes('setEditorError("Add what they are working toward.");'), "The editor must confirm with Add accountability / Done and validate the goal inline.");

// 4. The USA-235 contract: contiguous prefixes, hidden inputs for collapsed drafts, no stale target values.
assert(
  composer.includes("namePrefix={`meeting_accountability_${index}`}")
    && ["_title", "_frequency", "_date"].every((suffix) => composer.includes(`name={\`meeting_accountability_\${index}${suffix}\`} type="hidden"`))
    && composer.includes('{draft.trackingMode === "number" ? (\n              <>\n                <input name={`meeting_accountability_${index}_target_count`} type="hidden"'),
  "Collapsed drafts must submit the same meeting_accountability_<index>_* fields, with target fields only for Reach a target.",
);
assert(composer.includes("const orderedDrafts = editing?.isNew ? [...drafts, editing.draft] : drafts;"), "Indices must stay contiguous so persistMeetingAccountability walks every draft.");
assert(client.includes("async function persistMeetingAccountability({") && client.includes("function accountabilityRoute(formData: FormData, prefix: string)"), "The USA-235 writer and router must be untouched.");

// 5. Person reuses the same editor (add and edit), and editing keeps the record's kind.
assert(personAdd.includes("<AccountabilityFields") && personEdit.includes("<AccountabilityFields") && personEdit.includes("lockType"), "Person Add/Edit Accountability must render the same editor; editing locks the kind.");
assert(fields.includes("defaultTrackingMode ?? accountabilityTrackingModeFor(defaultFrequency, defaultTargetCount)"), "Existing records must reopen in the tracking mode that matches their data.");

// 6. Touch targets and tokens.
assert(!fields.includes("min-h-[52px]") && (fields.match(/min-h-11/g) ?? []).length >= 2 && client.includes("function AccountabilityChoiceClass(active: boolean) {\n  return `min-h-11") && (composer.match(/min-h-11/g) ?? []).length >= 5 && composer.includes("h-11 w-11"), "Compact controls must keep 44px targets.");
assert(!fields.includes("text-[#64748B]") && !composer.includes("text-[#64748B]"), "No light-grey instructional text in the composer; use the DOS tokens.");

// 7. Runtime: summary and mode helpers.
const presentation = await import("../src/lib/dos/accountability-presentation.ts");
const fmt = (value) => value;
assert(presentation.accountabilityTrackingModeFor("monthly", "") === "regular" && presentation.accountabilityTrackingModeFor("one_time", "3") === "number" && presentation.accountabilityTrackingModeFor("one_time", "") === "complete" && presentation.accountabilityTrackingModeFor("one_time", null) === "complete", "Recurring, measurable and one-time records must reopen in the right mode.");
assert(presentation.accountabilityDraftFrequency({ frequency: "monthly", trackingMode: "regular" }) === "monthly" && presentation.accountabilityDraftFrequency({ frequency: "monthly", trackingMode: "number" }) === "one_time" && presentation.accountabilityDraftFrequency({ frequency: "one_time", trackingMode: "regular" }) === "weekly", "Switching tracking must not submit a stale frequency.");
const base = { date: "2026-10-07", frequency: "monthly", targetCount: "3", targetKind: "people", title: "Disciple 3 people" };
assert(JSON.stringify(presentation.accountabilityDraftSummary({ ...base, trackingMode: "regular" }, fmt)) === JSON.stringify({ meta: "Monthly · Starts 2026-10-07", title: "Disciple 3 people" }), "Recurring summary must read like Monthly · Starts <date>.");
assert(presentation.accountabilityDraftSummary({ ...base, trackingMode: "number" }, fmt).meta === "3 people · Due 2026-10-07", "Target summary must read like 3 people · Due <date>.");
assert(presentation.accountabilityDraftSummary({ ...base, trackingMode: "complete" }, fmt).meta === "Due 2026-10-07", "Complete-once summary must read like Due <date>.");

console.log("DOS accountability composer regression passed.");
