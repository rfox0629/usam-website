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

assert(
  appClient.includes("function MeetingDurationSelector({") && appClient.includes("customTotalMinutes") && appClient.includes(">Hours</span>") && appClient.includes(">Minutes</span>"),
  "Edit Table duration selector must support custom hours and minutes.",
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
  appClient.includes('aria-label={option.label}')
    && appClient.includes("type=\"checkbox\"")
    && appClient.includes("checked={selected}")
    && appClient.includes("h-5 w-5 shrink-0 accent-[#2563EB]")
    && appClient.includes("onChange={() => onToggle(option.value)}"),
  "Observed fruit options must use visible checkbox-backed controls so mobile taps reliably toggle selection.",
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
