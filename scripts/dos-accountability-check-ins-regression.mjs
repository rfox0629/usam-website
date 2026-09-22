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
  accountabilityCheckInAttentionLabel,
  accountabilityCheckInCounts,
  accountabilityCheckInNeedsAttention,
  accountabilityCheckInPreviewRows,
  accountabilityCheckInRows,
  accountabilityCheckInRowsForFilter,
  isAccountabilityCheckInFilter,
} from "../src/lib/dos/accountability-checkins.ts";
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

const people = new Map([["person-a", "Nathaniel Bliss"], ["person-b", "Nathan Lind"]]);

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

  assert.equal(byId.get("schedule-s-overdue").bucket, "overdue");
  assert.equal(byId.get("schedule-s-overdue").statusLabel, "Overdue · 2026-09-14");
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
  assert.equal(accountabilityCheckInRowsForFilter(rows, "attention").length, counts.attention);
  assert.equal(accountabilityCheckInRowsForFilter(rows, "upcoming").length, counts.upcoming);
  assert.equal(accountabilityCheckInRowsForFilter(rows, "all").length, counts.all);
  // Home's preview is drawn from the same rows as the attention filter.
  assert.deepEqual(
    accountabilityCheckInPreviewRows(rows).map((row) => row.id),
    accountabilityCheckInRowsForFilter(rows, "attention").slice(0, 3).map((row) => row.id),
  );
  // Nothing the leader owns can hide from every filter.
  assert.equal(counts.attention + counts.upcoming + rows.filter((row) => row.bucket === "no_due_date").length, counts.all);
  assert.equal(accountabilityCheckInAttentionLabel(1), "1 needs attention");
  assert.equal(accountabilityCheckInAttentionLabel(2), "2 need attention");
}

// ---------------------------------------------------------------------------
// 3. Home shows at most three, overdue first.
{
  const rows = build({
    schedules: [
      schedule({ id: "s1", nextCheckIn: "2026-09-10" }),
      schedule({ id: "s2", nextCheckIn: "2026-09-11" }),
      schedule({ id: "s3", nextCheckIn: "2026-09-12" }),
      schedule({ id: "s4", nextCheckIn: today }),
      schedule({ id: "s5", nextCheckIn: "2026-10-01" }),
    ],
  });

  assert.deepEqual(accountabilityCheckInPreviewRows(rows).map((row) => row.id), ["schedule-s1", "schedule-s2", "schedule-s3"]);
  assert.equal(accountabilityCheckInPreviewRows(rows).every((row) => row.bucket === "overdue"), true);
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
  assert.equal(accountabilityCheckInRowsForFilter(rows, "all").length, 2);
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
  assert.deepEqual(accountabilityCheckInPreviewRows(rows), []);
  assert.equal(isAccountabilityCheckInFilter("attention"), true);
  assert.equal(isAccountabilityCheckInFilter("everything"), false);
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
  const row = client.slice(client.indexOf("function CheckInListRow("), client.indexOf("function HomeCheckInsPanel("));

  assert.equal((row.match(/<button/g) ?? []).length, 1, "The whole row is one tap target (spec §3).");
  assert.match(row, /min-h-\[60px\]/, "The row keeps a comfortable tap target.");
  assert.match(row, /<ChevronRight/, "The row shows it opens something.");
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
assert.match(client, /checkInAttentionCount=\{checkInCounts\.attention\}/);
assert.match(client, /counts=\{checkInCounts\}/);
assert.equal(client.includes("function accountabilityDueRows"), false, "The old Home-only bucketing is retired.");
assert.equal(client.includes("AccountabilityDashboardCard"), false, "The three-count-box Accountability card is retired.");
assert.equal(client.includes("more on the people themselves"), false, "The dead-end line is gone.");

// The module stays pure: no clock, no locale, no React.
assert.equal(/new Date\(|Date\.now\(|toLocale|from "react"/.test(lib), false, "The eligibility module takes its day key and formatter from the caller.");
assert.match(client, /today: reportToday,/, "The buckets compare against the server render's day key.");

// My Record keeps personal accountability; this list is other people.
assert.match(client, /commitments=\{myRecordCommitments\}/, "My Record still carries the user's own accountability.");
assert.match(client, /lede="People you need to follow up with\."/, "The list says whose follow-ups it holds.");

console.log("DOS accountability check-ins (USA-282) regression passed.");
