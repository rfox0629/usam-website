// USA-270 — My Record sheets lose typed text (founder, 2026-09-11).
//
// Every My Record sheet renders in MyRecordSheetFrame, whose backdrop closed
// the sheet on mousedown with no confirmation, so a stray tap destroyed a
// half-written journal entry, prayer, meeting or note. The rules held here:
//   1. A sheet declares what it is. Read-only details may close on the
//      backdrop; every sheet holding a form is editable and its backdrop is
//      inert (there is no swipe dismissal).
//   2. Every deliberate exit -- X, Cancel, Escape -- goes through the one
//      shared guard, which asks only when real unsaved work exists.
//   3. A successful save leaves the sheet clean at once, so the form's own
//      close is silent; a failed save changes nothing, so the text stays and
//      stays protected; the next interaction starts a new baseline.
//   4. The protection is the shared DOS composition, not a parallel guard.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\}/g, "");
const surfacesSource = read("src/components/dos/overlays/DosSurfaces.tsx");
const surfaces = stripComments(surfacesSource);
const client = stripComments(read("app/dos/app/DosMvpAppClient.tsx"));
const slice = (source, start, end) => {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `slice ${start}`);
  return source.slice(a, b);
};

// 4. One shared composition, appended after the primitives the scripts slice by order.
const hook = surfaces.slice(surfaces.indexOf("export function useEditableSurface("));
assert.ok(surfaces.indexOf("export function useEditableSurface(") > surfaces.indexOf("export function DosDetailSection("), "the hook is appended, so no slice of the existing primitives moves");
assert.ok(hook.includes('useSurfaceBaseline(rootRef, kind === "editable", undefined)'), "the interaction-gated baseline from USA-269");
assert.ok(hook.includes('kind === "editable" && surfaceIsDirty(baselineRef.current, readSurfaceValues(rootRef.current))'), "the same rendered-control snapshot and dirty test as Sheet");
assert.ok(hook.includes("useUnsavedWorkGuard({") && hook.includes("onExit: onClose"), "the one guard");
assert.ok(hook.includes("function markSaved() {\n    baselineRef.current = null;\n  }"), "markSaved drops the baseline: clean now, protected again from the next interaction");
const sheet = slice(surfaces, "export function Sheet(", "export function MobileBottomSheet(");
assert.ok(sheet.includes('useSurfaceBaseline(panelRef, kind === "editable", savedRevision)') && sheet.includes("surfaceIsDirty(initialValuesRef.current, readSurfaceValues(panelRef.current))"), "Sheet's own protection is untouched");
assert.ok(!/useUnsavedWorkGuard\(|readSurfaceValues\(|formIsDirty\(/.test(slice(client, "function MyRecordSheetFrame({", "type MyRecordContextualAction")), "the My Record frame composes nothing itself: no parallel guard");

// 1. Classification.
const kinds = slice(client, "function myRecordSheetSurfaceKind(", "function myRecordSheetKey(");
for (const inspection of ["placeholder", "timeline", "faithfulness", "weekly_report", "assessment_detail"]) {
  assert.ok(kinds.includes(`sheet.kind === "${inspection}"`), `${inspection} is read-only`);
}
assert.ok(kinds.includes('if (sheet.kind === "assessment") {\n    return "editable";'), "taking an assessment is editable");
assert.ok(kinds.includes('return sheet.mode === "view" ? "inspection" : "editable";'), "a record's detail is read-only; its new and edit forms are editable");
const unionStart = client.indexOf("type MyRecordSheetState =");
const union = client.slice(unionStart, client.indexOf(";\n\n", unionStart));
const declaredKinds = Array.from(union.matchAll(/kind: "([a-z_]+)"/g)).map((match) => match[1]);
assert.deepEqual(declaredKinds.sort(), ["assessment", "assessment_detail", "book", "chapter_note", "encounter", "external_assessment", "faithfulness", "journal", "life_plan", "mentor_meeting", "mentor_relationship", "placeholder", "prayer", "prophetic_word", "timeline", "weekly_report"].sort(), "a new sheet kind must be classified here before it ships");

// 1 and 2. The frame.
const frame = slice(client, "function MyRecordSheetFrame({", "type MyRecordContextualAction");
assert.ok(frame.includes("const surface = useEditableSurface({ kind, onClose, rootRef: panelRef });"), "the frame uses the shared protection");
assert.ok(frame.includes("onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}"), "an editable sheet's backdrop is inert; a read-only one still closes");
assert.ok(!frame.includes('onMouseDown={onClose}'), "the unconditional backdrop close is gone");
assert.ok(frame.includes('aria-label="Close"') && frame.includes("onClick={requestClose}"), "X goes through the guard");
assert.ok(/event\.key === "Escape"[\s\S]{0,60}requestClose\(\)/.test(frame), "Escape goes through the guard");
assert.ok(frame.includes("{surface.confirmation}"), "the frame renders the shared confirmation");
assert.ok(!/onTouch|swipe/i.test(frame), "there is no swipe dismissal to protect");

// 2 and 3. The mount: Cancel is the guarded close; saves re-baseline only on success.
const mount = slice(client, "<MyRecordSheetFrame key={myRecordSheetKey(myRecordSheet)}", "</MyRecordSheetFrame>");
assert.ok(mount.includes("kind={myRecordSheetSurfaceKind(myRecordSheet)}"), "each sheet is mounted with its kind");
assert.ok(mount.includes("onClose={requestClose}"), "every form's Cancel and post-save close use the guarded close");
assert.ok(mount.includes("if (!exitAfterSaveNeedsConfirmation(saved)) {\n                  markSaved();\n                }"), "only a successful save marks the sheet clean");
const content = slice(client, "function MyRecordSheetContent({", "function MyRecordWorkspace({");
assert.ok(!content.includes("setMyRecordSheet(null)"), "no editor closes itself around the guard");
for (const form of ["MyRecordJournalForm", "MyRecordPrayerForm", "MyRecordMentorRelationshipForm", "MyRecordMentorMeetingForm", "MyRecordPropheticWordForm", "MyRecordLifePlanForm", "MyRecordLearningBookForm", "MyRecordLearningChapterForm", "MyRecordExternalAssessmentForm"]) {
  const uses = content.split(`<${form}`).slice(1);
  assert.ok(uses.length > 0, `${form} is mounted from a sheet`);
  for (const use of uses) {
    assert.ok(use.slice(0, use.indexOf("/>")).includes("onCancel={onClose}"), `${form}'s Cancel is the guarded close`);
  }
}
assert.ok(content.includes("const saved = await onSave(payload, nextTab);\n            if (saved) onClose();"), "Take assessment closes through the guarded close after a successful save");

// 3. Forms keep their text on failure: they close only when the save succeeded, and never remount.
for (const form of ["MyRecordJournalForm", "MyRecordPrayerForm", "MyRecordMentorRelationshipForm", "MyRecordPropheticWordForm", "MyRecordLifePlanForm", "MyRecordLearningBookForm", "MyRecordLearningChapterForm", "MyRecordExternalAssessmentForm"]) {
  const body = slice(client, `function ${form}(`, "\nfunction ");
  assert.ok(/if \(saved\) \{\s*(?:[^}]*\n)?\s*onCancel\??\.?\(\);/.test(body) || /if \(saved\) \{[\s\S]{0,200}onCancel\??\.?\(\)/.test(body), `${form} closes only after a successful save`);
  assert.ok(!/if \(!saved\)[\s\S]{0,80}(onCancel|reset\(\))/.test(body), `${form} never closes or clears on a failed save`);
}
assert.ok(slice(client, "function MyRecordMentorMeetingForm(", "\nfunction ").includes("if (!exitAfterSaveNeedsConfirmation(saved)) {\n        onCancel?.();"), "the discipleship meeting form closes through the shared save contract");

// A different sheet, or a record turned into its editor, is a fresh surface.
const key = slice(client, "function myRecordSheetKey(", "function MyRecordSheetFrame(");
assert.ok(key.includes('return [sheet.kind, mode, record?.id ?? "", item, title].join(":");'), "sheets are keyed by kind, mode and record");

// The preview rehearsal is labelled, preview-only, and writes nothing.
const submit = slice(client, "  async function submitMyRecord(", "  function openGroupDetail(");
const previewBranch = submit.slice(submit.indexOf("if (isPreview) {"), submit.indexOf("setIsSubmitting(true);\n\n    try {"));
assert.ok(previewBranch.includes("previewMyRecordSaveRehearsal()") && !previewBranch.includes("fetch("), "the preview rehearses an outcome without any request");
assert.ok(previewBranch.includes('setErrorMessage("Preview mode is read-only. My Record changes are not saved.");'), "without a rehearsal the preview still says it is read-only");
assert.ok(surfacesSource.includes("a failed save leaves the baseline"), "the save contract is documented at the hook");

console.log("DOS My Record unsaved work (USA-270) regression passed.");
