# USA-229 — Batch: shared legacy controls and the remaining DOS surfaces

Branch `ryan/usa-229-shared-controls` (stacked on USA-226). Implements spec §5.12 ("everything else: tokens and §3 components by rule; structure, copy, workflows unchanged") through the one place every remaining More sub-view already renders from: the legacy controls in `src/components/dos/ui/legacy-controls.tsx`. Nothing is redesigned; no missing design is inferred (the remaining screens keep their own structure and copy).

## Inventory first (which surfaces this reaches)
| Control | Used by | Change |
| --- | --- | --- |
| `TabPageHeader` (14 uses) | Groups list and Group detail, Organizations, Settings, Testimony Practice, Missionary Profile, Prayer Team, Support Team, Stewardship, Table Flow, Reports, and two Group headers with trailing actions | Now renders the canonical PageHeader grammar: a 44px control row with the back control on the left (new `back` slot) and any trailing control on the right, then the title in the display size. The eleven back call sites move from `action=` to `back=`; the three trailing-action call sites are unchanged. |
| `MoreBackButton` (13 uses) | the same sub-views | The "← More" pill (spec §10, retired) becomes the canonical 44px back arrow, `aria-label` "Back to More" (a `label` prop for other contexts). |
| `SectionHeading` (30 uses) | Groups, Fruit, Library, Reports, Stewardship, Testimony Practice, Organizations, Settings, My Record panels, Group detail panels | Canonical section eyebrow (blue, 11/700 Inter, the token tracking); the Rajdhani inline font and the 10px size are gone. Not used by Home or the Dashboard (verified; both baselines byte-identical). |
| `CompactButton` | secondary actions across the same screens | Tokens: 36px, `r3`, hairline, 13.5/600 ink; behavior unchanged. |
| `AppButton`, `UserProfileAvatar` | forms, sheets, Home's avatar | **Unchanged.** The controls script pins `AppButton`'s primary gradient and Home renders `UserProfileAvatar`; retiring `tone="black"` (spec §10) is a deliberate follow-up recorded in the Phase 7 manifest. |
| Fruit and Library mobile headers | `activeMoreAppView === "fruit" / "library"` | The back-button row + hero card on mobile becomes the canonical `PageHeader` "Fruit" / "Library" with a mobile-only back; the hero (`TabHero`) stays on desktop. |
| `scripts/dos-visual-regression.mjs` | — | Three new mobile scenes: `groups`, `fruit`, `library`. |

Not changed: any list, table, sheet, form, handler, route, or copy; `GuidedJourneyUi` and `LibraryResourceShell` (parity-pinned, B14; USA-225 records what the Library keeps); desktop layouts (B12); Home and Dashboard (B1).

## Tests
- `npm run typecheck` ✓ · `dos-ui-controls` ✓ (pure-move and `AppButton` assertions intact) · `dos-my-record` ✓ (`SectionHeading title="Time With God"` still present) · `dos-groups` ✓.
- `npm run test:dos` ✓ 40/40 · `npm run build` ✓ (38 s).
- `npm run test:dos:visual` before the update: only the three **new** scenes lacked baselines; **no existing scene changed** — Home, Dashboard, Meetings, Timeline, More, My Record, Person Record, Field, Prayer, Log Meeting and both gallery scenes byte-identical, which is the proof that the shared change reaches none of the protected surfaces. After `--update` **15/15 pass**.

## Screenshots
`./screenshots/usa-229/` — mobile Groups (list, detail, 320), Fruit, Library, Reports, Settings.

## Rollback
Revert the branch commit (the three new baselines are removed with it).
