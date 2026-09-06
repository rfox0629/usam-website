# USA-222 — Pilot: Person Record (Overview)

Branch `ryan/usa-222-person-record-pilot` (stacked on USA-218). Implements spec §5.6 for `PersonDetailOverlay`'s Overview. The Timeline and Details tabs are protected (§7) and untouched apart from the shared tab rail above them.

## Routes / components changed (`app/dos/app/DosMvpAppClient.tsx`)
| Where | Change |
| --- | --- |
| Header | The centred segmented control becomes the canonical `PillRail` **Overview \| Timeline \| Details** (`role=tablist`, 44px targets, `edgeInset={4}`); internal tab values (`overview`/`history`/`details`) are unchanged so `?person=&tab=` deep links keep working. The relationship line now reads **`Relationship · My N`** (`relationshipSignal` + `currentCircleLabel`, the same pair production's earlier header used); the circle-suggestion dot and "Meeting weekly" cadence line are unchanged. |
| Last / Next meeting cards (`renderMeetingCards`) | Now the shared `Card` primitive with a chevron; grey eyebrow, relative date / short date, topic, one metadata line (duration / time). Same open targets; empty states keep their Log / Schedule buttons. Labels stay "Last meeting" / "Next meeting" (§6 approves no rename; V10's "Upcoming" is recorded under PL-7). |
| **Right now** band | One white surface with a blue `Eyebrow` "Right now", then grey sub-eyebrows separated by hairlines, in spec order: **Journey** (rows with progress; Continue is the one filled action; hidden when empty), **Accountability** (+ Add on the heading → canonical form; rows open the record), **Prayer** (count line "N open · M answered" when counts exist; + Add → new request; rows open this person's prayer), **Fruit** (mobile; no + Add), **Feedback** (Request; the row opens the review; "Follow-up requested" stays plainly visible), **Groups**, then the mobile-only Reminder / Group gathering groups. Journey rows moved out of the Accountability card into their own group. |
| Capped lists | Accountability, Prayer and Fruit show three rows, then **View all N** (in place for Accountability and Fruit; Prayer's opens the existing `PersonPrayerSheet`). Feedback shows the latest review only, as before. |
| Desktop | Two-column structure kept (B12): the aside still holds Reminder / Group gathering and Fruit, now with grey sub-eyebrows. |

Not changed: every handler and sheet (accountability record/check-in, commitment forms, resource assignment, prayer sheet, feedback detail, circle review, add menu, FAB items), `accountabilityTopics` / `conceptPrayerItems` / `conceptJourneys` derivations, Timeline and Details content, the person atmosphere background, deep links, the non-concept legacy branch (`conceptMode` remains `true`).

## Behavior intentionally preserved
Person is canonical (B3); circle shown, never inferred (B4); Circle / relationship / Fruit stay separate dimensions (B5); Fruit has no create action (B6); every record row opens its record; + Add on Accountability is unconditional and opens the one canonical form; Prayer never routes to the resource library; Feedback is requested, not created; empty states keep production wording; no em dashes in person copy.

## Tests
- `npm run typecheck` ✓ · `npm run test:dos` ✓ 40/40 (the USA-168 stabilization checks on the Accountability / Prayer / Feedback / Fruit sections, `dos-commitments-accountability`, and `dos-readability` all pass unchanged; no assertion was weakened).
- `npm run build` ✓ (37 s).
- `npm run test:dos:visual` before the baseline update: **failed on exactly `mobile--person-record`** (the intended change); after `--update` **9/9 pass**. Home, Meetings, Timeline, More, Log Meeting, gallery, and dashboard baselines byte-identical to USA-218.

## Screenshots
Before: Phase 0 `mobile-390--09-person-record.png`, `desktop-1440--09-person-record.png`. After: `./screenshots/usa-222/` — mobile Overview top / mid / end, Timeline and Details (rail only), 320px width; desktop Overview top / mid / end, Timeline, Details.

## Accessibility / overflow
Rail is a `tablist` with 44px targets; card and record rows are buttons with visible chevrons; eyebrows 11px/700 at ≥ 4.5:1; 320px shows no horizontal overflow (the card eyebrows wrap to two lines there).

## Known limitations / unresolved (spec §9 PL-7)
"Follow-up" vs "Feedback" label (kept "Feedback"); "Upcoming" vs "Next meeting" card label (kept production); Upcoming empty state (Schedule button inside the card, as production already does); "set by you" suffix on the relationship line (not approved copy; omitted); a place line on the Upcoming card (no meeting place field is displayed today).

## Rollback
Revert the branch commit; the `mobile--person-record` baseline reverts with it.
