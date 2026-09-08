# USA-244 — Person record polish (segmented rail and empty-section rhythm)

2026-09-08, branch `ryan/usa-244-person-record-polish` from `main` `554039e`. Bounded shared-layout correction, not a Person redesign. **No data, API, permission or behaviour change.**

This is the Person half of the founder addendum carried on USA-244 and USA-246. It is kept separate from the Add/Edit Person form work in PR #116 because they are different surfaces.

## 1. The Overview / Timeline / Details rail
| Requirement | Change |
| --- | --- |
| Outer edges align with the primary content/card margins below it | The rail was capped at `max-w-[350px] mx-auto`, so it floated narrower than everything under it. It now mirrors the content article's own geometry — same max widths, the same two-column split, the same gap — so alignment is derived from the layout rather than fitted to one breakpoint. Measured identical at **320, 390, 430, 768, 1024 and 1440**. |
| Modestly larger, compact native feel | The track keeps its shape; the segments grow from 36px to 44px. |
| Three equal-width segments | Unchanged `flex-1`, verified equal at every width. |
| At least 44px touch targets | The canonical `Segmented` control is now 44px tall. This is the USA-240 regression, fixed in the shared component so every rail that adopts it — including the Meetings Calendar / Timeline / Links rail in USA-246 — is correct by default. |
| Selected state white with restrained elevation | Unchanged. |

## 2. Empty-section rhythm on Overview
Accountability rendered taller than Prayer, Fruit and Feedback for two reasons, both now fixed:

1. Its empty message sat inside the `divide-y` row wrapper and carried an extra `py-1`. It now uses the same bare paragraph as "No prayer requests yet." and "No feedback yet.", and the wrapper collapses to `contents` when there are no rows.
2. The shared `Eyebrow` heading row collapsed from 20px to 14px when a section had no action, so a section with "+ Add" stood 6px taller than one without. The row now has a stable `min-h-5`. An action still sets its own 44px touch target through its negative margins.

Measured on an empty record at 390px, all four sections are now **76px** with a **20px** heading row and identical 12px/12px padding. Sections with real content still take the height their content needs — the regression asserts the *rhythm* (heading row plus section padding), never equal heights.

## 3. Verification
typecheck ✓ · test:dos 46 scripts ✓ · build ✓ · smoke ✓ · a11y/responsive sweep, no overflow ✓ · `test:usa-168-person-ui` ✓, now asserting at 390/768/1440 that the rail has three equal-width segments of at least 44px, that its edges match the content card's, and that the four Overview sections share one heading rhythm and padding.

Four visual baselines re-recorded, all from the 44px segmented control: `mobile--person-record`, `mobile--meetings-timeline`, `mobile--primitives-gallery`, `desktop--primitives-gallery`.

Screenshots: `screenshots/person-polish/person-390.png`, `person-768.png`, `person-1440.png`.
