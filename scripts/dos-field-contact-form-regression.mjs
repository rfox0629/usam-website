// Add / Edit Person (Field Contact) form regression.
//
// Rewritten in USA-217 (DOS UI refresh, Phase 5). The July 2026 version
// asserted a pre-USA-168 shape -- "Relationship & Ministry" as a collapsed
// disclosure with `hasRelationshipData`, and a `showDetailsToggle` flow -- that
// stopped existing on 2026-09-04 when USA-168 shipped the Basic Person form,
// so it was the one failing script recorded in the Phase 0 baseline. This
// version asserts the shipped USA-168 shape. Every guarantee that survived
// (email in the core section, independent disclosures, reminders rendered
// once, duplicate detection reusing the import normalizers, sticky footer,
// no retired wrapper components) is kept verbatim.
//
// USA-244 (2026-09-08): the form now has two shapes from one component. Add
// Person is the short path (Person, Connection, then one "Add more details"
// disclosure holding visibility, household, address, notes and the reminder
// shortcut). Edit Person is a set of compact sections, one open at a time,
// whose fields stay mounted while collapsed. The order and disclosure
// assertions below describe those shapes; the guarantees that survived
// (email in the core section, duplicate detection, sticky footer, no retired
// wrappers) are unchanged.
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const formStart = appClient.indexOf("function PersonFormContent");
const formEnd = appClient.indexOf("function DetailCard", formStart);
const formBlock = appClient.slice(formStart, formEnd);

assert(formStart !== -1 && formEnd !== -1, "PersonFormContent must exist in DosMvpAppClient.tsx.");

/* USA-244 follow-up: Add and Edit share one progressive section list, in the
   founder-approved order. Basic information (name, phone, email) comes first
   and starts open; the connection questions and list visibility sit together
   in Relationship; household, details, the reminder shortcut and notes
   follow. */
const sectionOrder = [...formBlock.matchAll(/key: "(basic|relationship|household|details|reminder|notes)"/g)].map((match) => match[1]);
assert(
  sectionOrder.join(",") === "basic,relationship,household,details,reminder,notes",
  `Add Person must present the shared sections in the approved order (got ${sectionOrder.join(",") || "none"}).`,
);
assert(
  formBlock.indexOf("content: contactFields,") < formBlock.indexOf("{stageSelect}")
    && formBlock.indexOf("{stageSelect}") < formBlock.indexOf("content: householdFields,")
    && formBlock.indexOf("content: householdFields,") < formBlock.indexOf("content: detailsFields,")
    && formBlock.indexOf("content: detailsFields,") < formBlock.indexOf("content: notesField,"),
  "The section contents follow the same order as the section keys.",
);

assert(
  formBlock.includes('name="email"') && formBlock.indexOf('name="email"') < formBlock.indexOf('label="How do you know them?"'),
  "Email must be collected in the core Person section, not buried behind a collapsed details toggle.",
);

assert(
  !formBlock.includes("Show Extra Details") && !formBlock.includes("Additional Information"),
  "The old single all-or-nothing Additional Information toggle must be replaced by independent disclosure sections.",
);

/* USA-244 follow-up: the oversized single disclosure on Add is gone. The
   optional groups are the shared progressive sections instead. */
assert(
  !formBlock.includes('title="Add more details"'),
  "Add Person's optional groups must no longer sit behind one oversized disclosure.",
);

/* Connection is asked in the Relationship section, never as a nested
   disclosure of its own. */
assert(
  !/<DisclosureSection[^>]*title="Connection"/.test(formBlock),
  "The connection questions must stay a plain section, not a collapsed disclosure.",
);

/* Engagement Levels is an Advanced Feature: present only when the workspace
   flag is on, and it lives in Relationship on both forms. */
assert(
  formBlock.includes("const engagementField = showEngagement ? (")
    && /\{visibilitySelect\}\s*\{engagementField\}/.test(formBlock)
    && !formBlock.includes('<PersonEditSection id="advanced"'),
  "Engagement must be gated by the Advanced Feature and sit inside Relationship on both forms.",
);

assert(
  formBlock.includes("<ImportantDatesReminderSection calendarConnected={calendarConnected} />")
    && !formBlock.includes('description="Add one dated reminder to this person." title="Reminders"'),
  "The reminder shortcut renders as its own section on Add, not nested inside a second outer disclosure with duplicate copy.",
);

/* One shared set of compact sections, one open at a time, contents hidden
   rather than unmounted so a collapsed section still submits its values. */
const sectionIds = [...formBlock.matchAll(/key: "(basic|relationship|household|details|reminder|notes)"/g)].map((match) => match[1]);
assert(
  formBlock.includes("const isEditMode = !showDetailsToggle;")
    && sectionIds.join(",") === "basic,relationship,household,details,reminder,notes"
    && formBlock.includes('const [openSection, setOpenSection] = useState<PersonEditSectionKey>("basic");')
    && formBlock.includes("setOpenSection((current) => (current === key ? null : key))")
    && appClient.includes('<div className={open ? "grid gap-3 pb-4" : "hidden"} data-person-section={id} hidden={!open} id={`person-section-${id}`}>'),
  "Add and Edit must share compact sections (Basic information, Relationship, Household, Details, Reminder, Notes), one open at a time, with collapsed contents kept mounted.",
);

assert(
  formBlock.indexOf("Delete this person") > formBlock.lastIndexOf("</PersonEditSection>")
    && formBlock.indexOf("Delete this person") < formBlock.indexOf("<StickyFormFooter>"),
  "Delete must stay separate at the bottom of the form, below every section and above the sticky footer.",
);

assert(
  formBlock.includes("findLikelyDuplicatePerson(people,")
    && formBlock.includes("This looks like an existing contact")
    && formBlock.includes("onOpenExistingPerson"),
  "Add Contact must run a client-side duplicate check and offer to open the existing match instead of creating a new one.",
);

assert(
  appClient.includes("function findLikelyDuplicatePerson(")
    && appClient.includes("peopleImportPhoneKey(candidate.phone)")
    && appClient.includes("peopleImportEmailKey(candidate.email)"),
  "Duplicate detection must reuse the existing phone/email normalization helpers built for CSV import, not new ad hoc logic.",
);

assert(
  formBlock.includes("if (isEditMode || duplicateDismissed || !people?.length)"),
  "Duplicate detection must be skipped in Edit mode and once the user dismisses the match.",
);

assert(
  formBlock.includes("<StickyFormFooter>") && formBlock.includes("</StickyFormFooter>"),
  "Field Contact's primary action must sit in a sticky footer so it stays reachable on mobile.",
);

assert(
  !appClient.includes("function AdditionalPersonInformation(") && !appClient.includes("function PersonExtraDetails("),
  "The retired AdditionalPersonInformation/PersonExtraDetails wrapper components must be fully removed, not left as dead code.",
);

const addPersonCallStart = appClient.indexOf('formMode === "person" ?');
const addPersonCallEnd = appClient.indexOf("</DosWorkflowPage>", addPersonCallStart);
const addPersonCall = appClient.slice(addPersonCallStart, addPersonCallEnd);

assert(
  addPersonCall.includes("people={people}")
    && addPersonCall.includes("onOpenExistingPerson={(person) => {")
    && addPersonCall.includes("setSelectedPersonId(person.id);")
    && addPersonCall.includes("openPersonEdit(person);"),
  "Add Person must pass the live people list and an existing-person opener (that selects the person before opening Edit) into PersonFormContent for duplicate detection.",
);

console.log("DOS Field Contact form regression passed.");
