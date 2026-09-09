# USA-251 / USA-257 — Master Ministry Report: Time Investment, and Home V1

Founder-reviewable prototype. Nothing is merged, deployed, or migrated; no production row was written. Discovery and the metric registry are in [`../usa-249/metric-registry.md`](../usa-249/metric-registry.md).

Branch: `ryan/usa-251-master-ministry-report`, stacked on the reconciled USA-260 language branch (`ryan/usa-260-discipling-language`, PR #129), which itself sits on `main` after PR #127.

## What the report answers

> Where are you spending your time in the field God has given you, and what is happening through that investment?

One calculation, `src/lib/dos/ministry-report.ts`, feeds both the report and Home's Top Time Investments, so the doorway and the destination agree.

| Column | Definition (short) |
| --- | --- |
| Person | Active people in the workspace; archived rows never appear. |
| Direction | From the Person's structured relationship, which is canonical: **Discipling me**, **I am discipling**, **Walking with**, **Peer encouragement**, or **No direction recorded**. An active My Record relationship is only a fallback when the Person carries no direction, and the row then says the Person record must be confirmed (Dirk). |
| Meetings | Logged DOS meetings in the range that link the person. Scheduled, canceled, and connection-log records are not meetings. |
| Logged duration | The duration entered for those meetings (historical start times are a synthetic noon, so this is never clock-in / clock-out). A meeting without a start and end adds nothing and marks the row **Partial**. No estimates. Group meetings credit each person; rows are never summed as "my time". |
| Three lists | **Time I invested** (meetings where I ministered, discipled mutually, or planned, plus check-ins), **Time invested in me** (meetings where I was the one being discipled), and **Direction unresolved** (meetings DOS cannot place). Never ranked together, so Dirk is not ranked as though Ryan were investing in him. |
| How a meeting is placed | A role recorded on the meeting decides. Without one, the confirmed structured Person direction of everyone present decides. A missing, unconfirmed (My Record only), or conflicting direction, or a meeting with people in both directions, is **Direction unresolved**: counted in neither total, completeness *Direction unresolved*, next action *Confirm the direction on the Person record*. Nothing is defaulted; notes are never read. Registry §6. |
| Check-ins | Accountability check-ins in the range: their own column and activity type, never meetings, never contact-time hours, always under *Time I invested*. |
| Last activity | The latest meeting or check-in date, labelled by kind. |
| Completeness | **Recorded**, **Partial**, **No qualifying activity**, or **Direction unresolved**. Missing data is never called inactive. |
| Next action | Provisional deterministic rules (USA-252 still to be approved): add missing time → log an overdue check-in → show the scheduled meeting → schedule (I am discipling) / ask (Discipling me) after 14 quiet days → nothing due. |
| Drill-through | Every row opens into its contributing records; each record opens the meeting or the person. |

Ranges: 30 days by default, with 7 days, 90 days, and a custom from/to.

Below the two lists: relationships without activity in the range (listed, never hidden), where discipleship is multiplying (resolved from the downstream person's own Person relationships through a linked DOS identity, or honestly "not yet resolvable"), what flows upward through a confirmed "Discipling me" relationship (the safe summary with invested and received apart, and the excluded content named), and how the numbers are counted. Recent Fruit and Recent Reviews follow, unchanged from Home.

## The founder scenarios in the preview fixture

The demo route (`/dos/app/preview`) now carries the four named cases, mirroring production where production has data:

- **Dirk Bond → Ryan.** Dirk's Person record is exactly production's: summary "Mentor · Friend · Exploring", structured role Not active. The direction label **Discipling me** comes from the My Record fallback, and the row says the Person record is canonical and must be confirmed. His two meetings with a recorded *being discipled* role sit under **Time invested in me**; his legacy meeting with no recorded role is **Direction unresolved** because only My Record says he is discipling Ryan.
- **Marty Vanderzanden → Ryan.** Person role confirmed as "They are discipling me"; his legacy meeting (no recorded role) is **Time invested in me** by rule 2.
- **Sam Lucas (conflict).** The Person says "I am discipling them"; My Record also lists him as discipling Ryan. The Person wins for the label, the conflict is stated, and his legacy meeting is **Direction unresolved**.
- **Austin Clifford (no direction).** Not active on the Person, nothing in My Record; his legacy meeting is **Direction unresolved**.
- **Mixed meeting.** A legacy breakfast with Tanner (I am discipling) and Marty (Discipling me) is **Direction unresolved** for both.
- **Ryan → Tanner Kent.** Role `discipling_them` (production). Two logged meetings, one check-in, all with a duration → **Recorded**. Multiplication reads "not yet resolvable": it would resolve from Tanner's own Person relationships once he has a linked DOS workspace.
- **Tanner → his disciple.** Not shown, and not claimed, because there is no resolved Person relationship; there is no separate chain model (decision 1).
- **Ryan → Philip John Saco.** Role `discipling_them`. One meeting with a duration and one without → **Partial**, next action "Add the missing meeting duration". Multiplication reads "not yet resolvable" for the same reason.

Rows with real fixture people (George, Naomi, Tim, Brooke) fall out of the same rules and show the Partial and No-activity states.

## Home V1 (USA-257)

Order on both viewports: Notifications → primary actions (mobile) → **Top Time Investments** (last 30 days, logged duration I invested, check-ins excluded; action **View Report**) → **Meeting Activity** (Logged meetings · Logged duration, each meeting once, with time invested in me pointed to Reports · People met with · Check-ins, separate) → **Accountability** (Due Today / Overdue / 7 Days plus the three most important items, each opening the Person) → **Upcoming**.

Removed from Home: Today's Alignment (My Record stays its own destination), Recent Fruit and Recent Reviews (now in Reports), Assigned Resources (until USA-258 proves the status source), and the full check-in / mark-complete / reschedule controls (they remain on the Person and Library screens). The legacy Home-only Log Check-In sheet had no caller left and was removed.

USA-257 officially supersedes spec rule B1 ("Home unchanged") for the approved Home sections (Ryan, 2026-09-09); decision log §F. On the same review Learning's non-functional "future sharing" checkbox and its promise were removed; book notes are private until a real explicit-sharing feature exists.

## Colour language (founder, 2026-09-09)

No yellow, amber, orange, or red anywhere in Reports or on Home. Blue (`dos-blue50` / `dos-blueText` and the blue StatusPill tone) means neutral information, partial or incomplete data, unresolved direction, attention, and next actions. Green (the green StatusPill tone) means only genuinely confirmed status: a Recorded row. White and grey are ordinary surfaces and secondary information; No qualifying activity is the grey pill. Conflict notes (Sam's Person / My Record disagreement, Dirk's unconfirmed direction) are calm blue notices. Home's Accountability counts are dark text on the ordinary surface. Guarded by `scripts/dos-ministry-report-regression.mjs` and `scripts/dos-home-v1-regression.mjs`, which fail on any warning-colour class or hex in these surfaces.

## Screenshots

`screenshots/` — `mobile-390-*` at 390×844 @2x and `desktop-1440-*` at 1440×900: `home`, `report-30-days` (all three lists: Time I invested, Time invested in me, Direction unresolved), `report-philip-expanded` (Partial row with drill-through), `report-dirk-expanded` (Time invested in me, with the Person-canonical conflict note and the pointer to his unresolved legacy meeting), `report-unresolved-austin-expanded` (no direction), `report-unresolved-sam-expanded` (conflicting Person / My Record direction), `report-7-days`, `report-custom`.

## Verification

- `npm run typecheck`
- `npm run test:dos` (the full aggregate, now including `test:dos-ministry-report` and `test:dos-home-v1`)
- `npm run test:dos:visual` — six baselines re-recorded on purpose: mobile home, mobile field, mobile meetings, mobile meetings-timeline, desktop dashboard, desktop primitives-gallery (Home change, the fixture's new people and meetings, and the gallery's "Discipling" label)
- `npm run build`

## Known limitations

- Upward delivery (Dirk seeing Ryan's summary; Ryan seeing Tanner's) is designed and its content boundary is enforced in code, but nothing is delivered across workspaces yet.
- Multiplication is not yet resolvable: the loader does not yet read a downstream person's own Person relationships through their DOS identity, so the report says so and claims nothing.
- Adoption ("is Tanner / Philip using DOS?") cannot be observed: neither has a DOS user or workspace.
- Next-action rules are provisional until USA-252.
- Production start times are a synthetic noon on every logged meeting, which is why the report says "logged duration" and never implies clock-in / clock-out. Production also has no `table_role` column, so every production meeting lands under *Time I invested* until that column exists.
- My Record must be reconciled to the Person relationship (registry §5.2) before the My Record fallback and Dirk's conflict warning can be retired.
- Custom range dates use the browser's local calendar.
- Pre-existing, outside this PR: reloading the DOS app while on any non-Home view (Meetings, More → Reports, and so on) logs a React hydration mismatch (#418) because the persisted-view restore (`readPersistedAppView`, from USA-246, present on `main` before this work) reads browser storage during the first render. React recovers by re-rendering on the client; the page works. It reproduces with the untouched Meetings tab. A follow-up should restore the view in an effect after hydration.
