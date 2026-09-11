# USA-269 — saved-state tracking across DOS

Founder correction of 2026-09-11. The reproduced case: Jim Lowe was added to Wednesday Men's Group, the success message appeared, the row read "In Group", and closing the sheet still asked "Discard changes?"; discarding changed nothing because the membership was already saved.

## Root causes

1. **The baseline was captured too early.** `DosWorkflowPage` and editable `Sheet`s decided "unsaved work" by comparing the rendered controls with a snapshot taken on the primitive's first commit. A form's own initialisation (a date filled in by an effect, the default duration, hidden fields that follow state) happens in child components afterwards, and a parent's effect never re-runs for a child-only render. So the baseline predated the defaults, and a fresh Log Meeting screen warned on Back before anything was typed.
2. **Viewing controls counted as work.** Search boxes and filter buttons were part of the snapshot, so a search alone raised the warning (Add to group's member search, Log Meeting's participant search, the accountability subject picker).
3. **A successful save did not move the baseline** on surfaces that stay open (Add to group, Edit group, Import Contacts), and Add to group cleared the guest form after adding an existing person, erasing an unrelated draft.

## Behaviour now

- **Work begins with the first interaction.** The baseline is what the surface showed at the user's first `pointerdown`, `keydown`, or `focusin` inside it (all fire before a value changes). An untouched surface is clean; a save that keeps the surface open bumps `savedRevision`, which drops the baseline so the next interaction starts a new one. Closing after a save with no further edit leaves silently; editing again is protected.
- **Viewing controls never count**: `type="search"`, `role="searchbox"`, a "Search…" placeholder, or anything under `data-unsaved="ignore"`. Fields are keyed by name / id / aria-label before position, so a list that grows by a row does not shift later fields into looking changed.
- **Only saved work resets.** Add to group clears the search after a successful addition (so another person can be added) and leaves a typed guest untouched; a saved guest is cleared, a refused one stays. Edit group and Import Contacts re-baseline after a successful save / completed import. Surfaces that close on success (Log/Schedule/Edit Meeting, Add/Edit Person, prayer, accountability, Journey, gatherings, New Group) close directly and never consult the guard.
- **Wording**: **Leave without saving?** / "Your unsaved changes will be lost. Anything already saved will stay." / **Keep editing** · **Leave without saving**. Manage circles keeps "Only your unsaved changes will be lost. Saved placements will stay."
- **Failed saves** keep the entered work: nothing re-baselines unless the save handler reports success.
- The DB-free preview simulates Add to group in memory (labelled "in this preview only. Nothing is saved.") so the flow can be exercised.

## Verification

Typecheck · full DOS aggregate (new `test:dos-unsaved-work`) · build · visual suite. Playwright on the production build of the preview fixture at 390 and 1440, 40 checks: search alone never warns; a successful addition shows success, clears the search, allows another, closes without warning, and persists once; an unsaved guest draft warns with the founder's wording; Keep editing retains it; adding another member does not erase it; Leave without saving drops only the draft and keeps both additions; fresh Log Meeting, Schedule Meeting and Add Person screens never warn on Back; a participant search never warns; a typed note warns; Manage circles unchanged. A signed-in production save was not exercised.
