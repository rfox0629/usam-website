# USA-282 — Accountability as a check-in list

Accountability had become hard to manage. Home showed three large count boxes
(Due Today / Overdue / 7 Days), the first three rows, and then a dead end:
"14 more on the people themselves." There was no complete list anywhere, so
the only way to work the backlog was to open people one at a time and hope
you remembered who.

It is now one compact preview on Home and one complete list under People.

## What changed

| Before | After |
|---|---|
| Home: three large count boxes, three rows, "N more on the people themselves" | Home: a compact **Check-ins** section directly below the action buttons — the due count, the few that need attention, and **View all check-ins** |
| The Accountability card sat low on Home, below Meeting Activity | The preview sits immediately under the Home action buttons; there is no second accountability list on Home |
| Rows led with "Growth follow-up due", the generated schedule title | Rows lead with the **person's name**, then the status, then the topic |
| Nowhere to see every follow-up | **People → Check-ins**, one complete list over the People list, with **Needs attention / Upcoming / All** and their counts |
| Home's counts had nothing to agree with | Notification, preview and list counts all come from one eligibility function |
| Two "Growth follow-up due" rows for one person read as duplicates | Each names its phase and Journey: **Growth follow-up · Midpoint · "New Testament in 14 Days"** |

No bottom-navigation tab was added: Check-ins is a control in the People
action row, beside My Record, and opens over the People list the same way My
Record does (USA-272) — so search, circle filter and scroll survive the way
back, and Back uncovers the list rather than leaving the app.

## The eligibility rules, stated once

`src/lib/dos/accountability-checkins.ts` is the only place that decides what a
check-in is. Home's preview, Home's notification and the full list all read
it, so their counts cannot disagree.

Eligible:

- an **active** accountability schedule — a rhythm the leader set, or a growth
  follow-up DOS generated for a Journey assignment;
- an **active** one-time goal (a commitment), **except** the shadow commitment
  a Journey assignment carries. That is the participant's own work, it already
  updates from its existing source, and counting it here would invent a second
  manual confirmation task for the leader.

Buckets, and what the filters mean:

| Bucket | In |
|---|---|
| `overdue` | Needs attention, All |
| `due_today` | Needs attention, All |
| `upcoming` | Upcoming, All |
| `no_due_date` | All only — an item with no date makes no claim on any day, so it is never counted as due |

**All** is every *open* follow-up, not every row ever written. Paused,
cancelled and completed records are history, and history stays on the Person
record; putting it here would bury the list the leader actually has to work.
Against production today that is 26 rows (20 need attention, 4 upcoming, 2
undated) with 7 finished or paused records correctly left out.

Rows exist only for people in the workspace list the caller passes, so
workspace permissions are unchanged. The day key is the server render's
instant (USA-257 §9), so the buckets never differ between the server render
and hydration, and Home and the list compare against the identical day.

## The duplicate audit

The founder's screenshot showed two almost identical "Growth follow-up due"
rows for Nathaniel Bliss and a separate overdue check-in for Nathan Lind.

**They are distinct occurrences, not a query duplication.** A Journey
assignment with a midpoint-and-completion cadence generates two one-time
schedules, each marked in its title (`[resource-assignment:<id>:<kind>]`).
Read-only against production:

- Nathaniel Bliss has exactly two active growth follow-ups, both for the *one*
  assignment `2e71d361…` of `new-testament-14-days` — midpoint due 2026-07-21
  and completion due 2026-07-28.
- No `(assignment, phase)` pair is written more than once anywhere in
  `dos_accountability_schedules`, so `syncResourceAssignmentFollowUpSchedules`'
  per-kind dedupe (first row wins, extras paused) is holding. Nothing was
  merged or deleted.
- Nathan Lind's row is a separate leader rhythm — "Check-In (Drinking)",
  weekly — a different kind of record entirely.

The defect was display: both rows carried the same heading *and* the same
subtitle, so two real occurrences were indistinguishable. The phase now rides
in the **topic**, not at the end of the context line, because a row truncates
from the right — a phase in last position left the two rows reading
identically on a phone, which is exactly the screenshot.

Growth follow-ups and leader-authored accountability do share
`dos_accountability_schedules`. The distinction is preserved rather than
flattened: each appears as its own kind, in its own words. The Person record
still excludes growth follow-ups from its Accountability section, where they
read as Journeys.

## The check-in flow

A row opens **the accountability item itself, for that person** — the Person
record's own detail sheet, not a generic profile. The check-in is one tap
further, beside the recent check-ins a leader wants to read first, and the
sheet's action is already named for what the item records (Check in / Add
person / Add progress).

The row is a single tap target (spec §3). A second control beside it was tried
and removed: it cost about 90px of a 390px screen, which truncated the topic
to "Purity · W…" and "Growth fo…" — so two follow-ups for one person read
identically again.

A growth follow-up's sheets now borrow the row's words. They previously read
"Growth follow-up due — One-time date · Next Sep 19": the generated title, a
sentence about a date already gone by, and identical for the midpoint and the
completion of the same assignment. A leader's rhythm and a one-time goal keep
the copy they have (spec §1 B12).

Saving reuses the existing endpoints and records
(`/api/dos/app/accountability/check-ins`, `/api/dos/app/commitments/updates`).
A recurring rhythm rolls forward with the existing recurrence rules; the
ongoing commitment is never marked complete. A save made inside the list keeps
the reader in the list — one short confirmation line instead of the "Saved"
sheet, whose "Open Person Profile" would take them off the list they are
working — and the completed occurrence leaves Needs attention on its own,
because the rows are derived from the refreshed data.

## Product boundaries

This list is people the leader needs to follow up with. Personal
accountability stays in My Record, which still carries the user's own
commitments.

## Verified

`npm run typecheck`, `npm run test:dos`, `npm run build`, and a new
`npm run test:dos-accountability-check-ins` covering overdue, due today,
upcoming, no due date, recurring, completed, empty, two distinct assignments
for one person, count agreement, lifecycle exclusions and workspace scoping.

Browser behaviour, against the synthetic preview fixture at 390×844:

```
PASS  Home's View all check-ins opens the full list
PASS  It lands on Needs attention
PASS  Browser Back closes the list
PASS  Browser Back stays in the app, on People
PASS  Back does not need a second press to leave the list
PASS  A row opens the exact accountability item
PASS  The item names the person it belongs to
PASS  A failed save reports the failure
PASS  A failed save keeps the entered note
PASS  A failed save keeps the chosen state
PASS  Escape on genuinely unsaved work warns before discarding
PASS  Keep editing keeps the entered note
PASS  The list is still open behind the sheets
PASS  The filter is preserved
PASS  The scroll position is preserved
PASS  An untouched check-in form closes without a Discard warning
```

## Open, for Ryan

1. **The People control carries no count.** USA-264 settled that People shows
   one count — the visible results — so the Household toggle has no competing
   number beside it. A second tally in the same row would reopen that, so the
   due count lives on Home and on this list's own filters. Say the word and it
   goes on the control.
2. **"Needs attention" is used twice.** It is the first filter here (the
   issue names it) and it is also the check-in form's own progress state,
   alongside "Going well". They are on different surfaces but the sheet opens
   over the list, so both can be on screen at once.
3. **An explicit Cancel discards typed work without asking.** `Sheet`'s guard
   covers X, Escape and the inert backdrop, but twelve editable DOS sheets
   wire their Cancel button to the raw `onClose`, which bypasses it. That is
   the existing pattern across Log Meeting, the Person forms and My Record, so
   it is reported rather than half-fixed here — it needs `Sheet` to hand its
   guarded closer to its children.
