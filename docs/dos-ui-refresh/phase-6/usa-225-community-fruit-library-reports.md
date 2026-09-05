# USA-225 — Batch: Community, Fruit, Library, and Reports

Branch `ryan/usa-225-library-fruit-reports` (stacked on USA-229). Fruit, Reports, Groups (Community) and the Library list already received the canonical header, eyebrows and controls through the shared pass in USA-229 (their scenes are in the visual baseline set). This PR applies the Library-specific direction in spec §5.9 and the approved copy in §6. Fruit intelligence, reporting meaning, filters, permissions, records, downloads and empty/error/loading behavior are unchanged.

## Library (`LibraryResourceShell`, `LibraryResourceBackButton`, `TeachingResourceContent`, the two assign-picker cards)
| Where | Change |
| --- | --- |
| Resource page header | The bordered hero card becomes the §5.9 header: icon tile, **blue eyebrow** with the type, the display title, the description in ink, then the primary action (the "Download PDF" link on token styles; text, icon and `download` attribute kept for the reading-plan script). The 9px uppercase type pill and the shadow are gone; the type colour lives only in the icon tile. |
| Back control | The "← Library" / "← Prayer Resources" pill (§10) becomes the canonical 44px back arrow with `aria-label` "Back to <label>". |
| Teaching content | Section cards, numbered question rows, scripture references and the Gospel-invitation block move to tokens (`r2` hairline cards, `surface-2` question rows, blue-50 number bubbles, ink/ink-2 text). Structure and copy unchanged. The former blue info box for the Gospel invitation is now plain content on white (spec §3: no info boxes). |
| Assign action (approved copy, §6) | The two assign-picker cards' "Assign" button reads **"Assign to someone"** and is the blue primary (the black fill is retired, §10). The **helper line is not added**: the spec approves "Assign to someone + one helper line" but the helper sentence itself is not recorded in the spec, V10 catalog or Phase 2 comparison, so no copy is invented (B11); recorded under PL-9. |
| `scripts/dos-visual-regression.mjs` | New mobile scene `library-resource` (Kitchen Table Gospel). |

Not changed: `GuidedJourneyUi` and the journey/reading-plan overview and step screens (parity-pinned with the public participant portal, B14; PL-9 keeps the step as today); `AssessmentResourceContent`; the Remnant and Prayer Resources collections' content; Library list rows and sections (USA-229); resource routing and downloads.

## Fruit, Reports, Community (Groups)
Covered by USA-229 (PageHeader / eyebrows / compact buttons by rule) and by the Groups rows' own structure; nothing further is changed here so that Fruit intelligence (review → fruit verification), report meaning, filters and downloads stay exactly as production. D6 (Groups V2 promotion) stays open; the default Groups path is what was refreshed. D8 (`app/dos/library-preview/`) stays open.

## Tests
- `npm run typecheck` ✓ · `dos-guided-resources` ✓ · `dos-participant-preview-parity` ✓ (B14).
- **Pre-existing failure, not a regression:** `scripts/new-testament-reading-plan-regression.mjs` fails on "Featured reading plan card should open the in-app guided journey" (it asserts the literal `onOpenGuidedResource(resource)`, which the featured card has not contained since the assignment-scoped open landed in USA-170). Verified against `HEAD` before this change; the script is not in `test:dos` or CI. Left as-is and listed for Phase 7/8.
- `npm run test:dos` ✓ 40/40 · `npm run build` ✓ (36 s).
- `npm run test:dos:visual` before the update: only the **new** `mobile--library-resource` scene lacked a baseline; no existing scene changed (`mobile--library` list byte-identical). After `--update` **16/16 pass**.

## Screenshots
`./screenshots/usa-225/` — mobile resource page top/end and the assign picker with "Assign to someone"; desktop resource page top/end.

## Rollback
Revert the branch commit.
