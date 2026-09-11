# USA-265: discipleship meetings, Person record and Reports

## Founder report (2026-09-10)

Ryan logged discipleship meetings with Dirk Bond and Marty Vanderzanden, the two people discipling him. Neither Person record showed them, and the Time Investment report said nothing was logged. He also saw an unexplained white box at the top right of My Record. He found Log Discipleship Meeting cumbersome.

## Audit (production, read-only)

**Nothing was lost.** `dos_user_mentor_meetings` holds four discipleship meetings. Each is linked to its saved relationship (`dos_user_mentor_relationships`) and to the right Person through `field_person_id`.

| With | Date | Duration | Relationship | Person link |
|---|---|---|---|---|
| Marty Vanderzanden | 2026-07-06 | 120 min | active | Marty |
| Dirk Bond | 2026-07-07 | 120 min | active | Dirk |
| Dirk Bond | 2026-07-10 | 70 min | active | Dirk |
| Dirk Bond | 2026-07-21 | 70 min | active | Dirk |

- No ordinary logged meeting (`missionary_tables`) includes either person.
- There is no audit table that could show a hard delete. Every discipleship meeting that exists is accounted for above.
- **Why they did not show.** The Person record and the report read only `missionary_tables`. A discipleship meeting was a separate record type that only My Record read.
- **Marty's Person relationship.** Dirk's structured role is `mentoring_me` ("Discipling me"). Marty's is `not_active`, and his display summary still reads "Mentor · Church · Exploring", while My Record says he disciples Ryan. The recoverable correction would set role `mentoring_me` with the canonical summary "Discipling me · Other · Exploring". That write was not permitted from this session, so the founder sets it on Marty's Person record. The report does not depend on it: a discipleship meeting's direction is recorded by the form.
- **The white box.** It was the "Private" chip USA-220 placed beside the My Record title. It opened a panel listing sharing roles that do not exist ("Person discipling me", "Spouse", "Board Member" and so on). That is the same kind of unbuilt promise the founder removed from Learning in USA-260.

## Founder decisions (2026-09-10)

1. **One Notes field.** It replaces What was discussed, Counsel received and Action steps. Text already saved in those fields is kept, shown under its original label, and saved back when the meeting is edited.
2. **Keep both logs, link later.** Ryan's own log and notes stay his. Later, when the person discipling him logs a meeting in their own DOS and tags him, that record will appear beside his and nothing will merge. That needs verified DOS identity links, which Dirk and Marty do not have yet, so it is a separate follow-up.

## What changed

- **Report.**
  - Discipleship meetings enter as logged meetings with `source: "discipleship"`, the stored minutes, and the recorded direction "being discipled", so they count as *Time invested in me*.
  - The Person is the meeting's stored link, otherwise the saved relationship's. Names are never matched.
  - Notes never enter the report.
  - A meeting with no link is counted in the totals and named in the note.
  - Its contributing record reads "Discipleship meeting · Being discipled" and opens the meeting in My Record.
- **Person record.** Discipleship meetings appear on the timeline and in the Last meeting card when they are the most recent meeting, and they count toward last contact. They open in My Record.
- **Log Discipleship Meeting.**
  - Date and duration use Log Meeting's controls: a Date section and the 15-minute stepper, defaulting to 1h.
  - Who discipled you is one choice listing saved relationships, People marked "They are discipling me", and Someone else, which reveals a name field.
  - When the meeting or the relationship already names the person, that person is shown rather than asked again.
  - The Field Contact field is removed. The server links the Person through the relationship, as it already did.
  - One Notes field, plus the follow-up date.
- **My Record header.** The Private chip and its sharing panel are removed. My Record remains private.

## Verification

- **Behavioural.** `scripts/dos-ministry-report-regression.mjs` §16c is built on Ryan's production shape: three meetings with Dirk, one with Marty (whose Person relationship is not set), one unlinked, and one outside the range. It proves:
  - The Person comes from the stored link or the relationship, never a name.
  - No notes enter the report.
  - Dirk gains 3 meetings and 260 minutes of time invested in him.
  - Marty's meeting counts even though his relationship is not set.
  - The contributing record opens the discipleship meeting.
  - Totals gain 5 meetings, and invested time is unchanged.
  - The unlinked meeting is named in the totals note.
  - The app-data adapter carries the meetings into the report.
- **Wiring.** `scripts/dos-discipleship-meeting-linkage-regression.mjs` guards the Person record, the report's open action and the My Record launch action.
- **Form and header.** `scripts/dos-my-record-regression.mjs` replaces the USA-220 Private-chip assertion and the saved-mentor / Field Contact assertions with the rules above.
