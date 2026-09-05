# USA-230 — Protected Home: current state and deferred redesign

Docs only. Home (mobile) and the Dashboard (desktop) are protected for the life of this project (spec B1, §7). This page records what Home is today and proves that no PR in the stack changed it.

## Current state (unchanged since Phase 0)
- **Mobile Home**: "DOS / Discipleship on the go." header with the profile avatar; the circle target with My 3 / 12 / 70 / 120 counts (buttons "Open My N, X people"); Notifications; the primary **Log Meeting** button with Schedule / Add Person / Accountability; "Today's Alignment" with "Open My Record"; further cards; the gradient ground and its card grammar (B13). Evidence: Phase 0 `mobile-390--01-home.png`; baseline `visual-baseline/darwin-arm64/mobile--home.png`.
- **Desktop Dashboard**: Notifications, Today's Alignment, Top Time Investments, Accountability (Due today / Overdue / 7 days), Assigned Resources, Upcoming, Recent Fruit, Recent Reviews, Table Activity. Evidence: baseline `desktop--dashboard.png`.

## Proof that shared changes did not alter Home
- `mobile--home.png` was recorded once (USA-215, commit `add200b`) and has **never been re-recorded**: every later PR's `npm run test:dos:visual` compared against that byte-identical file and passed (USA-216, 217, 218, 222, 220, 223, 227, 226, 229, 225).
- `desktop--dashboard.png` was re-recorded once (USA-218, commit `8b06a5a`) for demo-fixture clock drift only (the Sep 5 accountability due date crossing from "Next 7 Days" to "Due Today" at the UTC rollover); the pixels that changed are due-date buckets, not styling. Recorded in the canonical spec §8 *[v1.1]* and decision log P-9.
- Token changes that could reach Home were checked at source: `SectionHeading`, `TabPageHeader`, `MoreBackButton`, `CompactButton` (USA-229) are not rendered by `CircleFocusHero`, `CircleTarget`, or `DesktopHomeDashboard`; `AppButton` and `UserProfileAvatar` were deliberately left unchanged because Home renders them.

## Compatibility fixes needed for Home
None. The one approved change visible on Home is the bottom navigation itself (USA-214: opaque bar, single clearance, FAB beneath the nav) — a navigation change under spec §4 / B2, not a Home change; its before/after is in `phase-4/usa-214-navigation-opacity-safe-areas.md`. Home's content above the nav (hero, circle target, cards, gradient ground) is unchanged from Phase 0.

## Deferred
A Home redesign is out of scope for this project. If Ryan chooses to revisit Home, a separate design-decision issue should be created under a new project with its own reference; nothing in the canonical spec presumes one.
