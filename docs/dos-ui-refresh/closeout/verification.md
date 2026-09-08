# Closeout verification (USA-239 Phases 6–7, final)

Two rounds. **Round 1 (2026-09-07)** ran the whole set on the integration branch `ryan/usa-239-closeout-integration` (`c55e3b4`) before anything merged. **Round 2 (2026-09-08)** re-verified each PR on the `main` of its moment, merged it, and checked production after every merge. Every command is the repository's own.

## Round 2 — per merge
| PR → `main` | Local battery on the rebased head | GitHub required check | Production after merge |
| --- | --- | --- | --- |
| #106 → `8437b34` | (docs) | ✓ | READY; `/`, demo route, `/join` 200; no runtime errors |
| #108 → `d2a5103` | typecheck, test:dos, reading-plan, build, smoke, visual 16/16, a11y ✓ | ✓ | READY, aliased; no runtime errors |
| #105 → `e4672fe` | typecheck, test:dos 41/41, join/preparation/email/release, reading-plan, build, smoke, visual (2 intended scenes re-recorded, then 16/16), a11y, Person UI ✓ | ✓ | READY; demo route 200; `/api/dos/app/meetings` answers 405 to GET (route alive); no runtime errors |
| #111 → `c3c8e17` | typecheck, composer + Log Meeting + Kitchen Table boundary scripts, test:dos, join/preparation/email/release, reading-plan, build, smoke, visual 16/16 identical, a11y, 390px runtime walkthrough (single editor, suggestion fill, per-mode hidden inputs, two drafts, edit, remove, no overflow, sticky footer clear, Person sheet), Person UI ✓ | ✓ | READY; no runtime errors |
| #110 → `63c5b32` | typecheck, test:dos 43/43, dead-code scan, build, smoke, visual 16/16 identical, a11y ✓ | ✓ | READY; site/demo 200 |
| #107 → `0dcf304` | typecheck, test:dos 43/43, join/preparation/email/release, build, smoke, visual 16/16 identical, a11y, Person UI ✓; scan on the cleaned tree: 839 declared, 28 zero-reference (13 pinned retained + 15 second-order candidates retained) | ✓ | READY (`dpl_FCLcZtSUmEvQ9KeBh66bSt19WST9`); no runtime errors; read-only production smoke below ✓ |

## Production smoke after #107 (read-only, 390px, usamissionaries.org)
Home renders Log Meeting · Log Meeting form shows the Kitchen Table Gospel Responses row · Accountability composer opens (goal field, Tracking select) · Meetings → Timeline → meeting detail · Person record · More → Fruit (Reviews section present) · More → Library · More → Prayer · More → My Record — all ✓, no horizontal overflow, no page or console errors (the only console noise is the pre-existing Speed Insights 404 filter). Legacy `/dos/[slug]/meetings` and `/dos/[slug]/people` still serve 200.

## Round 1 — integration branch (2026-09-07)
| Check | Result |
| --- | --- |
| `npm run typecheck` | ✓ |
| `npm run test:dos` (40 scripts then) | ✓ |
| join contract / preparation / join email / join release | ✓ |
| `npm run test:new-testament-reading-plan` | ✓ |
| `npm run build`, `npm run smoke` | ✓ |
| `npm run test:dos:visual` | 14/16 identical; the 2 differences were #105's intended changes |
| a11y / responsive sweep (7 widths × 10 screens) | no overflow, opaque nav |
| `npm run test:usa-168-person-ui` | ✓ |
| Auth / API / schema diff | only `app/api/dos/app/meetings/route.ts` (USAM gate); no migration, RLS, auth or ownership change |

## Pre-existing vs closeout
| Condition | Class |
| --- | --- |
| Visual baselines stale on `main` since #102–#104 and date-drifting | Pre-existing; repaired by #108 |
| Reading-plan script stale needle; not in the aggregate | Pre-existing; repaired by #108 / #110 |
| Meetings API accepted gated flows from any workspace | Pre-existing; closed by #105 |
| Person views Segmented control under 44px | Pre-existing (USA-236); USA-240 |
| Supabase Preview check "Remote migration versions not found" on `main` pushes | Pre-existing, informational, not required; untouched |
| Closeout regressions | **None found** |
