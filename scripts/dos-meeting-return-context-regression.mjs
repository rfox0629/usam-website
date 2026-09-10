// USA-246 — People as a primary destination, and returning to where you were
// after saving a meeting.
//
// Saving used to send everyone to the Meetings tab regardless of where the flow
// started, and a router.refresh() that remounted the shell could drop the user
// on Home — losing the person or the calendar date they were working from.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const client = read("app/dos/app/DosMvpAppClient.tsx");

// 1. Four destinations, Home first, People product-facing.
const tabsBlock = client.slice(client.indexOf("const mobileTabs:"), client.indexOf("const usamWalkthroughDismissedStorageKey"));
const labels = [...tabsBlock.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(labels, ["Home", "People", "Meetings", "More"], `Mobile navigation must be Home / People / Meetings / More, got ${labels.join(" / ")}.`);
assert(tabsBlock.includes('{ icon: "people", label: "People", value: "people" }'), "People must be a real destination, not a More entry.");
assert(client.includes('grid w-full grid-cols-4 gap-1 rounded-full border border-dos-line bg-white p-1.5 shadow-dos-float'), "The bottom navigation must lay out four destinations.");
assert(
  !client.includes('(tab.value === "more" && activeTab === "people")'),
  "The navigation must highlight People itself rather than lighting up More.",
);
assert(client.includes('{ icon: "people", label: "People", type: "tab", value: "people" }'), "Desktop navigation must use the same product-facing name.");

// 2. Home stays the landing screen and keeps its own surfaces.
assert(client.includes('useState<ActiveTab>("home")'), "Home remains the default landing destination.");
assert(client.includes("<CircleFocusHero"), "The Home bullseye stays.");
for (const action of ["Log Meeting", "Schedule Meeting", "Add Person"]) {
  assert(client.includes(`label: "${action}"`), `Home quick action ${action} must remain.`);
}

// 3. The origin of a meeting flow is recorded, and drives where saving returns.
assert(client.includes("function currentMeetingFlowOrigin(): MeetingFlowOrigin"), "The launch origin must be captured.");
assert(
  client.includes('if (mode === "meeting" || mode === "scheduleMeeting") {\n      meetingFlowOriginRef.current = currentMeetingFlowOrigin();'),
  "Opening a meeting flow must record where it started.",
);
assert(
  client.includes('meetingFlowOriginRef.current = { calendarDateKey: selectedMeetingsCalendarDate, kind: "calendar" };'),
  "Logging from the calendar must remember the date.",
);
assert(
  client.includes("function returnAfterMeetingSave(meetingId: string | null)"),
  "There must be one place that decides where a save returns to.",
);
const returnBlock = client.slice(client.indexOf("function returnAfterMeetingSave"), client.indexOf("function closeForm()"));
assert(returnBlock.includes('if (origin.kind === "person") {') && returnBlock.includes('setActiveTab("people")'), "From a Person, return to that Person.");
assert(returnBlock.includes('if (origin.kind === "calendar") {') && returnBlock.includes("setSelectedMeetingsCalendarDate(origin.calendarDateKey)"), "From a calendar date, return to that date.");
assert(returnBlock.includes('if (origin.kind === "timeline") {') && returnBlock.includes('setMeetingsView("timeline")'), "From Timeline, return to Timeline.");
assert(returnBlock.includes('setActiveTab("home");\n    setMeetingSaveConfirmation('), "From Home, return to Home with a confirmation.");
assert(returnBlock.includes("setSelectedMeetingId(meetingId)"), "The saved meeting must be the selected one wherever we return to.");
assert(
  !/closeForm\(\);\s*\n\s*setActiveTab\("meetings"\);\s*\n\s*setSelectedMeetingId\(workflowIds\.meetingId\);/.test(client),
  "Saving must no longer send every flow to the Meetings tab.",
);

// 4. A refresh or remount must not silently reset the view.
assert(client.includes("function readPersistedAppView(workspaceId: string)"), "The view must survive a refresh.");
assert(client.includes("function writePersistedAppView(workspaceId: string"), "The view must be persisted as it changes.");
assert(client.includes("return `dos-app-view:${workspaceId}`;"), "Persisted view state must be scoped per workspace.");
assert(
  client.includes("if (selectedPersonId && people.length && !people.some((person) => person.id === selectedPersonId)) {"),
  "A restored person must be re-validated against this workspace's people.",
);
// USA-261: the saved view is restored after hydration, never read during a render.
const restoreEffect = client.slice(client.indexOf("useLayoutEffect(() => {\n    const restored = readPersistedAppView(data.workspace.id);"), client.indexOf("setIsViewRestored(true);"));
assert(restoreEffect.length > 0, "The saved view must be restored in a layout effect after hydration (USA-261).");
assert(restoreEffect.includes("setActiveTab(restoredTab)"), "The tab must survive a refresh.");
assert(restoreEffect.includes("setMeetingsView(restored.meetingsView)"), "The Meetings subview must survive a refresh.");
assert(restoreEffect.includes("setSelectedMeetingsCalendarDate(restored.meetingsCalendarDate)") && restoreEffect.includes("setMeetingsCalendarMonth(startOfCalendarMonth(dateFromCalendarKey(restored.meetingsCalendarDate)))"), "The selected calendar date (and its month) must survive a refresh.");
assert(restoreEffect.includes("setSelectedPersonId(restored.selectedPersonId)"), "The open Person must survive a refresh.");
assert(restoreEffect.includes("setMoreAppView(restoredMoreApp)"), "The open More app must survive a refresh.");
assert(restoreEffect.includes("bareMoreTab && desktop"), "A saved bare More tab stays on the Dashboard on desktop (spec §5.7).");
assert((client.match(/readPersistedAppView\(/g) ?? []).length === 2, "readPersistedAppView is defined once and called once, from the restore effect.");
assert(!/use(?:Ref|State|Memo)\([^\n]*readPersistedAppView\(/.test(client), "Storage must never be read during a render: that is the USA-261 hydration mismatch.");
assert(client.includes("if (!isViewRestored) {\n      return;\n    }\n\n    if (selectedPersonId && people.length"), "The defaults must never be persisted over the saved view before it is restored.");
assert(client.includes("catch {\n    /* A browser that refuses session storage simply gets today's behaviour. */"), "Storage failure must degrade, never throw.");

// 5. A failed save keeps the user on the form with their work.
assert(
  client.includes('setErrorMessage(error instanceof Error ? error.message : "Unable to save meeting.");'),
  "A failed save must surface the error rather than navigating away.",
);

console.log("DOS meeting return-context (USA-246) regression passed.");
