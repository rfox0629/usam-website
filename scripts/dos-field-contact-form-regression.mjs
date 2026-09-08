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

/* USA-244 Add order: the core Person section, then Connection (two
   dropdowns, always visible), then everything else behind "Add more details"
   with Household & Family before Address & Details before Notes. */
const addStart = formBlock.indexOf("/* Add Person: the short path first");
const addBlock = formBlock.slice(addStart);
assert(
  addStart !== -1
    && addBlock.indexOf('title="Person"') !== -1
    && addBlock.indexOf('title="Person"') < addBlock.indexOf('title="Connection"')
    && addBlock.indexOf('title="Connection"') < addBlock.indexOf('title="Add more details"')
    && addBlock.indexOf("Household &amp; Family") < addBlock.indexOf("Address &amp; Details")
    && addBlock.indexOf("Address &amp; Details") < addBlock.indexOf(">Notes<"),
  "Add Person must present Person, then Connection, then Add more details (Household & Family, Address & Details, Notes), in that order.",
);

assert(
  formBlock.includes('name="email"') && formBlock.indexOf('name="email"') < formBlock.indexOf('label="How do you know them?"'),
  "Email must be collected in the core Person section, not buried behind a collapsed details toggle.",
);

assert(
  !formBlock.includes("Show Extra Details") && !formBlock.includes("Additional Information"),
  "The old single all-or-nothing Additional Information toggle must be replaced by independent disclosure sections.",
);

assert(
  addBlock.includes('<DisclosureSection description="Visibility, household, address, and notes." title="Add more details">')
    && (addBlock.match(/<DisclosureSection /g) ?? []).length === 1,
  "Add Person's optional groups must sit behind exactly one \"Add more details\" disclosure.",
);

/* Connection is a visible section, never a disclosure: the two dropdowns
   are the Basic form. */
assert(
  !/<DisclosureSection[^>]*title="Connection"/.test(formBlock),
  "Connection must stay a visible section, not a collapsed disclosure.",
);

/* Engagement Levels is an Advanced Feature: present only when the workspace
   flag is on, inside Add more details on Add and its own Advanced section on Edit. */
assert(
  formBlock.includes("const engagementField = showEngagement ? (")
    && addBlock.includes("{engagementField}")
    && /showEngagement \? \(\s*<PersonEditSection id="advanced"/.test(formBlock),
  "Engagement must be gated by the Advanced Feature on both shapes of the form.",
);

assert(
  addBlock.includes("<ImportantDatesReminderSection />")
    && !formBlock.includes('description="Add one dated reminder to this person." title="Reminders"'),
  "Reminders must render its own single collapsible (ImportantDatesReminderSection) directly on Add, not nested inside a second outer DisclosureSection with duplicate copy.",
);

/* Edit Person: compact sections, one open at a time, fields hidden rather
   than unmounted so a collapsed section still submits its values. */
const editStart = formBlock.indexOf("if (isEditMode) {");
const editBlock = formBlock.slice(editStart, addStart);
const editSectionIds = [...editBlock.matchAll(/<PersonEditSection id="([a-z]+)"/g)].map((match) => match[1]);
assert(
  formBlock.includes("const isEditMode = !showDetailsToggle;")
    && editStart !== -1
    && editSectionIds.join(",") === "basic,relationship,household,details,notes,advanced"
    && editBlock.includes('const [openSection, setOpenSection] = useState<PersonEditSectionKey>("basic");') === false
    && formBlock.includes('const [openSection, setOpenSection] = useState<PersonEditSectionKey>("basic");')
    && formBlock.includes("setOpenSection((current) => (current === key ? null : key))")
    && appClient.includes('<div className={open ? "grid gap-3 pb-4" : "hidden"} hidden={!open} id={`person-section-${id}`}>'),
  "Edit Person must be compact sections (Basic information, Relationship, Household, Details, Notes, Advanced), one open at a time, with collapsed fields kept mounted.",
);

assert(
  editBlock.indexOf("Delete this person") > editBlock.lastIndexOf("</PersonEditSection>")
    && editBlock.indexOf("Delete this person") < editBlock.indexOf("<StickyFormFooter>"),
  "Delete must stay separate at the bottom of Edit Person, below every section and above the sticky footer.",
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
