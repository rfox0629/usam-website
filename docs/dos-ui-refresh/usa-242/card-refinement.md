# USA-242 follow-up — simplify the expanded accountability card

2026-09-08, branch `ryan/usa-242-accountability-card-refinement` from `main` `554039e`. Bounded visual refinement of the composer merged in PR #111. **No data-model, persistence, API, category, tracking, date or validation change.**

## What changed
| Founder requirement | Change |
| --- | --- |
| Make **What are they working toward?** the unmistakable primary prompt in canonical DOS blue, not muted grey | The prompt is its own labelled element in `text-dos-blueText` (#1E3FB8) at label weight, replacing the muted `DosFormField` label. Measured on the rendered page: `rgb(30, 63, 184)`. |
| Consistent space between the prompt and its input, matching Tracking and Frequency | The input sits in the same `mt-1.5` wrapper those controls use. Measured gap: 10.5px, identical by construction. |
| Short placeholder | `Enter a goal`, replacing "Disciple 3 people, read John 4-6, pray each morning…". |
| **Need an idea?** compact, to the right of the goal area | It shares the prompt's row, right-aligned, 12.5px bold, never wrapping, with a 44px touch height. Measured: same row, right of the prompt, 44px. |
| Opened: a short dropdown/expandable list of one-tap, category-aware suggestions | A compact bordered panel holds the six focus chips and the suggestions for the chosen focus. It adds no height until opened. |
| Concise Discipleship suggestions | Meet weekly · Read Scripture together · Pray together · Disciple 3 people · Complete a resource — the founder's list. The other five categories were shortened the same way. |
| Selecting a suggestion populates the goal and closes the menu | `chooseSuggestion` fills the goal, applies the suggestion's tracking mode, closes the panel and returns focus to the input. Verified: goal "Disciple 3 people", menu closed, Tracking "Reach a target". |
| Preserve a custom goal | A **Write my own** action closes the panel and focuses the input; typing directly was never blocked, and the paragraph of helper copy is gone. |
| Card order Goal → Tracking → Frequency/Start → actions | Unchanged. |
| One card boundary, aligned inner margins, 44px targets, no baby-blue nesting | The suggestion panel is white with a hairline border and the card radius. It had been given the pill radius token (`rounded-dos-3`, 999px), which rendered as a large ellipse behind the chips; that is corrected to the 18px card radius. |

## What deliberately did not change
Categories, tracking modes, frequency, target kinds, dates, editing, validation, dirty-form protection, field names and the submitted payload are all untouched. Suggestions still only ever *fill* the goal text and preselect a tracking mode; nothing is inferred or auto-saved.

## Evidence (390px)
`screenshots/01-card-closed.png` — the closed card: blue prompt, short placeholder, the action beside the prompt.
`screenshots/02-suggestions-open.png` — the opened panel: focus chips, five one-tap Discipleship suggestions, Write my own.
`screenshots/03-suggestion-chosen.png` — after one tap: goal filled, menu closed, Tracking preconfigured, actions in place.

## Verification
typecheck ✓ · test:dos 46 scripts ✓ (composer regression extended with the prompt colour, spacing, placeholder, action placement, one-tap close, custom path, short suggestions and the panel radius) · build ✓ · smoke ✓ · visual 16/16 identical ✓ · a11y/responsive sweep, no overflow ✓ · Person UI ✓.
