# USA-233 — Accessibility, responsive, overflow, and visual verification

Method: `scripts/dos-a11y-responsive-verification.mjs` (new in Phase 8) boots the production build and, for 7 widths × 10 screens on the demo route, records horizontal overflow, bottom-nav opacity and backdrop filter, `tablist`/`tab` roles, visible controls under 44px, and console/network errors. The generated table is [a11y-responsive-report.md](./a11y-responsive-report.md). Contrast is verified at the token level; keyboard focus, reduced motion and safe areas are verified by inspection of the primitives, listed below.

## Results
| Check | Result |
| --- | --- |
| Horizontal overflow at 320 / 375 / 390 / 430 / 768 / 1024 / 1440 | **None** on any of the 10 screens (Home, Meetings Calendar, Meetings Timeline, More, Field, Person Record, My Record, Prayer, Library, Log Meeting) |
| Bottom navigation | **Opaque** (alpha 1, no backdrop filter) on every mobile width and screen; not rendered at ≥ 768 |
| Pill rails | `role=tablist` with `aria-selected` tabs on Meetings (1/2), Field (1/5), Person Record (2/8: person views + Field beneath), My Record (1/5), Prayer (1/3) |
| Touch targets on refreshed controls | **0 controls under 44px** on Field, Person Record, My Record and Library at 390. Fixed during this phase after the first sweep flagged them: header chips (Field / Prayer / My Record: 36px visual inside a 44px button), Person "+ Add" / "Request" / "View all" text actions and My Record "View all" (44px boxes), Field row buttons and Person record rows (44px minimum), Person `PDButton` (34 → 44), the three overlay back arrows and the Person Edit control (40 → 44), the task-screen back arrow (40 → 44), the date-picker button (36 → 44) |
| Touch targets still under 44px (legacy, listed for follow-up) | Home's circle-target counts and "Open My Record" / "View Time Report" links (protected, B1); the production calendar's prev/next (36px), View menu (36px) and day cells (42px wide at 320); the Prayer filter control (32px); the desktop hero scripture links (15px tall); desktop people table rows (38px) and the desktop Prayer segmented tabs (36px) — desktop layouts are token-only by rule (B12) |
| Console errors / failed requests | One kind only, on every screen: `GET /_vercel/speed-insights/script.js` → 404 on a local `next start`; the script exists only on Vercel. No application error |
| Contrast | Every readable token ≥ 4.5:1 (spec §2.1: ink `#0B1220`, body `#3D4654`, ink-2 `#5A6473` 7.1:1 on white, eyebrow grey `#6B7686` 5.8:1, blue text `#1E3FB8`); the refreshed screens use no colour below the ladder; pill labels at 12/600 on their tinted backgrounds ≥ 4.5:1 (USA-208 evidence) |
| Keyboard / focus | Every shared primitive uses `focus-visible` rings (2px blue) — Button, PillRail (44px hit around a 36px pill, tab order = visual order, `tabIndex` roving), Row, Card, SearchField, EmptyState actions, the new header chips and back arrows; dialogs are `role=dialog` with a labelled title and sheets trap focus (USA-211 primitives unchanged) |
| Reduced motion | The rails and sheets use `transition-colors` only; no translate-on-settle animation was added in this project |
| Safe areas | Nav bottom = 14px + safe-area (USA-214); `pb-dos-nav-clearance` (safe-area + 100px) on every tabbed scroll container; task screens pad `env(safe-area-inset-bottom)`; the sweep's overflow check covers the 320 width where clipping would first appear |
| Fixed nav / clipped content | The visual baselines for Person Record, Meetings, More and Field end states show content clearing the nav; USA-214's evidence has the before/after |
| Loading / empty / error states | Empty states moved to the shared `EmptyState` on Field and Prayer (copy unchanged); loading (`DosTargetLoader`) and error (inline red instruction) components untouched; offline/retry behavior is the production USA-168 retry model (stabilization script) |

## Visual comparison to the approved references
- Every pilot and batch PR carries before (Phase 0 / earlier PR) and after screenshots at 390×844 @2x (320 for rails) and 1440×900, compared against the V10 reference and the canonical spec in its evidence page; deviations from V10 are the recorded corrections (spec v1.1, decision log §D) or unresolved decisions (spec §9), never silent.
- The visual baseline suite (16 scenes, byte-for-byte) passed on the top of the stack **three consecutive times** after the Phase 8 fixes (see the runner summary in USA-232), proving the captures are deterministic.

## Two suite findings fixed in this phase
| Finding | Fix |
| --- | --- |
| The PillRail's `scrollIntoView` on tab change could also scroll the page container, leaving the Timeline scene captured mid-scroll once in ~20 runs (and a real, if rare, jump for users) | The rail now scrolls itself horizontally only (`PillRail.tsx`); the controls script asserts the new behavior |
| A transient scroll after a tab switch is still possible from the browser | The visual suite resets every scroll container to the top before each capture, so baselines compare layout, not scroll timing |

## Protected UI test
`scripts/usa-168-person-ui-regression.mjs` (Playwright, outside `test:dos`) located the group's back control by the retired "More" pill label; after USA-229 that label belongs only to the bottom-nav tab, so the locator now targets the canonical back arrow (`/^Back/`). The group detail's back control is labelled "Back" (it returns to wherever the group was opened from). The test's intent — a group opened from a Person returns to that Person — is unchanged; result in USA-232.
