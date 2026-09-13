# USA-272 — My Record within People

My Record was a More app with five sections of its own invention (Walk,
Growth, Purpose, Faithfulness, plus Overview). It is a record about a person,
so it now lives where the other person records live, and it is built out of
the Person page's own pieces rather than a parallel set.

## What changed

| Before | After |
|---|---|
| More → My Record, plus a desktop sidebar item and an Apps tile | People → **My Record**, first in the action row |
| People action controls: Household, Manage circles | **My Record · Household · Manage circles**, wrapping when needed so every action remains visible |
| "13 people" as a line above the list | a small pale-blue circular badge inside the list container, upper-right, **All only** |
| Overview / Walk / Growth / Purpose / Faithfulness (PillRail) | **Overview / Timeline / My Life** (Segmented, as on a Person) |
| "← More" PageHeader | Person's control row, centred identity, and Segmented rail |
| Opening My Record replaced the tab | It overlays the People list, so People stays selected and Back uncovers the list |

### Overview
Leads with the **Last meeting / Upcoming meeting** pair, the same matched
cards a Person shows. Then one white surface whose sections are separated by
hairlines: **Time with God**, **Current commitments**, **Personal prayer**.

There is deliberately no roster of the people discipling me. A list of names
answered no question the meeting pair above does not already answer, and each
of those people is a Person record in their own right.

"Current commitments" is everything open right now in one place: the journeys
and draft assessments the record already treats as active (spec §5.8, D10)
**plus** my own Accountability commitments, which are the canonical DOS
commitment and were previously visible only on my Person. Accountability is a
workspace capability; when it is off those rows are simply absent.

Every journey action from the retired Growth panel is preserved on these rows —
Continue, Start, Check-in, Pause, Complete, Edit dates — now in Person's
row-with-actions treatment rather than a second card style.

### Timeline
The whole record in one chronological read, **searchable and filtered**
(All / Walk / Meetings / Purpose / Faithfulness / Assessments / Learning),
grouped by month with Person's Timeline row treatment.

### My Life
**One continuous sectioned container**: Purpose (calling statement, Word(s) of
the Year, Life plan), Prophetic Words, God's Faithfulness, Assessments,
Learning, with retained People discipling me management below. Every row opens the same record sheet it always did. Collections expand in place to expose all saved rows.

## Merge reconciliation

PR #142 is the consolidated implementation, retaining its current commitments
and retired-code cleanup. The final review carried over #141's accessible
relationship management and non-scrolling action row. It also fixes prophetic
View all (previously opened only the first word), restores full assessment/book
collections, preserves Reports context in legacy saved sessions, and restores
legacy `view=my_record` URLs. Read-only fields use shared readable tokens and
prose sections rather than one oversized box per field. The shared unsaved-work
guard and all persistence/API paths remain unchanged.

Local final validation: DOS aggregate passed; production build and typecheck
passed. Browser binaries are unavailable in this environment and their CDN
download failed, so final browser validation runs in CI using the existing
Chromium installation step, with screenshots uploaded as workflow artifacts.
Mac visual baselines describe the pre-reconciliation PR, not these final changes;
they must not be presented as a fresh byte-for-byte visual pass.

## Back preserves search, filters and scroll

My Record mounts as an overlay beside `PersonDetailOverlay`, over the People
list rather than in place of it. `openMyRecordTab` touches no list state —
not `peopleQuery`, not `peopleCircleView`, not `showSecondaryFieldPeople`, and
not the app scroll container — which is what makes Back a return rather than a
reset. `dos-my-record-regression.mjs` asserts those four are absent from the
open path, so a future edit cannot quietly reintroduce one.

Verified in the browser against the production build (390×844 and 1440×900):
search "a" and scroll offset 300 were identical before opening My Record and
after Back, and the People nav item stayed selected throughout.

## Unsaved work (USA-270) is untouched

Every sheet still renders in `MyRecordSheetFrame` over the shared
`useEditableSurface` guard. Verified end to end with real keystrokes: typing in
a Time With God sheet and pressing Escape raises "Leave without saving?", and
"Keep editing" returns with the typed sentence intact.
`test:dos-my-record-unsaved-work` passes unchanged.

## Data preservation

No migration, no write, no reseed. The only production access was read-only
SQL. Baseline captured before any change and re-verified after
(workspace `2f68ba2b…`, record `1702fd47…`, the only `dos_user_records` row in
production).

| store | rows | range | total minutes | after |
|---|---|---|---|---|
| dos_user_journal_entries | 15 | 2026-07-06 … 07-26 | 980 | unchanged |
| dos_user_mentor_meetings | 5 | 2026-07-06 … 09-10 | 440 | unchanged |
| dos_user_mentor_relationships | 2 | — | — | unchanged |
| dos_user_prophetic_words | 4 | 2026-07-13 … 07-23 | — | unchanged |
| dos_user_life_plans | 1 | 2026-07-08 | — | unchanged |
| dos_user_prayer_logs / assessments (both) / learning (both) | 0 | — | — | unchanged |

Row-level: all 28 rows still present under the same ids, with identical
content lengths, identical `created_at` **and identical `updated_at`** — the
last of these is the evidence that nothing performed a touch-write. Ownership
(`record_id` / `workspace_id` / `user_id`), associations (mentor meeting →
`relationship_id` → `field_person_id`), and privacy (`life_plan.visibility =
private`, `mentor_rel.status = active`) are unchanged.

**Dirk Bond**: he has no My Record of his own — production contains exactly one
`dos_user_records` row, Ryan's. Dirk exists as Person `61ec2d81…` in Ryan's
workspace ("Discipling me · Other · Exploring") and as the counterpart of
mentor relationship `40dd5e84…` with 4 discipleship meetings; all five records
are unchanged and all four meetings still render, now on Overview's Last
meeting card and in the Timeline. A second Dirk Bond Person exists in an
unrelated workspace (`4db5f875…`) and was not touched.

Reporting totals are unchanged and not double-counted: the Overview and
Timeline read the same `buildMyRecordTimeline` / `record.*` collections the
retired panels read, and `MyRecordReportPanel` (the weekly-report sheet) is
untouched.

### Preservation checks I could not make
- **Old-to-new rendering of empty stores.** Assessments, Learning and
  personal prayer have no production rows, so their new sections were verified
  only against the demo fixture and their empty states, not against real saved
  content.
- **Production rendering itself.** Everything was verified against the local
  production build and the token-gated demo fixture. No production write or
  production session was exercised.
- **The Reports return path, end to end.** USA-268 merged into main while
  this was in flight. My Record's bespoke `backLabel` is replaced by the
  `returnLabel` prop Person and the meeting record already use, Back is
  `reportsReturn ? backToReports() : closeMyRecord()`, and opening My Record
  deliberately from People clears a stale return first (`openRecordFromReports`
  sets it *after* calling `open()`, so that path is unaffected). The wiring is
  pinned by `dos-ministry-report-regression.mjs`, and People → My Record was
  verified to show "Back to people" with no Reports label — but I could not
  reach a Reports → discipleship-meeting Open control in the demo fixture, so
  the "Back to Reports" label and return were not exercised in a browser.
- **`updated_at` semantics.** I am treating an unchanged `updated_at` as proof
  of no write. If any of these tables lacks an update trigger and the
  application sets the column, a write that skipped the column would not show
  here; counts, lengths and ids would still have caught it.

## Deliberate removals

Two Coming Soon placeholders went with the retired panels, following the
USA-260 / USA-265 precedent of not promising features that do not exist:
**Mission Direction**, **Vision Timeline** and **Year in Review**. No recorded
content is affected. **Word(s) of the Year** was real content on the retired
Purpose panel and was carried into My Life's Purpose section rather than
dropped.

Unreachable code removed with the restructure: the four retired panels and 26
helpers they were the only callers of. Five of those helpers
(`MyRecordAssessmentsPanel`, `MyRecordLearningPanel`, `MyRecordPreviewCard`,
`MyRecordPropheticOverviewCard`, `myRecordFutureShareableSections`) were
already unreachable before this change.

## Visual baselines

Re-recorded deliberately. Beyond the People and My Record scenes, four
unrelated baselines changed because the harness now parks the pointer
off-screen before each shot: `groups`, `fruit`, `library` and `log-meeting`
had an accidental `:hover` state baked into them, so an unrelated layout
change one screen earlier could fail a baseline that was otherwise identical.
Two new scenes were added for the Timeline and My Life views.
