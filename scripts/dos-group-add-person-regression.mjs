/* USA-283 Groups revamp: adding a person to a group.
 *
 * https://linear.app/usa-missionaries/issue/USA-283
 *
 * Three halves. The rules, run for real: who "add this person" refers to
 * (link, review or create), how a phone's contact file becomes editable
 * drafts, and the canonical first/last name convention. Then the contract over
 * the write route and the sheet: a shared email or phone never links a
 * differently named person silently, a double tap cannot create twice, the
 * sheet asks for First and Last name, and nothing claims to send a message.
 * Then the redesigned group home keeps every path it used to offer.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  contactPickerAvailable,
  contactsFromPickerResults,
  isLikelyVCardFile,
  parseVCardText,
  splitFullNameForReview,
} from "../src/lib/dos/contact-import.ts";
import { decideGroupMemberPerson, normalizePhoneForMatch } from "../src/lib/dos/group-member-match.ts";
import { joinNameParts, nameSplitIsAmbiguous, splitNameParts } from "../src/lib/dos/person-name.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const slice = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);

  assert.ok(from >= 0 && to > from, `slice ${start} .. ${end}`);
  return source.slice(from, to);
};

/* ---------- 1. Who is this person? ---------- */

const jane = { email: "family@example.com", id: "jane", name: "Jane Smith", phone: "6515550100", status: "new" };
const john = { email: "john@example.com", id: "john", name: "John Smith", phone: null, status: "new" };
const archivedJohn = { email: null, id: "old-john", name: "John Smith", phone: null, status: "archived" };
const base = { confirmNearDuplicate: false, email: "", name: "", phone: "" };

assert.deepEqual(
  decideGroupMemberPerson({ ...base, email: "family@example.com", name: "John Smith" }, [jane]),
  { kind: "review", person: jane, reason: "shared_contact" },
  "a shared email with a different name is reviewed, never linked silently (the reported defect)",
);
assert.deepEqual(
  decideGroupMemberPerson({ ...base, confirmNearDuplicate: true, email: "family@example.com", name: "John Smith" }, [jane]),
  { kind: "create" },
  "\"This is someone new\" creates a new person instead of linking the contact match",
);
assert.deepEqual(
  decideGroupMemberPerson({ ...base, name: "jane  SMITH", phone: "+1 (651) 555-0100" }, [jane]),
  { kind: "link", person: jane },
  "same name and same contact is the same person and is linked",
);
assert.deepEqual(
  decideGroupMemberPerson({ ...base, name: "John Smith" }, [john]),
  { kind: "review", person: john, reason: "same_name" },
  "a name alone never merges; it is reviewed",
);
assert.deepEqual(
  decideGroupMemberPerson({ ...base, confirmNearDuplicate: true, name: "John Smith" }, [john]),
  { kind: "create" },
  "a confirmed same-name person is created as someone new",
);
assert.deepEqual(decideGroupMemberPerson({ ...base, name: "John Smith" }, [archivedJohn]), { kind: "create" }, "an archived namesake does not block");
assert.deepEqual(decideGroupMemberPerson({ ...base, name: "Benjamin Sevlie" }, [jane, john]), { kind: "create" }, "no match creates");
assert.equal(normalizePhoneForMatch("+1 (651) 555-0100"), "6515550100", "a leading US country code is the same number");
assert.equal(normalizePhoneForMatch("555"), null, "a fragment is not a phone number");

/* ---------- 2. Contacts from a phone ---------- */

const appleExport = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "PRODID:-//Apple Inc.//iPhone OS 18.6//EN",
  "N:Sevlie;Benjamin;;;",
  "FN:Benjamin Sevlie",
  "item1.TEL;type=pref:+1 (651) 555-0101",
  "TEL;type=CELL;type=VOICE:(651) 555-0199",
  "EMAIL;type=INTERNET;type=WORK:ben.sevlie@work.example.com",
  "EMAIL;type=INTERNET;type=HOME;type=pref:ben@example.com",
  "PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAAQABAAD",
  " DBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:O'Brien-Núñez;José María;;;",
  "FN:José María O'Brien-Núñez",
  "TEL;type=CELL:6515550142",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:;;;;",
  "FN:",
  "ORG:Lakeville Hardware;",
  "TEL;type=WORK:952-555-0110",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Mary Ann Smith",
  "EMAIL:mary@example.com",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:2.1",
  "N;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Andr=C3=A9;Zo=C3=AB;;;",
  "TEL;CELL:651.555.0177",
  "END:VCARD",
  "BEGIN:VCARD",
  "VERSION:3.0",
  "NOTE:nothing usable here",
  "END:VCARD",
].join("\r\n");
const parsed = parseVCardText(appleExport);

assert.equal(parsed.contacts.length, 5, "every usable card becomes a draft");
assert.equal(parsed.skipped, 1, "a card with no name, phone or email is skipped and counted");

const [ben, jose, company, mary, zoe] = parsed.contacts;

assert.deepEqual([ben.firstName, ben.lastName, ben.nameSource, ben.nameNeedsReview], ["Benjamin", "Sevlie", "structured", false], "the vCard N property gives first and last outright");
assert.deepEqual(ben.phones.map((item) => item.value), ["+1 (651) 555-0101", "(651) 555-0199"], "every number is kept, preferred first; Apple's item1. grouping is understood");
assert.deepEqual(ben.emails.map((item) => item.value), ["ben@example.com", "ben.sevlie@work.example.com"], "every email is kept, preferred first");
assert.deepEqual([jose.firstName, jose.lastName], ["José María", "O'Brien-Núñez"], "Unicode, apostrophes, hyphens and compound names survive untouched");
assert.deepEqual([company.firstName, company.nameSource, company.nameNeedsReview], ["Lakeville Hardware", "organization", true], "a company card is offered but flagged for the leader to name");
assert.deepEqual([mary.firstName, mary.lastName, mary.nameSource, mary.nameNeedsReview], ["Mary", "Ann Smith", "formatted", true], "a three-word full name is split by guess and flagged, never silently decided");
assert.deepEqual([zoe.firstName, zoe.lastName], ["Zoë", "André"], "quoted-printable UTF-8 (older exports) is decoded");
assert.deepEqual(splitFullNameForReview("Tim Tran"), { firstName: "Tim", lastName: "Tran", needsReview: false }, "a two-word name splits without a warning");
assert.deepEqual(splitFullNameForReview("Cher"), { firstName: "Cher", lastName: "", needsReview: false }, "a single name is a first name");

const picked = contactsFromPickerResults([{ email: ["a@example.com"], name: ["Ana de Souza"], tel: ["+1 651 555 0123", "+1 651 555 0123"] }]);

assert.equal(picked.length, 1);
assert.deepEqual([picked[0].firstName, picked[0].lastName, picked[0].nameNeedsReview, picked[0].phones.length], ["Ana", "de Souza", true, 1], "Contact Picker names are guesses and flagged; duplicate numbers collapse");
assert.equal(contactPickerAvailable({ navigator: {} }), false, "no picker on a browser without navigator.contacts (iPhone Safari by default)");
assert.equal(contactPickerAvailable({ navigator: { contacts: { select() {} } } }), false, "a half-present API is not offered");
assert.equal(contactPickerAvailable({ ContactsManager: function ContactsManager() {}, navigator: { contacts: { select() {} } } }), true, "offered only where the browser really exposes it");
assert.ok(isLikelyVCardFile({ name: "Contacts.VCF", type: "" }) && isLikelyVCardFile({ name: "card", type: "text/x-vcard" }) && !isLikelyVCardFile({ name: "people.csv", type: "text/csv" }), "a .vcf is recognised by name or type");

/* ---------- 3. The canonical name convention ---------- */

assert.equal(joinNameParts("  José ", " O'Brien-Núñez "), "José O'Brien-Núñez", "first and last are joined with one space, as typed");
assert.equal(joinNameParts("Cher", ""), "Cher", "a single-name person stays valid");
assert.deepEqual(splitNameParts("Mary  Ann Smith"), { firstName: "Mary", lastName: "Ann Smith" }, "the People form's display split is unchanged");
assert.ok(nameSplitIsAmbiguous("Juan de la Cruz") && !nameSplitIsAmbiguous("Tim Tran"));

/* ---------- 4. The write route ---------- */

const route = read("app/api/dos/app/groups/members/route.ts");
const resolver = slice(route, "async function resolveExistingPerson(", "async function createPerson(");

assert.ok(resolver.includes("decideGroupMemberPerson({"), "the route decides through the tested rule");
assert.ok(!resolver.includes(".limit(1)\n      .maybeSingle()"), "a contact match is no longer taken as the person outright");
assert.ok(!resolver.includes(".limit(25)"), "the name check covers the whole workspace, not the 25 most recent people");
assert.ok(resolver.includes('.ilike("name", escapeLikePattern('), "the name lookup is exact and literal");
assert.ok(resolver.includes("{ status: 409 }") && resolver.includes("reason: decision.reason"), "a possible match comes back for review with its reason");
assert.ok(route.includes('writeResult.error.code === "23505"'), "two racing adds meet the unique membership and report the winner");
assert.ok(route.includes("loadDosGroupRoleAccess(supabase, authResult.authorization, {"), "only a group leader or co-leader may add");
assert.ok(route.includes("workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}"), "every lookup stays inside the workspace");

/* ---------- 5. The sheet ---------- */

const sheet = read("src/components/dos/groups/GroupAddPersonSheet.tsx");
const client = read("app/dos/app/DosMvpAppClient.tsx");

assert.ok(sheet.includes("Find an existing person") && sheet.includes("Add a new person") && sheet.includes("Import from contacts"), "the three ways in are named plainly");
assert.ok(!sheet.includes("New Guest") && !sheet.includes("Search Field") && !client.includes("New Guest</p>") && !client.includes("<FieldLabel>Search Field</FieldLabel>"), "the old labels are gone");
assert.ok(sheet.includes("First name<RequiredMark />") && sheet.includes('label="Last name"'), "a new person has First name (required) and Last name, like the People form");
assert.ok(sheet.includes("name: draftName,") && sheet.includes("const draftName = joinNameParts(draft.firstName, draft.lastName);"), "the stored name is composed exactly as the People form composes it");
assert.ok(sheet.includes("as a new person") && sheet.includes("startNewPerson(trimmedQuery)"), "a search with no match offers to add what was typed, carried into the fields");
assert.ok(sheet.includes("sends them no message and creates no account"), "the sheet says adding sends nothing and creates no account");
assert.ok(sheet.includes("if (inFlightRef.current) {\n      return null;\n    }"), "a second tap while saving cannot create a second person");
assert.ok(sheet.includes("const blockedByMatch = matches.length > 0 && !confirmedNew;") && sheet.includes("disabled={isSaving || !compactNamePart(draft.firstName) || blockedByMatch}"), "a possible existing person must be resolved before a new one is created");
assert.ok(sheet.includes("setServerMatch(outcome.nearDuplicate)"), "a match only the server knows about is shown in the same review");
assert.ok(sheet.includes("View person"), "success offers View person");
assert.ok(sheet.includes("setSelectedContactKeys(next.length === 1 ? [next[0].key] : [])"), "a contact list starts with nobody selected; only chosen contacts are imported");
assert.ok(sheet.includes("Choose from this phone’s contacts") && sheet.includes("{pickerAvailable ? ("), "direct contact picking appears only where it is available");
assert.ok(sheet.includes("Share Contact") && sheet.includes("Export"), "the iPhone export steps are explained");
assert.ok(!/fetch\(/.test(sheet), "the sheet writes only through the canonical onAdd path");
assert.ok(sheet.includes('data-unsaved="ignore"'), "search and selection controls are viewing controls, not unsaved work");

const addMember = slice(client, "  async function addGroupMember(payload: GroupMemberAddPayload): Promise<GroupAddMemberOutcome> {", "  async function removeGroupMember(");

assert.ok(addMember.includes("response.status === 409 && result.nearDuplicate"), "the client passes a possible match back to the sheet instead of an error");
assert.ok(addMember.includes("router.refresh();"), "a saved addition is re-read from the server");
assert.ok(addMember.includes("setQuickAddedPeople("), "a new person is visible in People at once");
assert.ok(client.includes("openPersonDetail(personId);"), "View person opens the Person record");

/* ---------- 6. The group home ---------- */

const home = slice(client, "function GroupDetailWorkspaceV2({", "function GroupOverviewTabV2({");
const overview = slice(client, "function GroupOverviewTabV2({", "function GroupPeopleTabV2({");

assert.ok(!home.includes("<GroupLogoMark"), "the decorative tile that repeated the title is gone");
assert.equal((home.match(/\{group\.name\}<\/h1>/g) ?? []).length, 1, "the group name is the one title");
assert.ok(home.includes("<PillRail edgeInset={4}"), "sections are one scrollable rail, not wrapping buttons");
assert.ok(!overview.includes("GroupV2StatCard") && !client.includes("function GroupV2StatCard("), "the six stat cards are gone");
assert.ok(overview.includes("pendingRequestCount > 0 ?"), "a pending count appears only when it is news");
assert.ok(overview.includes("computeGroupJourneyRows(group, resourceAssignments)"), "Overview shows the current journey from the group's own assignments");
assert.ok(overview.includes("Choose a journey") && overview.includes("No one is in this group yet."), "empty sections offer the useful next action");
assert.ok(home.includes("pb-dos-fab-clearance"), "content clears the bottom navigation and the floating action");
assert.ok(!/text-\[#94A3B8\]|text-\[10px\]|#FFF7ED|peach/i.test(home + overview), "no faint slate labels or warm tints on the group home");

console.log("DOS group add-person and group home (USA-283) regression passed.");
