// USA-269 — saved-state tracking across DOS (founder, 2026-09-11).
//
// Three rules, held here:
//   1. A successful save establishes a new baseline; closing afterwards with
//      no further edit leaves without a dialog, and editing again restores
//      the protection.
//   2. Viewing controls (search, filters, expanders) are never unsaved work.
//   3. Only the work that was saved is reset; an unrelated draft on the same
//      surface keeps its protection.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  discardConfirmationCopy,
  exitAfterSaveNeedsConfirmation,
  exitNeedsConfirmation,
  formIsDirty,
  isViewingControl,
  leaveWithoutSavingCopy,
  unsavedWorkIgnoreAttribute,
} from "../src/lib/dos/unsaved-work.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const slice = (source, start, end) => { const a = source.indexOf(start); const b = source.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `slice ${start}`); return source.slice(a, b); };

// 1. The founder's wording, and the specific wording Manage circles keeps.
assert.deepEqual(discardConfirmationCopy, {
  cancel: "Keep editing",
  confirm: "Leave without saving",
  description: "Your unsaved changes will be lost. Anything already saved will stay.",
  title: "Leave without saving?",
});
assert.equal(leaveWithoutSavingCopy.description, "Only your unsaved changes will be lost. Saved placements will stay.");
assert.equal(exitNeedsConfirmation({ isDirty: false, kind: "editable" }), false, "a clean surface leaves silently");
assert.equal(exitNeedsConfirmation({ isDirty: true, kind: "editable" }), true, "real unsaved work asks first");
assert.equal(exitAfterSaveNeedsConfirmation(true), false, "a successful save leaves without a prompt");
assert.equal(exitAfterSaveNeedsConfirmation(false), true, "a failed save keeps the work protected");

// 2. Viewing controls are skipped by the snapshot reader.
const control = (attributes, closestHit = false) => ({
  closest: () => (closestHit ? {} : null),
  getAttribute: (name) => attributes[name] ?? null,
});
assert.equal(isViewingControl(control({ type: "search" })), true, "a search input is a viewing control");
assert.equal(isViewingControl(control({ role: "searchbox" })), true);
assert.equal(isViewingControl(control({ placeholder: "Search people..." })), true, "a search placeholder marks a viewing control");
assert.equal(isViewingControl(control({ type: "text" }, true)), true, `anything under [${unsavedWorkIgnoreAttribute}="ignore"] is a viewing control`);
assert.equal(isViewingControl(control({ type: "text", placeholder: "Name" })), false, "an ordinary field is work");
assert.equal(isViewingControl(control({ type: "checkbox" })), false);
const reader = slice(surfaces, "export function readSurfaceValues(", "function useSurfaceBaseline(");
assert.ok(reader.includes("if (isViewingControl(field)) {\n      return;") && reader.includes("if (isViewingControl(node as HTMLElement)) {\n      return;"), "the reader skips viewing controls, inputs and pressed buttons alike");
assert.ok(reader.includes("field.name || field.id || field.getAttribute(\"aria-label\") || `${field.tagName}:${index}`"), "fields are keyed by identity before position, so a list that grows does not shift every later field");
assert.ok(!reader.includes("values[`pressed:${index}`]"), "pressed buttons are no longer keyed by position alone");

// 3. formIsDirty is unchanged in spirit: re-selecting the original leaves the form clean.
assert.equal(formIsDirty({ name: "Jim", "pressed:Role": "true" }, { name: "Jim ", "pressed:Role": "true" }), false);
assert.equal(formIsDirty({ name: "" }, { name: "Jim" }), true);
assert.equal(formIsDirty({ name: "Jim" }, { name: "Jim", extra: "x" }), true, "a new field with a value is work");

// 4. Both primitives re-baseline after a successful save that keeps them open.
const page = slice(surfaces, "export function DosWorkflowPage(", "export function DiscardChangesDialog(");
const sheet = slice(surfaces, "export function Sheet(", "export function MobileBottomSheet(");
assert.ok(page.includes("savedRevision?: number | string;") && page.includes("useSurfaceBaseline(bodyRef, true, savedRevision)"), "a task screen can re-baseline after a save");
assert.ok(sheet.includes("savedRevision?: number | string;") && sheet.includes('useSurfaceBaseline(panelRef, kind === "editable", savedRevision)'), "a sheet can re-baseline after a save");
const baseline = slice(surfaces, "function useSurfaceBaseline(", "/* A Sheet declares what it is");
assert.ok(baseline.includes("if (baselineRef.current === null && listeningRef.current) {\n      baselineRef.current = readSurfaceValues(listeningRef.current);"), "the baseline is what the surface showed at the first interaction, so a form that fills its defaults after mount is not dirty");
assert.ok(baseline.includes('for (const type of ["pointerdown", "keydown", "focusin"]) {\n      root.addEventListener(type, captureBaseline, true);'), "pointerdown, keydown and focusin, which fire before a value changes, start the baseline");
assert.ok(baseline.includes("listeningRef.current === root) {\n      return;"), "listeners attach whenever the root first appears, so a portalled sheet is covered too");
assert.ok(baseline.includes("revisionRef.current = savedRevision;\n    baselineRef.current = null;"), "a save drops the baseline: clean until the next interaction, then protected again");
assert.ok(surfaces.includes("return baseline !== null && formIsDirty(baseline, current);"), "an untouched surface is clean");
assert.ok(page.includes("surfaceIsDirty(initialValuesRef.current, readSurfaceValues(bodyRef.current))") && sheet.includes("surfaceIsDirty(initialValuesRef.current, readSurfaceValues(panelRef.current))"), "both primitives read dirtiness through the interaction-gated baseline");
assert.ok(sheet.includes("isDirty ? isDirty() : surfaceIsDirty(initialValuesRef.current, readSurfaceValues(panelRef.current))"), "a sheet may declare its own unsaved work; the snapshot stays the default");
assert.ok(surfaces.includes("if (savedRevision === undefined || revisionRef.current === savedRevision) {"), "an unchanged or absent revision never re-baselines, so every existing surface behaves as before");
assert.ok(sheet.includes("readSurfaceValues(panelRef.current)"), "the snapshot comparison remains the default for editable sheets");

// 5. Add to group: the reproduced defect.
const invite = slice(client, "function GroupInviteSheet({", "function GroupCreateSheet({");
assert.ok(invite.includes("onAddMember: (payload: GroupMemberAddPayload) => Promise<boolean>;"), "the sheet learns whether the addition was saved");
assert.ok(invite.includes("const added = await onAddMember({\n      groupId: group.id,\n      personId: person.id,") && invite.includes("if (added) {\n      setQuery(\"\");\n    }\n  }"), "a saved addition clears the search and allows adding another");
const addExisting = slice(invite, "async function addExistingPerson(", "async function addGuest(");
assert.ok(!addExisting.includes("setGuestName(\"\")") && !addExisting.includes("setGuestEmail(\"\")"), "adding an existing person never erases an unrelated guest draft");
const addGuest = slice(invite, "async function addGuest(", "return (");
assert.ok(addGuest.includes("if (added) {\n      setGuestEmail(\"\");\n      setGuestName(\"\");\n      setGuestPhone(\"\");"), "only a saved guest is cleared; a refused one stays for correction");
assert.ok(invite.includes('data-unsaved="ignore"') && invite.includes('placeholder="Search by name, phone, or relationship"\n              type="search"'), "the member search is a viewing control");
const addMember = slice(client, "  async function addGroupMember(payload: GroupMemberAddPayload): Promise<boolean> {", "  async function saveGroupSettings(");
assert.ok(addMember.includes("router.refresh();\n\n      return true;") && addMember.includes("tone: \"error\" });\n\n      return false;"), "success and refusal are reported truthfully");
assert.ok(addMember.includes("in this preview only. Nothing is saved.") && addMember.includes("return true;"), "the DB-free preview simulates the addition and says so");

// 6. Sheets that stay open after a save re-baseline; those that close do not need to.
const settings = slice(client, "function GroupSettingsSheet({", "function GroupGatheringFormSheet({");
assert.ok(settings.includes("if (await onSave({ ...draft, slug: publicSlug })) {\n      setSavedRevision((current) => current + 1);") && settings.includes("savedRevision={savedRevision}"), "Edit group re-baselines after a successful save");
const importSheet = slice(client, "function PeopleImportSheet({", "function MeetingNotesEditorSheet(");
assert.ok(importSheet.includes("setImportResult(result);\n      setSavedRevision((current) => current + 1);") && importSheet.includes("savedRevision={savedRevision}"), "Import Contacts re-baselines after a completed import");
const subject = slice(client, "function CommitmentSubjectSheet({", "function AccountabilityScheduleSheet(");
assert.ok(subject.includes('data-unsaved="ignore"'), "the accountability subject picker's search is a viewing control");
for (const [name, marker] of [["createGroup", "setIsGroupCreateOpen(false);"], ["saveGatheringOccurrence", "setGatheringFormSheet(null);"], ["handleMeetingNotesSubmit", "closeForm();"], ["handleCommitmentSubmit", "setCommitmentSheet(null);"], ["handleResourceAssignmentCheckInSubmit", "setResourceAssignmentSheet(null);"], ["handleGroupJourneyScheduleSubmit", "setEditingJourneyRow(null);"]]) {
  const start = client.search(new RegExp(`(async )?function ${name}\\(`));
  assert.ok(start >= 0, `${name} exists`);
  const body = client.slice(start, client.indexOf("\n  }\n", start));
  assert.ok(body.includes(marker), `${name} closes its sheet directly on success, so no stale snapshot can warn`);
}
assert.ok(slice(client, "function AddPrayerPartnerSheet({", "function AddPrayerRequestSheet({").includes("onClose();") && slice(client, "function AddPrayerRequestSheet({", "function LogPrayerSheet(").includes("onClose();"), "prayer sheets close directly after a save");

// 7. Manage circles keeps its explicit definition of unsaved work.
const manage = slice(client, "function ManageCirclesWorkflow({", "function ManageCirclesRow(");
assert.ok(manage.includes("isDirty={() => hasPendingChanges}") && manage.includes("discardCopy={leaveWithoutSavingCopy}"), "Manage circles' unsaved work is its pending placements");

console.log("DOS unsaved-work / saved-state tracking (USA-269) regression passed.");
