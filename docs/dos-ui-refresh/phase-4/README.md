# DOS UI System Audit & Visual Refresh — Phase 4: shared UI foundation

Linear: USA-195 (phase) · USA-208 tokens · USA-211 editable surfaces and form primitives · USA-213 controls · USA-214 navigation · USA-215 coverage. One stacked PR per issue (#82 → #83 → #84 → #85 → USA-215), each left unmerged for Ryan per repository merge policy.

| Issue | PR | Evidence | Visible change? |
| --- | --- | --- | --- |
| USA-208 | #82 | [usa-208-tokens.md](./usa-208-tokens.md) | Token values only on USA-168 surfaces (a few RGB units); Home byte-identical |
| USA-211 | #83 | [usa-211-editable-surfaces-and-form-primitives.md](./usa-211-editable-surfaces-and-form-primitives.md) | None (pure move; six screenshots byte-identical) |
| USA-213 | #84 | [usa-213-controls.md](./usa-213-controls.md) | None (pure move; six screenshots byte-identical) |
| USA-214 | #85 | [usa-214-navigation-opacity-safe-areas.md](./usa-214-navigation-opacity-safe-areas.md) | **Yes**: opaque bottom navigation, one nav clearance, FAB beneath the nav |
| USA-215 | — | [usa-215-coverage.md](./usa-215-coverage.md) | None; adds `test:dos` to CI, the primitives gallery, and the visual baseline set |

## What the foundation now provides (spec §2–§4)
- Tokens: text ladder, blue, tints, lines, surfaces, status pairs, type scale, radii, elevation, nav clearance, z ladder — in Tailwind and `text-tokens.ts`, kept in sync by a script.
- Overlays and the unsaved-work guard as shared modules (`overlays/DosSurfaces.tsx`), byte-identical behavior.
- Form grammar (`forms/primitives.tsx`): Field, HelperLine, Stepper, Chip, ToggleRow, StickyPrimary; the legacy form primitives beside them.
- Controls (`ui/`): Button, PageHeader, Eyebrow, PillRail, Segmented, StatusPill, Avatar, IconTile, Row, Card, EmptyState, SearchField; the legacy controls beside them.
- Navigation: opaque, on the ladder, with a single clearance constant.
- Coverage: 39 offline DOS scripts in CI; visual baselines for eight scenes; a gallery of every primitive.

## Gate check (USA-195: "Foundation is tested in isolation and reviewed before broad route adoption")
- Tested in isolation: each primitive has static contract assertions; the gallery renders every primitive and is part of the visual baseline; the pure moves are proven by byte-identical screenshots.
- Reviewed: five PRs are open for Ryan's review. Per the autonomous-execution instruction, Phase 5 (pilot) proceeds on stacked branches; adoption stays screen-by-screen, and every pilot PR records routes changed, preserved behavior, tests, before/after screenshots, limitations, and rollback.

## Deliberately not done in Phase 4
No screen adopted a new primitive; no copy changed; no route, API, data path, flag, or auth touched; `DosDateInput`, `TabHero`, the legacy tab bars, `DesktopPanel`, `DetailCard`, `ProfileSheetFrame`, `MobileFloatingActions`, and `BottomNavigation` stay in the client; `GuidedJourneyUi` untouched (parity-pinned).
