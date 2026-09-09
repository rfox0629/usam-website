# USA-251 / USA-257 — Master Ministry Report: Time Investment, and Home V1

Founder-reviewable prototype. Nothing is merged, deployed, or migrated; no production row was written. Discovery and the metric registry are in [`../usa-249/metric-registry.md`](../usa-249/metric-registry.md).

Branch: `ryan/usa-251-master-ministry-report`, stacked on the reconciled USA-260 language branch (`ryan/usa-260-discipling-language`, PR #129), which itself sits on `main` after PR #127.

## What the report answers

> Where are you spending your time in the field God has given you, and what is happening through that investment?

One calculation, `src/lib/dos/ministry-report.ts`, feeds both the report and Home's Top Time Investments, so the doorway and the destination agree.

| Column | Definition (short) |
| --- | --- |
| Person | Active people in the workspace; archived rows never appear. |
| Direction | **Discipling me** (from My Record), **I am discipling**, **Walking with**, **Peer encouragement**, or **No direction recorded** (from the Person's structured role). A conflict between the two records is stated on the row. |
| Meetings | Logged DOS meetings in the range that link the person. Scheduled, canceled, and connection-log records are not meetings. |
| Recorded time | The saved duration of those meetings. A meeting without a start and end adds nothing and marks the row **Partial**. No estimates. Group meetings credit each person; rows are never summed as "your time". |
| Check-ins | Accountability check-ins in the range, counted and timed separately, never as meetings. |
| Last activity | The latest meeting or check-in date, labelled by kind. |
| Completeness | **Recorded**, **Partial**, or **No qualifying activity**. Missing data is never called inactive. |
| Next action | Provisional deterministic rules (USA-252 still to be approved): add missing time → log an overdue check-in → show the scheduled meeting → schedule (I am discipling) / ask (Discipling me) after 14 quiet days → nothing due. |
| Drill-through | Every row opens into its contributing records; each record opens the meeting or the person. |

Ranges: 30 days by default, with 7 days, 90 days, and a custom from/to.

Below the table: relationships without activity in the range (listed, never hidden), where discipleship is multiplying (explicit records only), what flows upward through a confirmed "Discipling me" relationship (the safe summary, with the excluded content named), and how the numbers are counted. Recent Fruit and Recent Reviews follow, unchanged from Home.

## The founder scenarios in the preview fixture

The demo route (`/dos/app/preview`) now carries the four named cases, mirroring production where production has data:

- **Dirk Bond → Ryan.** Dirk's Person record is exactly production's: summary "Mentor · Friend · Exploring", structured role Not active. The direction **Discipling me** comes from the My Record relationship, and the row names the conflict. Two meetings where Ryan was being discipled, and the next one scheduled.
- **Ryan → Tanner Kent.** Role `discipling_them` (production). Two recorded meetings, one check-in, all with time → **Recorded**. An explicit downstream link records that Tanner is discipling one placeholder person.
- **Tanner → his disciple.** Shown only because it is explicitly recorded in the fixture's `discipleshipChain`. Production has no source for this yet (registry decision 1).
- **Ryan → Philip John Saco.** Role `discipling_them`. One meeting with time and one without → **Partial**, next action "Add the missing meeting time". Three explicit downstream links: "Philip John Saco is discipling 3 people".

Rows with real fixture people (George, Naomi, Tim, Brooke) fall out of the same rules and show the Partial and No-activity states.

## Home V1 (USA-257)

Order on both viewports: Notifications → primary actions (mobile) → **Top Time Investments** (last 30 days, recorded meeting time, check-ins excluded; action **View Report**) → **Meeting Activity** (Logged meetings · Recorded time, each meeting once · People met with · Check-ins, separate) → **Accountability** (Due Today / Overdue / 7 Days plus the three most important items, each opening the Person) → **Upcoming**.

Removed from Home: Today's Alignment (My Record stays its own destination), Recent Fruit and Recent Reviews (now in Reports), Assigned Resources (until USA-258 proves the status source), and the full check-in / mark-complete / reschedule controls (they remain on the Person and Library screens). The legacy Home-only Log Check-In sheet had no caller left and was removed.

Spec rule B1 ("Home unchanged") is superseded for Home only; decision log §F.

## Screenshots

`screenshots/` — `mobile-390-*` at 390×844 @2x and `desktop-1440-*` at 1440×900: `home`, `report-30-days`, `report-philip-expanded` (Partial row with drill-through), `report-dirk-expanded` (Discipling me with the conflict note), `report-7-days`, `report-custom`.

## Verification

- `npm run typecheck`
- `npm run test:dos` (the full aggregate, now including `test:dos-ministry-report` and `test:dos-home-v1`)
- `npm run test:dos:visual` — six baselines re-recorded on purpose: mobile home, mobile field, mobile meetings, mobile meetings-timeline, desktop dashboard, desktop primitives-gallery (Home change, the fixture's new people and meetings, and the gallery's "Discipling" label)
- `npm run build`

## Known limitations

- Upward delivery (Dirk seeing Ryan's summary; Ryan seeing Tanner's) is designed and its content boundary is enforced in code, but nothing is delivered across workspaces yet.
- Multiplication has no production source; it is fixture-only until decision 1 in the registry is made.
- Adoption ("is Tanner / Philip using DOS?") cannot be observed: neither has a DOS user or workspace.
- Next-action rules are provisional until USA-252.
- Production start times are a synthetic noon on every logged meeting, so "recorded time" is the entered duration, not a clock interval.
- Custom range dates use the browser's local calendar.
