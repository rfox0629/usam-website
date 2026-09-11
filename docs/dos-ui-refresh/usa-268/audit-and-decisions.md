# USA-268: Reports refinement — audit and decisions

Production audit, read-only, 2026-09-11, workspace `2f68ba2b…` (Ryan). Builds on USA-265 / PR #136, which is merged into this branch rather than duplicated.

## Root causes (verified)

### 1. Exploring relationships lost their time

- **The 2026-09-09 rule treated a relationship as an eligibility gate.** A meeting with no recorded role and no confirmed Person direction went to a third list, "Relationship not set", which neither total counted.
- **In production that list caught ordinary ministry.**
  - `missionary_tables` has no `table_role` column, so no logged meeting records a role.
  - 100 of 123 People store `role_in_my_life = not_active`.
  - Every meeting with one of those people was dropped.
- **"Exploring" is not a relationship value.**
  - `relationship_type` is a display summary: `{type} · {context} · {stage}`.
  - All 123 People have stage `not_started`, which renders "Exploring".
  - The Person record's relationship pill for `not_active` reads **New**.
  - The founder saw "Exploring" because it ends every summary string.
- **Stale summaries made it look like a classification bug.**
  - 31 People have a summary whose relationship word disagrees with their structured role, and every one of them has role `not_active`.
  - Examples: Nathaniel Bliss "Discipling · Church · Exploring", Marty Vanderzanden "Mentor · Church · Exploring".
  - The old row detail quoted the summary. That is why Lyf Nimmo read "Discipling · Outreach · Exploring" beside "Not set".
  - The current People route writes the summary from the structured model (`app/api/dos/app/people/route.ts`). The disagreement is legacy data, not a live write bug.
  - Lyf's structured role was set to `discipling_them` at 13:05 UTC on 2026-09-11, after the screenshot.

### 2. 14 meetings versus 10 invested

For Aug 12 – Sep 10, before Lyf's correction:

- `missionary_tables` held 14 logged meetings, each linked to one Person and each with a duration.
- 10 were with People carrying a direction: Danny ×3, Philip, Tanner, Release Test, Austin, Kyle, Ryan Coggins ×2. They total 1,050 min (17h 30m).
- The other 4 were with New People: Mike Anderson ×2, Lyf Nimmo, Samuel Gaffney. They total 210 min (3h 30m), and all went to "Relationship not set".

### 3. My Record meetings missing from Invested in me

- **The reader was missing.** The report never read `dos_user_mentor_meetings`; USA-265 (#136) added it.
- **Most meetings are outside the founder's range.** The audited meetings are July 6–21: Marty 120 min on Jul 6; Dirk 120, 70 and 70 min on Jul 7, 10 and 21.
- **A new one is inside it.** Dirk has a fifth meeting on Sep 10 (60 min).

### 4. Check-ins

- **What they are.** "Check-ins" are `dos_accountability_check_ins`: accountability check-ins the missionary logs about a person. They are not group attendance.
- **What's in production.** Ryan's workspace has 7, all Jul 13–27; one has a duration.
- **Change.** Removed from the summary and not renamed. They stay in person detail as contributing records and still count toward Last activity.

### 5. "Coming Soon" on the mobile More launcher

- **Where it came from.** #132 (`0e1d6dc`) listed Reports under Coming Soon.
- **Already fixed.** #134 (`c4bb288`, deployed 2026-09-10 22:33 UTC) moved it to Installed. Production runs `3891971`, which shows "Installed".
- **Likely explanation.** The founder's screenshot predates that deploy, or came from a cached app shell.
- **This PR.** Adds a regression guard only.

## Accounting decisions

Every logged meeting counts exactly once, in one of two totals:

1. **Recorded role decides.** A role recorded on the meeting decides the total. A My Record discipleship meeting records "being discipled".
2. **Invested in me.** When no role is recorded and everyone present is discipling the missionary (Person record, else the My Record fallback), the meeting is Invested in me.
3. **Time invested.** Everything else: New, Walking with, Discipling, peer, a mixed group, or no linked person. A mixed group counts once as time invested and says so in the meeting detail. It is never split or counted twice.

- **Meetings** = Time invested meetings + Invested in me meetings, always.
- **Elapsed time** counts a meeting once. Each person present still sees it on their row.
- **Missing duration** is not zero. The meeting counts, adds no minutes, and marks the row Partial.
- **Duplicate loads** of the same record count once. Logged meetings and My Record discipleship meetings are never merged.
- **The display summary** (`relationship_type`) no longer enters the report.

## Before and after, same workspace

| Range | Before | After |
|---|---|---|
| Aug 12 – Sep 10 | 14 meetings · Duration I invested 17h 30m (10) · Relationship not set 3h 30m (4) · Invested in me 0m | **15 meetings** · Time invested **21h** (14) · Invested in me **1h** (Dirk, Sep 10) |
| Jul 1 – Sep 10 | Invested in me 0m (My Record not read) | Invested in me **7h 20m** (5: Marty 2h; Dirk 2h, 1h 10m, 1h 10m, 1h) |
| Jul 22 – Sep 10 | — | Invested in me 1h: July is correctly excluded |

After-figures are computed with this branch's calculation on the audited rows. Regression §17 reproduces them in production shape.

## Remaining data gaps (not fixed in code)

- **Marty Vanderzanden's Person role** is still `not_active`. His discipleship meeting counts as Invested in me because the form records the direction. His row reads New until his role is set on the Person record. That is the USA-265 follow-up.
- **31 legacy People** have summaries that disagree with their structured role. They are harmless to Reports now, but People elsewhere may still show the old string. A recoverable summary regeneration needs founder approval.
- **Duplicate People:** Dirk Bond ×2 (one `not_active`, family, created July), Brooke Fox ×2, Heather Van Ravenhorst ×2. Nothing is merged automatically.
- **No meeting stores a role** in production until `missionary_tables.table_role` exists, so a being-discipled table meeting counts as Invested in me only when everyone present is discipling Ryan.
- **Multiplication** stays "—" for everyone: no verified identity links and no downstream reader.
- **Authenticated production UI** was not verified from this session. Verification used the production build's demo route.
