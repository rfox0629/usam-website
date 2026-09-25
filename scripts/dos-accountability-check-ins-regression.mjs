// USA-282 — Accountability as a check-in list.
//
// Behavioural checks of the one eligibility function that Home's preview,
// Home's notification and the full list under People all read, plus source
// checks of the contracts that have no runtime harness here: where the list
// lives (a People view, not a fourth bottom-nav tab), how a row opens the
// accountability item itself, how a save returns to the same list, and the
// unsaved-work classification of the reused check-in sheet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  accountabilityCheckInActionLabel,
  accountabilityCheckInCounts,
  accountabilityCheckInNeedsAttention,
  accountabilityCheckInPeople,
  accountabilityCheckInRows,
  accountabilityPeopleCounts,
  accountabilityPeopleDueToday,
  accountabilityPeopleForFilter,
  accountabilityPeopleForStatus,
  accountabilityPeopleSummaryLabel,
  accountabilityPersonStatusOrder,
  accountabilityProgressActionLabel,
  accountabilityUpcomingWindowDays,
  isAccountabilityCheckInFilter,
} from "../src/lib/dos/accountability-checkins.ts";
import {
  accountabilityOccurrenceOnOrBefore,
  addCalendarMonth,
  nextAccountabilityCheckInDate,
} from "../src/lib/dos/commitments-accountability.ts";
import { resourceAssignmentFollowUpDates, resourceAssignmentFollowUpScheduleTitle } from "../src/lib/dos/resource-assignments.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const today = "2026-09-22";
const dateValue = (value) => (value ? Date.parse(`${value}T00:00:00.000Z`) : 0);
const formatDate = (value) => value ?? "";

function schedule(overrides) {
  return {
    frequency: "weekly",
    id: "s",
    nextCheckIn: today,
    personId: "person-a",
    status: "active",
    title: "Scripture reading",
    ...overrides,
  };
}

function commitment(overrides) {
  return {
    id: "c",
    personId: "person-a",
    status: "active",
    targetCount: null,
    targetDate: null,
    targetKind: null,
    title: "Read John 4-6",
    updates: [],
    ...overrides,
  };
}

const people = new Map([
  ["person-a", "Nathaniel Bliss"],
  ["person-b", "Nathan Lind"],
  /* Two different people who share a name. Grouping is by id, so they must
     never collapse into one row. */
  ["person-c", "Nathan Lind"],
]);

const build = ({ commitments = [], schedules = [] }) => accountabilityCheckInRows({
  commitments,
  dateValue,
  formatDate,
  personNames: people,
  schedules,
  today,
});

// ---------------------------------------------------------------------------
// 1. Every bucket, and what each one is called.
{
  const rows = build({
    commitments: [
      commitment({ id: "c-upcoming", targetDate: "2026-10-01" }),
      commitment({ id: "c-undated", targetDate: null }),
    ],
    schedules: [
      schedule({ id: "s-overdue", nextCheckIn: "2026-09-14" }),
      schedule({ id: "s-today", nextCheckIn: today }),
    ],
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  /* The weekly rhythm was last due the 14th and nothing was recorded, so the
     21st came round too: one reminder, on its latest date, still overdue --
     not one for the 14th and another for the 21st. */
  assert.equal(byId.get("schedule-s-overdue").bucket, "overdue");
  assert.equal(byId.get("schedule-s-overdue").dueDate, "2026-09-21");
  assert.equal(byId.get("schedule-s-overdue").statusLabel, "Overdue · 2026-09-21");
  assert.equal(byId.get("schedule-s-today").bucket, "due_today");
  assert.equal(byId.get("schedule-s-today").statusLabel, "Due today");
  assert.equal(byId.get("commitment-c-upcoming").bucket, "upcoming");
  assert.equal(byId.get("commitment-c-upcoming").statusLabel, "Due 2026-10-01");
  assert.equal(byId.get("commitment-c-undated").bucket, "no_due_date");
  assert.equal(byId.get("commitment-c-undated").statusLabel, "No due date");

  // Overdue leads, then due today, then upcoming, then undated.
  assert.deepEqual(rows.map((row) => row.id), [
    "schedule-s-overdue",
    "schedule-s-today",
    "commitment-c-upcoming",
    "commitment-c-undated",
  ]);

  // An item with no date makes no claim on any day, so it is never "due".
  assert.equal(accountabilityCheckInNeedsAttention(byId.get("commitment-c-undated")), false);
}

// ---------------------------------------------------------------------------
// 2. One set of counts, so Home, the notification and the filters agree.
{
  const rows = build({
    commitments: [commitment({ id: "c-upcoming", targetDate: "2026-10-01" }), commitment({ id: "c-undated" })],
    schedules: [schedule({ id: "s-overdue", nextCheckIn: "2026-09-14" }), schedule({ id: "s-today" })],
  });
  const counts = accountabilityCheckInCounts(rows);

  assert.deepEqual(counts, { all: 4, attention: 2, upcoming: 1 });

  /* The people the filters group are drawn from exactly these rows, so a
     person can never appear in a group their items do not support. */
  const grouped = accountabilityCheckInPeople({ dateValue, formatDate, rows, today, upcomingWindowDays: Number.POSITIVE_INFINITY });
  const peopleCounts = accountabilityPeopleCounts(grouped);

  assert.equal(
    grouped.reduce((total, person) => total + person.items.length, 0),
    counts.all,
    "every eligible row belongs to exactly one person",
  );
  assert.equal(peopleCounts.due_today + peopleCounts.past_due + peopleCounts.coming_up <= peopleCounts.total, true);
  assert.equal(accountabilityPeopleForFilter(grouped, "all").length, peopleCounts.total);
  // Nothing the leader owns can hide from every filter.
  assert.equal(counts.attention + counts.upcoming + rows.filter((row) => row.bucket === "no_due_date").length, counts.all);
}

// ---------------------------------------------------------------------------
// 3. Home lists PEOPLE: one placement each, grouped and ordered.
{
  const rows = build({
    commitments: [commitment({ id: "c-goal", personId: "person-a", targetDate: "2026-09-13" })],
    schedules: [
      /* One person, three records: a missed rhythm, a milestone due today and
         a goal that is also late. The rhythm's date is inside the last week,
         so its next occurrence is still ahead and it reads as late on the
         date it carries. */
      schedule({ id: "s-a-late", personId: "person-a", nextCheckIn: "2026-09-17" }),
      schedule({ id: "s-a-today", personId: "person-a", nextCheckIn: today }),
      /* Someone whose only item is due today. */
      schedule({ id: "s-b-today", personId: "person-b", nextCheckIn: today }),
      /* Someone scheduled inside the window, and the same name as person-b. */
      schedule({ id: "s-c-soon", personId: "person-c", nextCheckIn: "2026-09-25" }),
    ],
  });
  const grouped = accountabilityCheckInPeople({ dateValue, formatDate, rows, today });

  // Several items for one person produce one row, which says how many.
  assert.equal(grouped.length, 3, "three people, however many records they hold");
  const nathaniel = grouped.find((person) => person.personId === "person-a");
  assert.equal(nathaniel.items.length, 3);
  assert.equal(nathaniel.itemCountLabel, "3 check-ins", "the unit is always said");

  // Past due wins the classification, measured from the OLDEST outstanding
  // date -- and the person is still due today for today's agenda.
  assert.equal(nathaniel.status, "past_due");
  assert.equal(nathaniel.statusDate, "2026-09-13", "the oldest outstanding date is the goal's own");
  assert.equal(nathaniel.hasDueToday, true);
  assert.deepEqual(accountabilityPeopleDueToday(grouped).map((person) => person.personId).sort(), ["person-a", "person-b"]);

  // Two people with the same name stay two people.
  assert.equal(grouped.filter((person) => person.personName === "Nathan Lind").length, 2);
  assert.equal(grouped.find((person) => person.personId === "person-c").itemCountLabel, null, "a single item needs no count");

  // Display order: due today, then past due, then coming up.
  assert.deepEqual(grouped.map((person) => person.status), ["due_today", "past_due", "coming_up"]);
  assert.deepEqual(accountabilityPersonStatusOrder, ["due_today", "past_due", "coming_up"]);

  // Counts are of PEOPLE; the summary says both numbers with their units.
  assert.deepEqual(accountabilityPeopleCounts(grouped), { coming_up: 1, due_today: 1, past_due: 1, total: 3 });
  assert.equal(accountabilityPeopleSummaryLabel(grouped), "3 people · 5 check-ins");
  assert.equal(accountabilityPeopleForStatus(grouped, "past_due").length, 1);
  assert.equal(accountabilityPeopleForFilter(grouped, "all").length, 3);
  assert.equal(accountabilityPeopleForFilter(grouped, "due_today")[0].personId, "person-b");
}

// 3b. Home's "coming up" stays inside the existing window; the full list has
//     no window, so nothing scheduled later hides from every surface.
{
  const rows = build({
    schedules: [
      schedule({ id: "s-soon", personId: "person-a", nextCheckIn: "2026-09-26" }),
      schedule({ id: "s-later", personId: "person-b", nextCheckIn: "2026-11-30" }),
    ],
  });
  const home = accountabilityCheckInPeople({ dateValue, formatDate, rows, today });
  const full = accountabilityCheckInPeople({ dateValue, formatDate, rows, today, upcomingWindowDays: Number.POSITIVE_INFINITY });

  assert.equal(accountabilityUpcomingWindowDays, 7);
  assert.deepEqual(home.filter((person) => person.status === "coming_up").map((person) => person.personId), ["person-a"]);
  assert.equal(home.find((person) => person.personId === "person-b").status, null, "outside the window it carries no group on Home");
  assert.deepEqual(full.filter((person) => person.status === "coming_up").map((person) => person.personId), ["person-a", "person-b"]);
}

// ---------------------------------------------------------------------------
// 4. The lifecycle: only OPEN follow-ups. Completed history stays on the
//    Person record rather than flooding All.
{
  const rows = build({
    commitments: [
      commitment({ id: "c-completed", status: "completed", targetDate: "2026-09-01" }),
      commitment({ id: "c-cancelled", status: "cancelled" }),
      commitment({ id: "c-paused", status: "paused" }),
      commitment({ id: "c-active" }),
    ],
    schedules: [schedule({ id: "s-paused", status: "paused" }), schedule({ id: "s-active" })],
  });

  assert.deepEqual(rows.map((row) => row.id).sort(), ["commitment-c-active", "schedule-s-active"]);
  assert.equal(accountabilityCheckInPeople({ dateValue, formatDate, rows, today }).length, 1, "both open records belong to one person");
}

// ---------------------------------------------------------------------------
// 5. Product boundary: a Journey's shadow commitment is not a leader task.
//    The participant's own progress updates it from its existing source.
{
  const rows = build({
    commitments: [
      commitment({ id: "c-journey", linkedToResourceAssignment: true, targetDate: "2026-09-14" }),
      commitment({ id: "c-own", targetDate: "2026-09-14" }),
    ],
  });

  assert.deepEqual(rows.map((row) => row.id), ["commitment-c-own"]);
}

// ---------------------------------------------------------------------------
// 6. Workspace permissions: a follow-up for someone outside the caller's
//    people is neither shown nor counted.
{
  const rows = build({ schedules: [schedule({ id: "s-foreign", personId: "person-elsewhere" }), schedule({ id: "s-mine" })] });

  assert.deepEqual(rows.map((row) => row.id), ["schedule-s-mine"]);
}

// ---------------------------------------------------------------------------
// 7. The duplicate audit. Two "Growth follow-up" rows for one person are the
//    designed shape of one assignment -- a midpoint and a completion -- not a
//    query duplication, so they are distinguished rather than merged.
{
  const followUpDates = resourceAssignmentFollowUpDates({
    dueDate: "2026-09-30",
    followUpCadence: "midpoint_and_completion",
    startDate: "2026-09-02",
    status: "in_progress",
  });

  assert.deepEqual(followUpDates.map((row) => row.kind), ["midpoint", "completion"]);

  const rows = build({
    schedules: followUpDates.map((followUp, index) => schedule({
      followUp: { groupName: "Wednesday Men's Group", kind: followUp.kind, resourceTitle: "Marks of Discipleship" },
      frequency: "one_time",
      id: `s-journey-${index}`,
      nextCheckIn: followUp.date,
      title: "Growth follow-up due",
    })),
  });

  assert.equal(rows.length, 2);
  assert.equal(rows.every((row) => row.kind === "growth_follow_up"), true);
  assert.equal(rows.every((row) => row.topic.startsWith("Growth follow-up")), true);
  /* The phase is in the TOPIC, not trailing the context: a row truncates
     from the right, so a phase at the end left the two rows reading
     identically on a phone -- the founder's screenshot. */
  assert.deepEqual(rows.map((row) => row.topic), ["Growth follow-up · Midpoint", "Growth follow-up · Completion"]);
  assert.equal(new Set(rows.map((row) => row.topic)).size, 2);
  // The resource and group follow, so the row also says which Journey.
  assert.deepEqual(rows.map((row) => row.context), [
    '"Marks of Discipleship" · Wednesday Men\'s Group',
    '"Marks of Discipleship" · Wednesday Men\'s Group',
  ]);
  // Distinguishable within the first 30 characters, where a phone truncates.
  assert.equal(
    new Set(rows.map((row) => `${row.topic} · ${row.context}`.slice(0, 30))).size,
    2,
  );
  // Nothing is merged or dropped: two occurrences, two rows, two sources.
  assert.equal(new Set(rows.map((row) => row.sourceId)).size, 2);

  // The marker never reaches the reader.
  assert.equal(
    rows.some((row) => `${row.topic}${row.context}`.includes("[resource-assignment:")),
    false,
  );
  assert.match(resourceAssignmentFollowUpScheduleTitle("11111111-1111-4111-8111-111111111111", "midpoint"), /^Growth follow-up due \[resource-assignment:/);
}

// ---------------------------------------------------------------------------
// 8. Meaningful distinctions are preserved, not relabelled Accountability.
{
  const rows = build({
    commitments: [commitment({ id: "c-measurable", targetCount: 3, targetDate: "2026-10-05", targetKind: "people" })],
    schedules: [
      schedule({ frequency: "monthly", id: "s-rhythm", nextCheckIn: "2026-10-02" }),
      schedule({ followUp: { groupName: null, kind: "completion", resourceTitle: "Marks of Discipleship" }, frequency: "one_time", id: "s-journey", nextCheckIn: "2026-10-03" }),
    ],
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get("schedule-s-rhythm").kind, "rhythm");
  assert.equal(byId.get("schedule-s-rhythm").context, "Monthly");
  assert.equal(byId.get("schedule-s-journey").kind, "growth_follow_up");
  assert.equal(byId.get("commitment-c-measurable").kind, "one_time_goal");
  // A measurable goal is described by its progress, from the existing presenter.
  assert.equal(byId.get("commitment-c-measurable").context, "0 of 3 confirmed");

  /* The row says how the item records progress, which is what the item's own
     action is then named for. A rhythm and a growth follow-up always check
     in; a goal follows its target. */
  assert.equal(byId.get("schedule-s-rhythm").progressKind, "check_in");
  assert.equal(byId.get("schedule-s-journey").progressKind, "check_in");
  assert.equal(byId.get("commitment-c-measurable").progressKind, "people");
  assert.equal(build({ commitments: [commitment({ id: "c-count", targetCount: 3, targetKind: "count" })] })[0].progressKind, "count");
  assert.equal(build({ commitments: [commitment({ id: "c-plain" })] })[0].progressKind, "check_in");
}

// ---------------------------------------------------------------------------
// 9. Empty list, and the filter guard.
{
  const rows = build({});

  assert.deepEqual(rows, []);
  assert.deepEqual(accountabilityCheckInCounts(rows), { all: 0, attention: 0, upcoming: 0 });
  assert.deepEqual(accountabilityCheckInPeople({ dateValue, formatDate, rows, today }), []);
  assert.deepEqual(accountabilityPeopleCounts([]), { coming_up: 0, due_today: 0, past_due: 0, total: 0 });
  for (const filter of ["due_today", "past_due", "coming_up", "all"]) {
    assert.equal(isAccountabilityCheckInFilter(filter), true);
  }
  assert.equal(isAccountabilityCheckInFilter("attention"), false, "the item-shaped filters are retired");
  assert.equal(isAccountabilityCheckInFilter("everything"), false);
}

// ---------------------------------------------------------------------------
// 9b. USA-282: one current reminder per rhythm. Missed weeks do not
//     accumulate obligations.
{
  /* The founder's example, exactly: a weekly rhythm was due September 3. On
     September 25, with no check-in recorded, there is ONE reminder -- the
     24th -- not separate tasks for the 3rd, 10th, 17th and 24th. */
  const september25 = "2026-09-25";
  const rows = accountabilityCheckInRows({
    commitments: [],
    dateValue,
    formatDate,
    personNames: people,
    schedules: [schedule({ frequency: "weekly", id: "s-missed", nextCheckIn: "2026-09-03" })],
    today: september25,
  });

  assert.equal(rows.length, 1, "one rhythm, one reminder");
  assert.equal(rows[0].dueDate, "2026-09-24");
  assert.equal(rows[0].bucket, "overdue", "and it is still late, because nobody answered it");

  /* It stays Past due until the next occurrence replaces it: on the 24th
     itself it is due today, and on the 1st of October it has moved on. */
  const on24th = accountabilityOccurrenceOnOrBefore("2026-09-03", "weekly", "2026-09-24");
  const onOctober1 = accountabilityOccurrenceOnOrBefore("2026-09-03", "weekly", "2026-10-01");

  assert.equal(on24th, "2026-09-24");
  assert.equal(onOctober1, "2026-10-01");

  /* Nothing is invented and nothing is erased: the derivation is read-only,
     and the row still points at the same stored schedule. */
  assert.equal(rows[0].sourceId, "s-missed");

  // Every other cadence catches up the same way, and never past today.
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-09-01", "every_two_weeks", september25), "2026-09-15");
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-06-10", "monthly", september25), "2026-09-10");
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-09-28", "weekly", september25), "2026-09-28", "a future date is already current");

  /* A one-time reminder is outstanding until it is checked in or stopped.
     It never rolls forward -- there is no cadence to roll. */
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-09-03", "one_time", september25), "2026-09-03");
  const journey = accountabilityCheckInRows({
    commitments: [commitment({ id: "c-old", targetDate: "2026-06-01" })],
    dateValue,
    formatDate,
    personNames: people,
    schedules: [schedule({ followUp: { groupName: null, kind: "midpoint", resourceTitle: "Marks of Discipleship" }, frequency: "one_time", id: "s-milestone", nextCheckIn: "2026-06-15" })],
    today: september25,
  });

  assert.deepEqual(journey.map((row) => row.dueDate), ["2026-06-01", "2026-06-15"], "a goal and a milestone keep their own dates");

  /* Genuinely separate topics stay separate: two rhythms for one person are
     two reminders, merged by nothing. */
  const twoTopics = accountabilityCheckInRows({
    commitments: [],
    dateValue,
    formatDate,
    personNames: people,
    schedules: [
      schedule({ id: "s-scripture", nextCheckIn: "2026-09-03", title: "Scripture reading" }),
      schedule({ id: "s-marriage", nextCheckIn: "2026-09-05", title: "Marriage" }),
    ],
    today: september25,
  });

  assert.equal(twoTopics.length, 2);
  assert.deepEqual(twoTopics.map((row) => row.topic).sort(), ["Marriage", "Scripture reading"]);
  assert.equal(new Set(twoTopics.map((row) => row.dueDate)).size, 2, "each keeps its own rhythm");
  assert.equal(
    accountabilityCheckInPeople({ dateValue, formatDate, rows: twoTopics, today: september25 }).length,
    1,
    "and Home still groups them under one person",
  );
}

// 9c. Month ends, and the late check-in that follows.
{
  /* A monthly rhythm anchored on the 31st: February has no 31st, so the last
     day of the month is the honest answer -- and the 31st returns the next
     month that has one, rather than drifting earlier for good. */
  assert.equal(nextAccountabilityCheckInDate("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(nextAccountabilityCheckInDate("2026-02-28", "monthly"), "2026-03-28");
  assert.equal(addCalendarMonth(new Date("2026-01-31T12:00:00.000Z"), 1).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addCalendarMonth(new Date("2026-01-31T12:00:00.000Z"), 2).toISOString().slice(0, 10), "2026-03-31");
  assert.equal(addCalendarMonth(new Date("2025-02-28T12:00:00.000Z"), 12).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-01-31", "monthly", "2026-04-15"), "2026-03-31");

  /* Catching up steps from the ORIGINAL date, so a monthly rhythm read four
     months late still lands on the 31st, not on the 28th of every month
     after February. */
  assert.equal(accountabilityOccurrenceOnOrBefore("2026-01-31", "monthly", "2026-05-31"), "2026-05-31");

  /* The next reminder is counted from the date the check-in actually
     happened, and from nothing else.

     A Thursday rhythm (day_of_week 4) answered on a Friday is next due on
     the FRIDAY: weekly means seven days later. The rhythm follows the
     conversation rather than being dragged back to the day it was first set
     up on -- which used to move the date by up to three days in either
     direction, and by a whole week before that. */
  const thursdayRhythm = 4;

  assert.equal(nextAccountabilityCheckInDate("2026-09-25", "weekly"), "2026-10-02", "Friday + 7 days = Friday");
  assert.equal(new Date("2026-09-25T00:00:00.000Z").getUTCDay(), 5, "the check-in really was a Friday");
  assert.equal(new Date("2026-10-02T00:00:00.000Z").getUTCDay(), 5, "and so is the next reminder");
  /* The stored weekday cannot change the answer: the argument is gone, and
     passing one has no effect on a function that no longer reads it. */
  assert.equal(
    nextAccountabilityCheckInDate("2026-09-25", "weekly", thursdayRhythm),
    nextAccountabilityCheckInDate("2026-09-25", "weekly"),
    "the rhythm's original weekday has no say",
  );
  assert.equal(nextAccountabilityCheckInDate.length, 2, "and the function does not even take it");

  // Answered early, it is seven days from the day it was answered.
  assert.equal(nextAccountabilityCheckInDate("2026-09-23", "weekly"), "2026-09-30");
  // Answered on its own day, it simply comes round again a week later.
  assert.equal(nextAccountabilityCheckInDate("2026-10-01", "weekly"), "2026-10-08");
  // Every two weeks is fourteen days from the check-in, on that same weekday.
  assert.equal(nextAccountabilityCheckInDate("2026-09-19", "every_two_weeks"), "2026-10-03");
  assert.equal(nextAccountabilityCheckInDate("2026-09-25", "every_two_weeks"), "2026-10-09");

  /* Every cadence, stated plainly: 7, 14, and one calendar month. */
  for (const [current, expected] of [["2026-03-01", "2026-03-08"], ["2026-12-28", "2027-01-04"]]) {
    assert.equal(nextAccountabilityCheckInDate(current, "weekly"), expected);
  }
  for (const [current, expected] of [["2026-03-01", "2026-03-15"], ["2026-12-28", "2027-01-11"]]) {
    assert.equal(nextAccountabilityCheckInDate(current, "every_two_weeks"), expected);
  }
  for (const [current, expected] of [["2026-03-15", "2026-04-15"], ["2026-12-31", "2027-01-31"], ["2026-08-31", "2026-09-30"]]) {
    assert.equal(nextAccountabilityCheckInDate(current, "monthly"), expected);
  }
  assert.equal(nextAccountabilityCheckInDate("2026-09-25", "weekly"), "2026-10-02");
  assert.equal(nextAccountabilityCheckInDate("2026-09-25", "every_two_weeks"), "2026-10-09");
  assert.equal(nextAccountabilityCheckInDate("2026-09-25", "one_time"), null, "a one-time reminder has no next one");
}

// 9d. A stopped reminder leaves the lists; the record and its history do not.
{
  const rows = accountabilityCheckInRows({
    commitments: [commitment({ id: "c-stopped", status: "cancelled" }), commitment({ id: "c-open" })],
    dateValue,
    formatDate,
    personNames: people,
    schedules: [schedule({ id: "s-stopped", status: "stopped" }), schedule({ id: "s-open" })],
    today,
  });

  assert.deepEqual(rows.map((row) => row.id).sort(), ["commitment-c-open", "schedule-s-open"]);
  assert.equal(
    accountabilityCheckInRows({
      commitments: [],
      dateValue,
      formatDate,
      personNames: people,
      schedules: [schedule({ id: "s-only", status: "stopped" })],
      today,
    }).length,
    0,
    "stopping the last one leaves nothing due, and nothing deleted",
  );
}

// 9e. Today's count is today's, and the action is named for what it records.
{
  /* The founder's screenshot: one check-in due today and two overdue read as
     "3 check-ins" on a line about today. Today's notification counts today. */
  const rows = build({
    schedules: [
      schedule({ id: "s-today", nextCheckIn: today }),
      schedule({ frequency: "one_time", id: "s-late-1", nextCheckIn: "2026-09-15" }),
      schedule({ frequency: "one_time", id: "s-late-2", nextCheckIn: "2026-09-18" }),
    ],
  });
  const [person] = accountabilityCheckInPeople({ dateValue, formatDate, rows, today });

  assert.equal(person.items.length, 3, "the Accountability list still shows all three");
  assert.equal(person.itemCountLabel, "3 check-ins");
  assert.equal(person.dueTodayCount, 1, "but only one of them is today's");
  assert.equal(person.dueTodayCountLabel, null, "and one check-in needs no count at all");
  assert.equal(
    accountabilityCheckInPeople({
      dateValue,
      formatDate,
      rows: build({ schedules: [schedule({ id: "s-a", nextCheckIn: today }), schedule({ id: "s-b", nextCheckIn: today })] }),
      today,
    })[0].dueTodayCountLabel,
    "2 check-ins",
    "two due today say so",
  );

  /* Every item's action is Check in, whatever it records -- the same word on
     the row and inside the item, so two rows in one list never do two
     different things under one name. */
  assert.equal(accountabilityCheckInActionLabel, "Check in");
  assert.equal(typeof accountabilityCheckInActionLabel, "string", "there is no per-kind variant to drift");

  /* The specialised actions are named for exactly what they do and belong
     INSIDE the flow Check in opens. An item that only records a
     conversation offers neither. */
  assert.equal(accountabilityProgressActionLabel("people"), "Add person");
  assert.equal(accountabilityProgressActionLabel("count"), "Add progress");
  assert.equal(accountabilityProgressActionLabel("check_in"), null);
}

// ---------------------------------------------------------------------------
// 10. Source contracts.
const client = stripComments(read("app/dos/app/DosMvpAppClient.tsx"));
const lib = read("src/lib/dos/accountability-checkins.ts");

// The list is a People view, opened over the list, and never a fourth tab.
assert.match(client, /const \[isCheckInsOpen, setIsCheckInsOpen\] = useState\(false\);/);
assert.match(client, /activeTab === "people" && isCheckInsOpen && !isMyRecordOpen && !selectedPerson \? \(\s*<CheckInsWorkspace/);
{
  // Exactly the three production tabs plus More (spec §1 B2): no new tab.
  const tabs = client.slice(client.indexOf("const mobileTabs:"), client.indexOf("const usamWalkthroughDismissedStorageKey"));

  assert.deepEqual(tabs.match(/value: "(\w+)"/g), ['value: "home"', 'value: "people"', 'value: "meetings"', 'value: "more"']);
  assert.equal(tabs.includes("Check-ins"), false, "Check-ins must not become a bottom-navigation tab.");
  assert.match(client, /type ActiveTab = "home" \| "meetings" \| "more" \| "people";/, "The tab union gains no member.");
}
assert.match(client, /onClick=\{\(\) => openCheckIns\(\)\}/, "People's action row reaches the list.");

// One way in, one history entry, so Back uncovers the People list.
assert.match(client, /dosReturnTo: "check-ins"/);
assert.match(client, /if \(checkInsOpenRef\.current && state\?\.dosReturnTo !== "check-ins"\) \{/);
assert.match(client, /if \(alreadyOpen\) \{/, "Re-entering the list must not stack a second history entry.");

// A row opens the accountability item for that person, not their profile.
assert.match(client, /function openCheckInRow\(row: AccountabilityCheckInRow\) \{/);
assert.match(client, /openPersonAccountabilityRecord\(row\.personId, null, commitment\)/);
assert.match(client, /openPersonAccountabilityRecord\(row\.personId, schedule, null\)/);

// The check-in reuses the existing form, records and recurrence.
/* The item offers the check-in, named for what it records, so the row needs
   no second control competing with the topic for width. */
assert.match(client, /<PersonAccountabilityDetailSheet/);
/* The item's own sheets say WHICH growth follow-up it is. Without this they
   both read "Growth follow-up due -- One-time date · Next Sep 19", so the two
   rows the list distinguishes became identical the moment either was opened. */
assert.match(client, /function journeyFollowUpSheetCopy\(/);
assert.match(client, /meta=\{journeyCopy\?\.meta \?\?/);
assert.match(client, /title=\{journeyCopy\?\.title \?\?/);
assert.equal((client.match(/journeyFollowUpSheetCopy\(checkInRows,/g) ?? []).length, 2, "Both the detail sheet and the check-in sheet use it.");
assert.match(client, /if \(!schedule \|\| !parseResourceAssignmentFollowUpScheduleTitle\(schedule\.title\)\) \{\s*return null;/, "A leader's own rhythm keeps the copy it has (spec §1 B12).");
assert.match(client, /onCheckIn=\{\(\) => openPersonAccountabilityCheckIn\(record\.personId, schedule, commitment\)\}/, "The item's Check in opens the existing form for that person and item.");
{
  const row = client.slice(client.indexOf("function AccountabilityPersonListRow("), client.indexOf("function CheckInsWorkspace("));

  assert.equal((row.match(/<button/g) ?? []).length, 1, "The whole row is one tap target (spec §3).");
  assert.match(row, /min-h-\[60px\]/, "The row keeps a comfortable tap target.");
  assert.match(row, /<ChevronRight/, "The row shows it opens something.");
  assert.equal(/row\.topic|row\.context/.test(row), false, "The list's row is a person, and says nothing about the subject.");
}
assert.match(client, /<PersonAccountabilityCheckInSheet/);
assert.match(read("app/api/dos/app/accountability/check-ins/route.ts"), /nextAccountabilityCheckInDate\(/, "A recurring rhythm rolls forward with the existing recurrence rules.");

// A save returns to the same list and filter rather than a second screen.
assert.match(client, /function announceAccountabilitySaved\(personId: string \| null, text: string\) \{\s*if \(isCheckInsOpen\) \{\s*setCheckInSaveConfirmation\(text\);/);
assert.equal(client.includes('text: "Check-in saved.", tone: "success"'), false, "The check-in save notice goes through the shared announcement.");
assert.match(client, /checkIns: activeTab === "people" && isCheckInsOpen \? \{ filter: checkInsFilter \} : null,/, "The filter survives a save's router.refresh().");
assert.match(client, /isAccountabilityCheckInFilter\(parsed\.checkIns\.filter\)/, "A restored filter is re-validated.");

// The reused sheet keeps the shared unsaved-work guard, and a successful save
// unmounts it, so there is no Discard warning after saving (USA-269).
{
  const sheet = client.slice(client.indexOf("function PersonAccountabilityCheckInSheet("), client.indexOf("function PersonAccountabilityProgressSheet("));

  assert.match(sheet, /<Sheet kind="editable"/, "Entered work is protected by the shared guard.");
  assert.equal(sheet.includes("onSubmit={onSubmit}"), true, "The form submits through the app's handler, which keeps the text on a failure.");
}
assert.match(client, /if \(result\?\.checkIn\) \{\s*setCommitmentSheet\(null\);/, "A successful save closes the sheet, so no Discard warning can follow it.");

// Home's preview and the full list read the same module; nothing recomputes
// eligibility on its own.
assert.equal((client.match(/accountabilityCheckInRows\(\{/g) ?? []).length, 1, "Eligibility is computed in exactly one place.");
/* Every accountability surface -- Home, the list, today's agenda, the People
   control -- groups the SAME rows with the same function, so no two of them
   can disagree about who is behind or how many. */
assert.equal((client.match(/accountabilityCheckInPeople\(\{/g) ?? []).length, 2, "Grouping happens twice: Home's window, and the full list's lack of one.");
assert.match(client, /upcomingWindowDays: accountabilityUpcomingWindowDays/);
assert.match(client, /upcomingWindowDays: Number\.POSITIVE_INFINITY/);
assert.match(client, /accountabilityPeople=\{checkInPeople\}/);
assert.match(client, /counts=\{checkInPeopleCounts\}/);
assert.match(client, /people=\{accountabilityPeopleForFilter\(checkInPeopleAll, checkInsFilter\)\}/);
assert.match(client, /const accountabilityPeopleNeedingAttention = checkInPeopleCounts\.due_today \+ checkInPeopleCounts\.past_due;/, "The People control counts people, from the same grouping.");
assert.equal(client.includes("function accountabilityDueRows"), false, "The old Home-only bucketing is retired.");
assert.equal(client.includes("AccountabilityDashboardCard"), false, "The three-count-box Accountability card is retired.");
assert.equal(client.includes("more on the people themselves"), false, "The dead-end line is gone.");

/* 11. USA-282 follow-up: Home is discreet, and a record can be deleted.

   The subject of someone's accountability is the most private thing DOS
   holds and a phone is read in public, so Home says who and when only --
   in the row, and in the accessible name it exposes. */
{
  const homeRow = client.slice(client.indexOf("function HomeAccountabilityPersonRow("), client.indexOf("function HomeAccountabilitySectionHeading("));

  assert.equal((homeRow.match(/<button/g) ?? []).length, 1, "Home's row is one tap target too.");
  assert.match(homeRow, /person\.personName/);
  assert.match(homeRow, /person\.statusDateLabel/);
  assert.match(homeRow, /person\.itemCountLabel/);
  assert.equal(/\.topic|\.context|checkInSecondaryLine|CheckInStatusChip/.test(homeRow), false, "No topic, resource title or description reaches Home.");
  assert.equal(/title=\{/.test(homeRow), false, "No tooltip carries the subject either.");
  assert.match(homeRow, /aria-label=\{\[`Check in with \$\{person\.personName\}`/, "The accessible name is the name, the date and the count -- nothing else.");
  assert.match(homeRow, />Check in<\/span>/, "The row offers the check-in by name.");
}

/* Notifications carries today, one line each -- and only today. */
{
  const notifications = client.slice(client.indexOf("function HomeNotificationsPanel("), client.indexOf("const checkInFilterLabels:"));

  assert.match(notifications, /eyebrow="Notifications"/, "The panel keeps its name.");
  assert.match(notifications, /homeTodayEmptyLabel/);
  assert.equal(/badge/i.test(notifications), false, "No line carries a count of work owed.");
  assert.equal(client.includes("function TodayAgendaSheet("), false, "The combined agenda is gone: each notification opens its own destination.");
  assert.equal(client.includes("badge: `${checkInAttentionCount} due`"), false, "And so is the badge that duplicated the backlog.");

  /* What today means, and what each line says. */
  assert.match(client, /icon === "anniversary" \|\| item\.icon === "birthday" \|\| item\.icon === "meeting"/, "Notifications covers meetings, birthdays and anniversaries.");
  assert.match(client, /isHomeTodayDate\(displayDayKeyForValue\(item\.date\), reportToday\)/, "Today only, in the workspace's display timezone.");
  assert.match(client, /accountabilityPeopleDueToday\(checkInPeopleAll\)/, "The check-in lines are the people due today, whatever group they sit in below.");
  assert.match(client, /`Meeting with \$\{personName\}`/, "A meeting says who it is with.");
  assert.match(client, /formatTime\(item\.meeting\.scheduledStartAt\)/, "And when.");
  assert.match(client, /`\$\{homeTodayPossessive\(personName\)\} \$\{occasion\}`/, "A birthday or anniversary states whose day it is, not a task.");
  assert.match(client, /title: `Check in with \$\{person\.personName\}`/, "A check-in line names the person.");
  /* The count on a line about TODAY counts today. A person with one due
     today and two past due read as "3 check-ins" here while the list they
     opened showed one due today -- a number that described something else. */
  assert.match(client, /meta: person\.dueTodayCountLabel \?\? ""/, "With a count of TODAY's check-ins and nothing about them.");
  assert.equal(client.includes("meta: person.itemCountLabel"), false, "The whole backlog is not today's count.");
  assert.match(client, /openMeetingDetail\(item\.meeting\.id\)/, "Each line opens its own detail: the meeting,");
  assert.match(client, /openPersonDetail\(item\.personId\)/, "the person whose day it is,");
  assert.match(client, /onClick: \(\) => openAccountabilityPerson\(person\)/, "or that person's check-ins.");
}

/* The person's own items, opened deliberately: topics belong here, and so
   do the two actions every item carries. */
{
  const itemRow = client.slice(
    client.indexOf("function PersonAccountabilityItemRow("),
    client.indexOf("function PersonAccountabilitySheet("),
  );
  const personSheet = client.slice(
    client.indexOf("function PersonAccountabilitySheet("),
    client.indexOf("function CommitmentSuccessSheet("),
  );

  assert.notEqual(client.indexOf("function PersonAccountabilityItemRow("), -1);
  assert.notEqual(client.indexOf("function CommitmentSuccessSheet("), -1, "the slice has a real end");
  assert.match(personSheet, /person\.items\.map/, "Every open item is listed.");
  assert.match(personSheet, /<PersonAccountabilityItemRow/, "Each item is the same row.");
  assert.match(itemRow, /row\.topic/, "With its topic, which this surface is allowed to say.");
  assert.match(personSheet, /onOpenItem\(row\)/, "Each item opens its own record, so one check-in cannot complete another.");

  /* Check in and Stop, together, on every item -- one-time goal, weekly
     rhythm or Journey milestone alike, and called the same thing on each.
     Edit and Delete are a tap further, inside the item. */
  assert.match(itemRow, /\{accountabilityCheckInActionLabel\}/, "Every row's action is Check in, from the one label.");
  assert.equal(/Add person|Add progress/.test(itemRow), false, "A specialised action never reaches the row.");
  assert.match(itemRow, />\s*Stop\s*</, "And Stop sits beside it.");
  assert.match(personSheet, /onCheckIn=\{\(\) => onCheckIn\(row\)\}/);
  assert.match(personSheet, /onStop=\{\(\) => onStop\(row\)\}/);
  assert.equal(/Pause|Reschedule|Delete/.test(itemRow), false, "The row carries neither the retired actions nor the destructive one.");

  /* Starting another, and the ones already stopped -- kept within reach
     rather than gone. */
  assert.match(personSheet, /onClick=\{onAdd\}/, "A new reminder starts from here.");
  assert.match(personSheet, /`Stopped \(\$\{stoppedItems\.length\}\)`/, "Stopped reminders stay visible as history.");
  assert.match(personSheet, /onRestart\(item\)/, "And can be started again.");
}
assert.match(client, /function openAccountabilityPerson\(person: AccountabilityPerson\) \{/);
assert.match(client, /if \(person\.items\.length === 1\) \{\s*openCheckInRow\(person\.items\[0\]\);/, "One item opens directly; several open the person.");

/* Stopping a reminder: "stop reminding me about this", and nothing more.

   Nothing is deleted, no goal is recorded as achieved and no Journey is
   ended. A rhythm goes to the 'stopped' state the Journey sync leaves alone
   -- 'paused' would not do, because the sync sets paused rows back to active
   -- and a one-time goal is cancelled, which the API never treats as
   completed. */
assert.match(client, /async function stopAccountabilityRow\(row: AccountabilityCheckInRow\) \{/);
assert.match(client, /const isCommitment = row\.kind === "one_time_goal";/);
assert.match(client, /\{ id: row\.sourceId, status: isCommitment \? "cancelled" : "stopped" \},\s*"PATCH",/, "Each kind ends through its own endpoint's status field.");
assert.match(
  read("app/api/dos/app/commitments/route.ts"),
  /updates\.completed_date = nextStatus === "completed" \? todayDateKey\(\) : null;/,
  "A cancelled goal is not a completed one.",
);
{
  const sync = read("src/lib/dos/resource-assignments-api.ts");

  assert.match(sync, /if \(existingForKind\.some\(\(existing\) => String\(existing\.status\) === "stopped"\)\) \{\s*continue;/, "Sync does not recreate a stopped reminder.");
  assert.match(sync, /\.neq\("status", "stopped"\)/, "Nor reach a stopped row while tidying duplicates.");
  assert.match(sync, /String\(existingRow\.status\) === "stopped"/, "Nor when retiring a kind it no longer wants.");
}
{
  const statuses = read("src/lib/dos/commitments-accountability.ts");
  const migration = read("supabase/migrations/20260925120000_usa_282_stopped_accountability_schedules.sql");

  assert.match(statuses, /dosAccountabilityScheduleStatuses = \["active", "paused", "stopped"\] as const;/);
  assert.match(migration, /check \(status in \('active', 'paused', 'stopped'\)\)/, "The database allows the state the code writes.");
}

/* Reversible: the confirmation carries the way back, and the person's own
   Stopped list carries it afterwards. */
assert.match(client, /async function restartAccountabilityItem\(item: \{ kind: "commitment" \| "schedule"; sourceId: string \}\) \{/);
assert.match(client, /\{ id: item\.sourceId, status: "active" \},\s*"PATCH",/);
assert.match(client, /setAccountabilityUndo\(\{/, "A stop announces itself.");
assert.match(client, />\s*Undo\s*</, "With the way to take it back.");
assert.match(client, /onClick=\{\(\) => void restartAccountabilityItem\(accountabilityUndo\)\}/);

/* Reschedule folded into Edit, Pause retired from the primary actions. */
assert.equal(client.includes("submitAccountabilityReschedule"), false, "Reschedule is no longer its own action.");
assert.equal(client.includes("toggleAccountabilitySchedulePause"), false, "Pause has left the primary action area.");
assert.equal(client.includes("pauseLabel"), false);
assert.match(client, /name="accountability_next_check_in"/, "Editing a rhythm is where its next date moves.");
assert.match(client, /accountabilitySchedulePayload\(formData, "accountability", Boolean\(id\)\)/);
assert.match(client, /\.\.\.\(isEdit \? \{\} : \{ status: "active" \}\),/, "An edit never re-asserts active over a stopped reminder.");

/* The same two actions inside the item, in the same words -- including on a
   Journey's own follow-up, which Stop ends as a reminder and nothing more. */
{
  const detail = client.slice(
    client.indexOf("function PersonAccountabilityDetailSheet("),
    client.indexOf("function PersonAccountabilityCheckInSheet("),
  );

  assert.notEqual(client.indexOf("function PersonAccountabilityDetailSheet("), -1);
  assert.match(detail, /onCheckIn \? <AppButton icon="log" onClick=\{onCheckIn\} tone="black">\{accountabilityCheckInActionLabel\}<\/AppButton> : null/, "The item's primary action is Check in, from the same label as the row.");
  assert.match(detail, /onStop \? <AppButton icon="bell" onClick=\{onStop\} tone="white">Stop<\/AppButton> : null/, "Stop is a primary action.");
  assert.equal(
    /Add person|Add progress/.test(detail),
    false,
    "A measurable goal's own action does not replace Check in here either.",
  );
  assert.equal(
    /onStop && !isSystemGenerated|!isSystemGenerated && onStop/.test(detail),
    false,
    "A Journey-generated reminder can be stopped like any other.",
  );
  assert.match(detail, /onEdit && !isSystemGenerated \? <AppButton onClick=\{onEdit\} tone="white">Edit<\/AppButton> : null/, "Edit stays secondary.");
  assert.match(detail, /<RowActionMenu\s*items=\{\[\{ danger: true, label: "Delete", onSelect: onDelete \}\]\}/, "Delete moves into the secondary menu.");
  assert.equal(detail.includes("Reschedule"), false);
}
assert.match(client, /onStop=\{itemRow \? \(\) => void stopAccountabilityRow\(itemRow\) : undefined\}/, "The item stops the same record the list stops.");

/* Check in opens ONE destination for every kind of item, and the specialised
   actions live inside the flow it opens. A measurable goal used to jump
   straight to its own form, so the same word on two rows did two different
   things. */
{
  const router = client.slice(
    client.indexOf("function openCheckInRowAction(row: AccountabilityCheckInRow) {"),
    client.indexOf("function openCheckInRow(row: AccountabilityCheckInRow) {"),
  );

  assert.notEqual(client.indexOf("function openCheckInRowAction(row: AccountabilityCheckInRow) {"), -1);
  assert.equal(
    (router.match(/openPersonAccountabilityCheckIn\(/g) ?? []).length,
    2,
    "A goal and a rhythm both open the check-in flow.",
  );
  assert.equal(
    /openCommitmentSubject|openPersonAccountabilityProgress/.test(router),
    false,
    "Neither jumps past it into a specialised form.",
  );
}
{
  const checkInSheet = client.slice(
    client.indexOf("function PersonAccountabilityCheckInSheet("),
    client.indexOf("function PersonAccountabilityProgressSheet("),
  );

  assert.match(checkInSheet, /accountabilityProgressActionLabel\(progressKind\)/, "The flow names the specialised action for what it does,");
  assert.match(checkInSheet, /specificProgressLabel && onSpecificProgress \?/, "and offers it only where there is something to count.");
  assert.match(checkInSheet, /\{specificProgressLabel\}/);
  /* Now that every item's Check in opens this flow, Done must not become a
     way to mark a goal of three achieved at one. */
  assert.match(
    checkInSheet,
    /const canComplete = Boolean\(commitment\) && !schedule && progressKind === "check_in";/,
    "Done stays off a goal that counts something.",
  );
}
assert.match(client, /\? \(\) => openCommitmentSubject\(checkInSheetCommitment\)\s*: \(\) => openPersonAccountabilityProgress\(checkInSheetCommitment\)/, "Both specialised flows are reached from inside the check-in.");

/* The delete is one operation, asked for once, and offered wherever an
   accountability record is managed: the record's own menu, the item a
   check-in row opens, and the reader's own record. */
assert.match(client, /function requestAccountabilityDelete\(target: PendingAccountabilityDelete\)/);
assert.match(client, /async function confirmAccountabilityDelete\(\)/);
assert.match(client, /target\.kind === "schedule" \? "\/api\/dos\/app\/accountability\/schedules" : "\/api\/dos\/app\/commitments",/, "Each record kind goes to its own endpoint.");
assert.match(client, /\{ id: target\.id \},\s*"DELETE",/);
assert.match(client, /\{ danger: true, label: "Delete", onSelect: topic\.onDelete \}/, "The Person record's three-dot menu offers it.");
assert.match(client, /onDelete=\{schedule\s*\? \(\) => requestAccountabilityDelete\(\{ id: schedule\.id, kind: "schedule"/, "The item a check-in row opens offers it.");
assert.match(client, /onDeleteCommitment\(commitment\)/, "My Record offers it on the reader's own commitments.");
assert.match(client, /title="Delete this accountability\?"/, "It asks before anything goes.");
assert.match(client, /The check-ins already recorded stay on their record\./, "The question says a rhythm's recorded check-ins survive it.");
assert.match(client, /The progress recorded against this goal goes with it\./, "And that a goal's own progress does not.");
assert.equal(client.includes("if (!result) {"), true, "A failed delete keeps the dialog open with its reason.");
{
  const schedules = read("app/api/dos/app/accountability/schedules/route.ts");
  const commitments = read("app/api/dos/app/commitments/route.ts");

  assert.match(schedules, /export async function DELETE\(request: Request\)/);
  assert.match(commitments, /export async function DELETE\(request: Request\)/);
  for (const route of [schedules, commitments]) {
    assert.match(route, /authorizeDosCommitmentsWrite\(\)/, "A delete is authorized like every other write.");
    assert.match(route, /\.eq\("workspace_id", workspaceResult\.workspaceId\)/, "And scoped to the caller's workspace.");
  }
  assert.match(schedules, /if \(parseResourceAssignmentFollowUpScheduleTitle\(asString\(existing\.title\)\)\) \{/, "A Journey's own follow-up cannot be deleted here: sync would write it again.");
  assert.match(commitments, /\.eq\("linked_commitment_id", commitmentId\)/, "Nor the shadow commitment a Journey assignment carries.");
}

/* The People control opens the list and carries the same number its first
   two filters carry, counted in people. */
assert.match(client, /\{accountabilityPeopleNeedingAttention \? \(/, "The People control carries the count.");
assert.match(client, /`Accountability, \$\{accountabilityPeopleNeedingAttention\} \$\{accountabilityPeopleNeedingAttention === 1 \? "person needs" : "people need"\} a check-in`/, "It reads as people, with the unit said.");
assert.match(client, /<span>Accountability<\/span>/, "And the control is named for what it opens.");

// The module stays pure: no clock, no locale, no React.
assert.equal(/new Date\(|Date\.now\(|toLocale|from "react"/.test(lib), false, "The eligibility module takes its day key and formatter from the caller.");
assert.match(client, /today: reportToday,/, "The buckets compare against the server render's day key.");

// My Record keeps personal accountability; this list is other people.
assert.match(client, /commitments=\{myRecordCommitments\}/, "My Record still carries the user's own accountability.");
assert.match(client, /lede="People you need to follow up with\."/, "The list says whose follow-ups it holds.");

console.log("DOS accountability check-ins (USA-282) regression passed.");
