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

## The follow-up pass (founder review, 2026-09-23)

Three changes on top of the above, each asked for directly.

### Home is discreet

A Home row now says **the person's name, the due date, and Check in** —
nothing about what the accountability is. Not in the row, not in a tooltip,
and not in the accessibility label either: the label reads
`Check in with George Jenko, due Aug 18`. A leader's phone is read in public
and the subject of someone's accountability is the most private thing DOS
holds, so it is one tap away, on the item, where the leader has chosen to
look at it. The full list under People is unchanged and still names the topic
and what distinguishes it — that list is opened deliberately.

**The cost, stated plainly:** two records for one person on the same date now
read identically on Home — two "George Jenko · Aug 18" rows. That is the
shape of the founder's original screenshot complaint, re-created here on
purpose: with the subject hidden there is nothing left to tell them apart.
They are distinct records, they open different items, and the full list still
distinguishes them. If that turns out to read as a duplicate again, the fix
is a discreet ordinal ("1 of 2") rather than the topic.

### Today and Overdue, with counts, and the rest in place

The three count bubbles are gone from Home for good. In their place: a
**Today** section and an **Overdue** section, each with its own count on its
own heading, so no number is a figure with nowhere to go. Today leads — it is
the smaller list and it is the day's own work, so a long overdue backlog
cannot bury it. The section shows **six** check-ins rather than three, and
**Show N more** opens the remainder in place; **Show fewer** collapses it.
Upcoming is one quiet line under the list, with its count, opening the full
list already on that filter — reachable without taking a row from today.

Accountability sits directly below the Home action buttons, above Top Time
Investments. On desktop that is the first card of the primary column, beside
Top Time Investments rather than above it, which is the same order the mobile
stream reads top to bottom.

### Delete

An accountability record can be deleted outright, from the three-dot menu
beside it on the Person record, from the item a check-in row opens, and from
the reader's own records in My Record.

It asks first, in the app's own dialog, and the question says what goes with
it, because the two kinds do not lose the same things:

- a **rhythm**: the check-ins already recorded keep their rows and stay on the
  person's record (`schedule_id` is `on delete set null`, not `cascade`);
- a **one-time goal**: its own progress updates are part of the goal and go
  with it (`on delete cascade`), while check-ins written beside it stay.

This is deliberately not the lifecycle's "cancelled", which is for a
commitment that was real and ended and stays on the record as history. This is
for a record that should not exist at all. A Journey's generated follow-up and
the shadow commitment an assignment carries are both refused by the API: they
are derived from the assignment, so a delete would be written back on the next
sync. The Journey is where those end.

A failed delete keeps the dialog open with its reason, the same way a failed
save keeps its sheet.

### The People control carries the count

Settled, at the founder's call: **Check-ins 9**. USA-264's one-count rule is
about the people list itself — the visible results, with nothing competing
beside the Household toggle — and this badge counts check-ins, not people. It
is the same figure as Home and the notification, from the same helper.

## Home, rebuilt around people (founder review, second pass)

The previous pass left the same backlog in two places: a Notifications badge
reading "9 due" directly above the nine rows it was counting. And because Home
must not name a topic, a person with three records took three rows that read
identically. Both are gone.

### Notifications: today, one line each

Above the action buttons, keeping its name. Each of today's notifications is
its own line, stating a fact and opening the thing it names:

```
Caleb's birthday
Brooke's anniversary
Meeting with Naomi Lee        10:00 AM
Meeting with Dirk Bond        1:00 PM
Check in with Caleb Rivera
Check in with Tim Tran        3 check-ins
```

A birthday or a scheduled meeting is not an unfinished task and is not written
as one. No line carries a count of work owed -- the "9 due" badge that
duplicated the backlog below is gone, and so is the combined summary row and
agenda that briefly replaced it. A meeting line opens the meeting, an occasion
opens the person, a check-in line opens that person's items. A check-in line
names the person and, when there is more than one, how many check-ins; never
what they are about.

The panel is **today only**. Nothing past due (the Accountability section
carries that) and nothing scheduled later (Upcoming carries that); repeating
them is what made this panel a second copy of the backlog. The day key is the
workspace's display timezone, read from the server render's instant --
previously a UTC key, which moved "due today" a day early for the last few
hours of every evening in Chicago.

Empty, it reads **"No notifications today."**

Reminders and prayer items stay in Upcoming rather than moving here, and a
group's join requests keep their own home on the Groups list and inside the
group -- asserted now in `dos-group-join-request-notification-regression.mjs`,
which used to assert they appeared on Home.

### Accountability, one row per person

Below the action buttons, above Top Time Investments. A row carries **the
person's name, a date, a discreet item count ("3 check-ins"), and Check in** --
never a topic, in the row, a tooltip, or an accessibility label.

Grouping is by **canonical person id**, so two people who share a name stay two
people. Classification takes the worst item, display leads with the nearest
work:

| | |
|---|---|
| A person with any past-due item | **Past due**, dated by their *oldest* outstanding item |
| Otherwise, anything due today | **Due today** |
| Otherwise, something scheduled ahead | **Coming up**, dated by the *earliest* |

Sections read **Due today, Past due, Coming up** -- today first, so an overdue
backlog cannot bury the day's own work. Section counts are **people**; the
count on a row is **check-ins**, with the unit said out loud. Six people show,
then **View all N** opens the full grouped list under People.

Home's "Coming up" keeps the product's existing seven-day window -- the one the
retired card called "7 DAYS". The full list has no window, so anything later is
still reachable there, along with anyone whose only items carry no date at all
(grouped under "No date").

**Notifications and Accountability answer different questions.** Someone with
a past-due rhythm *and* a check-in due today reads as Past due in the section
below and still gets a "Check in with…" line above. In the fixture that is Tim
Tran.

### Opening a person

One item opens that item. Several open the person's own sheet, which lists
every open item **with its topic** -- this surface was opened deliberately --
each one opening its own record, so checking one off leaves the others exactly
where they were. The item's record now also carries **Reschedule** (moves only
the next date, keeping the cadence) and **Pause / Resume** (the rhythm stops
asking and keeps every check-in recorded under it).

Escape used to close both stacked sheets at once, dropping the reader past the
person they meant to return to. `Sheet` and `DosDetailSheet` now share a small
registry so only the surface on top answers the key.

### Missed weeks do not accumulate

Inspected before changing anything: a rhythm holds **one** outstanding date, so
four missed weeks are one reminder, not four catch-up tasks, and the check-in
route already advanced from the date the check-in actually happened rather than
from the missed date. Both are now proven against a database rather than
assumed.

One real gap was found and fixed: the date is the leader's to set, so a
**back-dated** check-in ("we met three weeks ago") rolled the rhythm forward to
another date in the past, and it read as overdue the moment it was answered.
The route now steps the cadence until the next date is genuinely ahead, keeping
both the cadence and the weekday. An on-time check-in is untouched.

One quirk is **reported rather than changed**: a weekly Monday rhythm checked
in on a Tuesday advances to the Monday *after* next -- thirteen days -- because
the existing rule adds a week and then snaps forward to the weekday. That is
this repository's long-standing cadence rule; it is asserted as it stands and
raised below.

A check-in never completes a Journey or its milestone: the assignment's status
and its shadow commitment are the Journey's to change, and the e2e suite proves
it.

## The delete, verified against a database

Source assertions cannot prove a cascade. `scripts/dos-accountability-e2e.mjs`
runs the real `DELETE` handlers against a throwaway Postgres carrying this
repository's migrations, then queries the database directly. Ten checks, all
passing:

```
PASS  An unauthenticated caller cannot delete a schedule
PASS  An unauthenticated caller cannot delete a goal
PASS  A signed-in user without access to the workspace is refused
PASS  A record in another workspace is not found from this one
PASS  A Journey's generated follow-up refuses deletion
PASS  A Journey's shadow commitment refuses deletion
PASS  Deleting a rhythm removes it and keeps the check-ins recorded under it
PASS  Deleting a goal removes it with its own progress, and leaves the check-ins beside it
PASS  Deleting the same record twice reports not found rather than erroring
PASS  Workspace B's rows are untouched by everything above
```

The only substitution is `getDosAuthorization()`, which reads a session cookie
and cannot exist outside a request; the workspace-access check it feeds stays
real and still queries the database. Every row belongs to two throwaway
workspaces in a database created for the run. See that directory's README.

## Visual baselines

Three scenes change, and only three. Recorded on this platform from `main`
and from this branch against an identical fixture, 15 of the 18 scenes are
byte-identical; the three that differ are the ones this work is about:

| Scene | What changed |
|---|---|
| `mobile--home` | Notifications lists today one line at a time; the Accountability section below it sits past the fold in this frame |
| `desktop--dashboard` | the Accountability card with its three bubbles is replaced by the Check-ins panel, moved up beside Top Time Investments |
| `mobile--field` | People's action row gains the Check-ins control and its count |

Side-by-side images are in `visual-review/`. **The committed baselines are
`darwin-arm64` and still need re-recording on a Mac** — they are compared
byte for byte and Chromium rasterises text differently on macOS and Linux, so
a Linux recording cannot stand in for one. On a Mac:

```sh
npm run test:dos:visual -- --update
```

then review that only those three files changed.

## Open, for Ryan

1. **Two Home rows for one person on one date read identically.** The
   discretion rule leaves name and date only. A discreet "1 of 2" would tell
   them apart without naming either; say the word.
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
