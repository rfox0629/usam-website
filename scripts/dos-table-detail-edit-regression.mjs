import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const reflectionsRoute = read("app/api/dos/app/reflections/route.ts");
const fruitIntelligence = read("src/lib/dos/fruit-intelligence.ts");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const observedFruitBlockStart = appClient.indexOf("function ObservedFruitMultiSelect");
const observedFruitBlockEnd = appClient.indexOf("function MeetingRecommendationsPreview", observedFruitBlockStart);
const observedFruitBlock = appClient.slice(observedFruitBlockStart, observedFruitBlockEnd);
const editMeetingBlockStart = appClient.indexOf('{formMode === "editMeeting"');
const editMeetingBlockEnd = appClient.indexOf('{formMode === "meetingNotes"', editMeetingBlockStart);
const editMeetingBlock = appClient.slice(editMeetingBlockStart, editMeetingBlockEnd);

/* USA-216 (spec §5.3, V10 "Duration 15-minute steps"): the preset pills and
   the custom hours/minutes pair became one 15-minute stepper with no ceiling.
   The guarantee this assertion carried -- Edit Table can set any duration, not
   only a preset -- still holds through the stepper; sub-15-minute precision is
   an intentional, recorded delta. The posted field is unchanged. */
const durationSelectorStart = appClient.indexOf("function MeetingDurationSelector({");
const durationSelectorBlock = appClient.slice(durationSelectorStart, appClient.indexOf("\nfunction ", durationSelectorStart + 1));

assert(
  durationSelectorStart >= 0
    && durationSelectorBlock.includes('name="meeting_duration_minutes"')
    && durationSelectorBlock.includes("step={15}")
    && !durationSelectorBlock.includes("max=")
    && durationSelectorBlock.includes("setDurationMinutes"),
  "Edit Table duration selector must support any duration through the 15-minute stepper with no ceiling.",
);

assert(
  appClient.includes('showDurationField={selectedMeeting.meetingStatus !== "scheduled" || isLoggingSelectedScheduledMeeting}'),
  "Logged Edit Table must render the duration selector.",
);

assert(
  appClient.includes("durationDefault={durationMinutesFromDateRange(selectedMeeting.scheduledStartAt, selectedMeeting.scheduledEndAt"),
  "Logged Edit Table must seed duration from the saved start/end timestamps.",
);

assert(
  appClient.includes("payload.scheduledStartAt = loggedStartAt;") && appClient.includes("payload.scheduledEndAt = loggedEndAt;"),
  "Logged Edit Table saves must persist duration through scheduled_start_at/scheduled_end_at.",
);

assert(
  appClient.includes("function observedFruitForMeeting(reflections: DosAppLeaderReflection[], fruitEvents: DosAppFruitEvent[], meetingId: string)")
    && appClient.includes("event.generatedBy === \"leader_review\" || event.sourceType === \"leader_reflection\"")
    && appClient.includes("setSelectedOutcomeTags(observedFruitForMeeting(data.leaderReflections, data.fruitEvents, meeting.id))")
    && appClient.includes("const observedFruit = observedFruitForMeeting(leaderReflections, fruitEvents, meeting.id)")
    && appClient.includes("fruitEvents={data.fruitEvents}"),
  "Edit Table and Table detail must fall back to saved leader-review fruit_events when no reflection row exists.",
);

assert(
  appClient.includes('name="observed_fruit"') && appClient.includes("function formObservedFruit(formData: FormData)") && appClient.includes("const observedFruit = formObservedFruit(formData);"),
  "Edit Table must submit observed fruit from the rendered form state so removed fruit is not saved from stale React state.",
);

assert(
  observedFruitBlockStart >= 0
    && observedFruitBlockEnd > observedFruitBlockStart
    && observedFruitBlock.includes("aria-pressed={selected}")
    && observedFruitBlock.includes("onClick={() => onToggle(option.value)}")
    && observedFruitBlock.includes("type=\"button\"")
    && observedFruitBlock.includes("border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]"),
  "Observed fruit options must make the whole row a toggle control so mobile taps reliably select or deselect fruit.",
);

assert(
  editMeetingBlockStart >= 0
    && editMeetingBlockEnd > editMeetingBlockStart
    && editMeetingBlock.includes("onToggleOutcomeTag={toggleOutcomeTag}")
    && editMeetingBlock.includes("selectedOutcomeTags={selectedOutcomeTags}"),
  "Edit Table must wire observed-fruit selected state and toggle handler into the form.",
);

assert(
  missionaryApp.includes('"Felt encouraged"')
    && missionaryApp.includes("export const dosAppFruitTypeOptions = dosAppOutcomeTags;"),
  "Every Edit Table observed-fruit option must be accepted by the DOS fruit persistence allowlist.",
);

assert(
  appClient.includes("replaceLatest: true"),
  "Logged Edit Table saves must replace the latest reflection instead of appending stale observed fruit.",
);

assert(
  appClient.includes("setSelectedMeetingId(selectedMeeting.id);\n        router.refresh();"),
  "Edit Table must refresh server-backed DOS data after saving so table detail does not show stale duration or fruit.",
);

assert(
  reflectionsRoute.includes("replaceLatest") && reflectionsRoute.includes(".update(reflectionValues)") && reflectionsRoute.includes(".from(\"meeting_reflections\")"),
  "Reflection route must support replacing the latest table reflection.",
);

assert(
  fruitIntelligence.includes("syncFruitEventsForReflection") && fruitIntelligence.includes(".delete()") && fruitIntelligence.includes(".upsert(fruitEventPayload(event), { onConflict: \"generation_key\" })"),
  "Reflection fruit sync must delete stale fruit_events and upsert the current saved observed fruit.",
);

assert(
  !fruitIntelligence.includes("Prayer needs were named in the Leader Reflection.") && !fruitIntelligence.includes("Leader observed"),
  "Leader reflection fruit_events should come from saved observed-fruit selections, not extra narrative inference.",
);

assert(
  appClient.includes("function FruitOutcomesDetailCard") && appClient.includes("No fruit recorded yet.") && !appClient.includes('<DetailCard title="Fruit Feed">'),
  "Table detail must show saved observed fruit with a clean empty state instead of the old Fruit Feed card.",
);

console.log("DOS table detail edit regression passed.");
