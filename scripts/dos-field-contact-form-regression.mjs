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

/* USA-168 order: the core Person section, then Relationship (three questions,
   always visible), then the optional groups as independent disclosures. */
assert(
  formBlock.indexOf('title="Person"') !== -1
    && formBlock.indexOf('title="Person"') < formBlock.indexOf('title="Relationship"')
    && formBlock.indexOf('title="Relationship"') < formBlock.indexOf('title="Household & Family"')
    && formBlock.indexOf('title="Household & Family"') < formBlock.indexOf('title="Address & Details"'),
  "Field Contact must present Person, then Relationship, then Household & Family, then Address & Details, in that order.",
);

assert(
  formBlock.includes('name="email"') && formBlock.indexOf('name="email"') < formBlock.indexOf('title="Relationship"'),
  "Email must be collected in the core Person section, not buried behind a collapsed details toggle.",
);

assert(
  !formBlock.includes("Show Extra Details") && !formBlock.includes("Additional Information"),
  "The old single all-or-nothing Additional Information toggle must be replaced by independent disclosure sections.",
);

assert(
  formBlock.includes("DisclosureSection")
    && formBlock.includes('title="Household & Family"')
    && formBlock.includes('title="Address & Details"')
    && formBlock.includes('title="Notes"'),
  "Field Contact optional groups (household, address, notes) must each be an independent DisclosureSection.",
);

/* Relationship is a visible section, never a disclosure: the three questions
   are the Basic form (USA-168). */
assert(
  !/<DisclosureSection[^>]*title="Relationship"/.test(formBlock),
  "Relationship must stay a visible section, not a collapsed disclosure.",
);

/* Engagement Levels is an Advanced Feature: present only when the workspace
   flag is on, and then as its own disclosure. */
assert(
  formBlock.includes("showEngagement ? (") && formBlock.includes('title="Engagement Level"'),
  "Engagement must be gated by the Advanced Feature and rendered as its own disclosure.",
);

assert(
  formBlock.includes("<ImportantDatesReminderSection />")
    && !formBlock.includes('description="Add one dated reminder to this person." title="Reminders"'),
  "Reminders must render its own single collapsible (ImportantDatesReminderSection) directly, not nested inside a second outer DisclosureSection with duplicate copy.",
);

assert(
  formBlock.includes("const isEditMode = !showDetailsToggle;")
    && formBlock.includes("defaultOpen={isEditMode || hasHouseholdDetails(additionalDefaults ?? {})}")
    && formBlock.includes("defaultOpen={isEditMode || hasAddressData}"),
  "Optional sections must start open when editing an existing contact (or when already populated) and closed for a fresh Add.",
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
