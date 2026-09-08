# USA-242 — Compact accountability composer (Log Meeting and Person)

Branch `ryan/usa-242-compact-accountability-composer` off `main` d2a5103. Not combined with PR #105. Screenshots in `screenshots/usa-242/` are 390px captures of a local production build of this branch (`/dos/app/preview?demo=dos2026`, pinned demo clock).

## What changed
- **One shared editor** (`AccountabilityFields`, rendered by Log Meeting and by the Person Add / Edit Accountability sheets) now leads with **What are they working toward?** — a custom goal needs no DOS taxonomy. Categories stay in the model as the secondary **Need an idea?** disclosure: closed by default; opening shows six focus chips (Scripture, Prayer, Discipleship, Relationships, Health, Other); a focus shows compact suggestion chips; choosing one fills the goal and pre-sets the tracking method. Nothing is filled without an explicit selection.
- **Tracking** is one compact select — Check in regularly / Reach a target / Complete once — instead of three stacked cards. Only the applicable fields render: Frequency + Start; Target number + Unit + Due date; Due date. Hidden fields are never submitted for another mode, and the submitted `_frequency` is derived from the choice (`one_time` for target and complete-once goals).
- **Log Meeting composer** (`MeetingAccountabilityComposer`): `+ Accountability` opens a single editor inside a bounded card (the tall blue guide line is gone). **Add accountability** collapses the draft to a summary row — title plus "Monthly · Starts Sep 4", "3 people · Due Sep 4" or "Due Sep 4" — with a 44px overflow menu (Edit, Remove). **+ Add another** appears beneath saved drafts only while no editor is open; opening a second editor never leaves the first expanded (a titled editor commits, a blank one is dropped). Re-tapping the "− Accountability" header collapses an editor but never discards saved drafts; drafts persist until the meeting is logged.
- **Data contract unchanged** (USA-235): collapsed drafts submit hidden `meeting_accountability_<index>_title / _frequency / _date` (+ `_target_count` / `_target_kind` only for Reach a target) with contiguous indices, so `persistMeetingAccountability` and `accountabilityRoute` are untouched; the Person sheets post the same `accountability_*` names. No schema, API, permission or scheduling change.
- **Existing records reopen correctly**: the mode is derived from the record (`accountabilityTrackingModeFor`): a rhythm → Check in regularly, a one-time goal with a number → Reach a target, otherwise Complete once; editing keeps `lockType` so a goal never changes record kind.
- **Tokens and targets**: DOS text tokens only (no light-grey instructional text); every control keeps ≥ 44px (`min-h-11`, 44×44 menu button); no horizontal overflow at 320–1440; the sticky Log meeting button stays clear of the editor, menu and drafts (verified at 390×844).

## Runtime evidence (390px, production build)
| Check | Result |
| --- | --- |
| Editor count after `+ Accountability` | 1 |
| Suggestion "Disciple a number of people" | goal filled, Tracking → Reach a target |
| Reach a target hidden inputs | `_frequency=one_time`, `_title`, `_target_count=3`, `_target_kind=people`, `_date` |
| Complete once hidden inputs | `_frequency=one_time`, `_title`, `_date` (no target fields) |
| After Add accountability | 0 editors; `meeting_accountability_0_*` from the summary row |
| Two drafts | 0 editors; indices 0 and 1; summaries "Disciple 3 people · Monthly · Starts Sep 4" and "Read John 4-6 · Due Sep 4" |
| Edit first | one "Done" editor, no "Add accountability" editor |
| Remove second | index 0 only remains; header still active |
| Horizontal overflow | none |
| Person sheet | same editor: goal, Need an idea?, Tracking |

## Screenshots
| File | Shows |
| --- | --- |
| `mobile-390--01-default-accountability-row.png` | Default Log Meeting: one `+ Accountability` row under From this meeting. |
| `mobile-390--02-custom-entry.png` | Editor open; custom goal typed with no taxonomy. |
| `mobile-390--03a-need-an-idea-focus-chips.png`, `03b-suggestions.png` | Need an idea? opened; Discipleship focus → suggestion chips. |
| `mobile-390--04-tracking-options.png` | The Tracking select opened. |
| `mobile-390--05-tracking-reach-a-target.png` | Target number, Unit, Due date. |
| `mobile-390--06-tracking-complete-once.png` | Due date only. |
| `mobile-390--07-tracking-check-in-regularly.png` | Frequency and Start; Add accountability / Cancel. |
| `mobile-390--08-one-collapsed-summary.png` | One collapsed summary row with + Add another. |
| `mobile-390--09a-second-editor-first-collapsed.png`, `09b-two-collapsed.png` | Second editor with the first collapsed; then two compact separated summaries. |
| `mobile-390--10-overflow-menu.png` | Overflow menu: Edit, Remove. |
| `mobile-390--11-editing-first-second-collapsed.png` | Editing the first draft while the second stays collapsed. |
| `mobile-390--12-after-remove.png` | After Remove on the second draft. |
| `mobile-390--13-person-add-accountability-sheet.png` | Person → Add Accountability sheet reusing the editor. |

## Verification
`npm run typecheck` ✓ · `npm run test:dos` ✓ (adds `test:dos-accountability-composer`) · `npm run build` ✓ · `npm run smoke` ✓ · `npm run test:dos:visual` 16/16 identical (the default Log Meeting scene is unchanged) · `scripts/dos-a11y-responsive-verification.mjs` no overflow, opaque nav · `npm run test:usa-168-person-ui` ✓.
