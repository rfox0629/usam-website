# USA-270: My Record sheets keep typed text

## Defect

Every My Record sheet renders in `MyRecordSheetFrame`. Before this change:

- The backdrop closed the sheet on `mousedown` with no confirmation.
- X and every form's Cancel closed it directly.
- Escape did nothing.

One stray tap beside the drawer, or a Cancel pressed by mistake, discarded a half-written journal entry, prayer, discipleship meeting, prophetic word, life plan, book or chapter note. That broke the rule in `src/lib/dos/unsaved-work.ts`: *an accidental tap must never destroy meaningful user-entered work.*

## Audit: every My Record sheet

| Sheet (`MyRecordSheetState.kind`) | Mode | Class | Backdrop | X / Escape / Cancel |
|---|---|---|---|---|
| `encounter`: Time With God, God's Faithfulness (Journal form) | new, edit | editable | inert | warn only if unsaved |
| `encounter`: logged prayer (Prayer form) | edit | editable | inert | warn only if unsaved |
| `journal` (Journal form; nothing opens it on its own today) | new, edit | editable | inert | warn only if unsaved |
| `prayer` (Prayer form; its launch action has no caller) | new, edit | editable | inert | warn only if unsaved |
| `mentor_relationship` (Person discipling me) | new, edit | editable | inert | warn only if unsaved |
| `mentor_meeting` (Log Discipleship Meeting) | new, edit | editable | inert | warn only if unsaved |
| `prophetic_word` | new, edit | editable | inert | warn only if unsaved |
| `life_plan` (with PDF upload) | edit | editable | inert | warn only if unsaved |
| `external_assessment` (with report upload) | new, edit | editable | inert | warn only if unsaved |
| `assessment` (Take assessment) | new | editable | inert | warn only if unsaved |
| `book` | new, edit | editable | inert | warn only if unsaved |
| `chapter_note` (with image upload) | new, edit | editable | inert | warn only if unsaved |
| every kind above | view | inspection | closes | close |
| `assessment_detail`, `timeline`, `faithfulness`, `weekly_report`, `placeholder` | view | inspection | closes | close |

The drawer has no swipe dismissal on any width.

**Nested flows:**
- Book detail → **+ New** chapter note.
- Person discipling me → **Log Meeting**.
- Assessment detail → **Take / Retake Assessment**.
- Any detail → **Edit**.

Each is a fresh surface, because sheets are keyed by kind, mode and record.

**Inline editor:** the Words of the Year card has no X, Cancel, backdrop or Escape; it closes only after a successful save. There is no exit to guard.

## What changed

- **`useEditableSurface` in `DosSurfaces.tsx`.** It is appended after the existing primitives, so no regression slice moves.
  - It uses exactly the composition `Sheet` uses: the USA-269 interaction-gated baseline, `readSurfaceValues`, `surfaceIsDirty` and the one `useUnsavedWorkGuard`.
  - It adds `markSaved`, the synchronous form of `savedRevision`. My Record forms close themselves in the same tick as a successful save, so the surface must already be clean at that moment.
  - `Sheet` and `DosWorkflowPage` are unchanged.
- **`MyRecordSheetFrame`.**
  - It declares its kind (`myRecordSheetSurfaceKind`) and uses the shared hook.
  - An editable sheet's backdrop is inert. X, Escape and Cancel (each form's `onCancel`) go through the guard, which asks only when real unsaved work exists.
  - A clean sheet leaves silently. Defaults and untouched fields never count, per USA-269.
- **Saves.** The sheet wraps `onSave`.
  - On success (`exitAfterSaveNeedsConfirmation(true) === false`) it calls `markSaved`, so the form's own close is silent. The next interaction starts a new baseline, so edits made after a save are protected again.
  - A failed save changes nothing: the form never closes or remounts, every value stays, and the work stays protected.
- **Preview rehearsal.** In the DB-free preview only, sessionStorage `dos-preview-my-record-save` = `succeed` or `fail` rehearses a save outcome, so the real success and failure handling can run in a browser.
  - Nothing is written.
  - Without the key, the preview still says it is read-only.
  - The preview route is disabled in production.
- **Fixture.** One logged prayer was added to the demo workspace, so the Prayer editor can be reached and exercised.

## Coordination

- Builds on USA-266 (#135) and USA-269 (#137), and adds no parallel guard.
- It is independent of USA-268's Reports design work. That work opens My Record entries from Reports through `mentor_meeting:<id>` (USA-265), and those entries now get this protection too.
