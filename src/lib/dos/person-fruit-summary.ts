import type { DosAppFruit, DosAppFruitEvent, DosAppLeaderReflection, DosAppMeeting, DosAppPerson } from "@/src/lib/dos/missionary-app";
import { discipleshipStageLabel } from "@/src/lib/dos/relationship-model";

type PersonDetailFruitSummaryInput = {
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  person: DosAppPerson;
};

export type PersonDetailFruitSummary = {
  discipleshipStatus: string;
  followUpNeeded: "No" | "Yes";
  fruitEvents: DosAppFruitEvent[];
  latestFruit: string;
  multiplicationStatus: "Disciple Maker" | "Multiplying" | "Not yet" | "Started";
};

const displayableFruitStatuses = new Set(["approved", "reviewed", "submitted"]);
const summaryFruitStatuses = new Set(["approved"]);
const summaryFruitVisibilities = new Set(["internal", "public"]);

function normalizedText(...values: Array<null | string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function activityDateValue(value: null | string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function isDisplayableFruitStatus(status: string) {
  return displayableFruitStatuses.has(status.toLowerCase());
}

function isSummaryFruitEvent(event: DosAppFruitEvent) {
  return summaryFruitStatuses.has(event.status.toLowerCase())
    && summaryFruitVisibilities.has(event.visibility.toLowerCase());
}

function isSinglePersonMeetingFor(meeting: DosAppMeeting | undefined, personId: string) {
  return Boolean(meeting?.fieldPersonIds.length === 1 && meeting.fieldPersonIds[0] === personId);
}

function fruitEventBelongsToPerson(event: DosAppFruitEvent, personId: string, meetingsById: Map<string, DosAppMeeting>) {
  if (event.personId === personId) {
    return true;
  }

  if (event.personId || !event.meetingId) {
    return false;
  }

  // Meeting fallback is intentionally narrow so group-meeting fruit is not
  // copied onto every participant unless the meeting has exactly one person.
  return isSinglePersonMeetingFor(meetingsById.get(event.meetingId), personId);
}

function fruitItemBelongsToPerson(item: DosAppFruit, personId: string, meetingsById: Map<string, DosAppMeeting>) {
  if (item.fieldPersonId === personId) {
    return true;
  }

  if (item.fieldPersonId) {
    return false;
  }

  if (!item.tableId) {
    return false;
  }

  return isSinglePersonMeetingFor(meetingsById.get(item.tableId), personId);
}

function displayableFruitEventsForPerson(events: DosAppFruitEvent[], personId: string, meetingsById: Map<string, DosAppMeeting>) {
  return events
    .filter((event) => isDisplayableFruitStatus(event.status))
    .filter((event) => Boolean(event.title?.trim() || event.fruitType.trim()))
    .filter((event) => fruitEventBelongsToPerson(event, personId, meetingsById))
    .sort((first, second) => activityDateValue(second.date) - activityDateValue(first.date));
}

function summaryFruitEventsForPerson(events: DosAppFruitEvent[], personId: string, meetingsById: Map<string, DosAppMeeting>) {
  return events
    .filter(isSummaryFruitEvent)
    .filter((event) => Boolean(event.title?.trim() || event.fruitType.trim()))
    .filter((event) => fruitEventBelongsToPerson(event, personId, meetingsById))
    .sort((first, second) => activityDateValue(second.date) - activityDateValue(first.date));
}

function latestFruitLabel(event: DosAppFruitEvent | undefined) {
  if (!event) {
    return "None yet";
  }

  const title = event.title?.trim() ?? "";
  const fruitType = event.fruitType.trim();

  if (title && fruitType && normalizedText(title) !== normalizedText(fruitType)) {
    return `${title} · ${fruitType}`;
  }

  return title || fruitType || "None yet";
}

function reflectionBelongsToPerson(reflection: DosAppLeaderReflection, personId: string, meetingsById: Map<string, DosAppMeeting>) {
  if (reflection.personId === personId) {
    return true;
  }

  if (reflection.personId) {
    return false;
  }

  // Reflections without a person are only person-specific when the meeting has
  // one participant. This avoids false follow-up flags from group meetings.
  return isSinglePersonMeetingFor(meetingsById.get(reflection.meetingId), personId);
}

function isSendFollowUpStep(value: null | string | undefined) {
  return normalizedText(value) === "send follow up";
}

function isFollowUpNeededValue(value: boolean | null | string | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizedText(value);

  return Boolean(normalized && !["false", "no", "none", "not needed"].includes(normalized));
}

function hasFollowUpNeeded(personId: string, reflections: DosAppLeaderReflection[], meetings: DosAppMeeting[], meetingsById: Map<string, DosAppMeeting>) {
  const reflectionSignal = reflections
    .filter((reflection) => reflectionBelongsToPerson(reflection, personId, meetingsById))
    .some((reflection) => reflection.followUpNeeded || isSendFollowUpStep(reflection.nextStep));

  if (reflectionSignal) {
    return true;
  }

  return meetings
    .filter((meeting) => meeting.source === "connection" && meeting.fieldPersonIds.includes(personId))
    .some((meeting) => isFollowUpNeededValue(meeting.followUpNeeded) || isSendFollowUpStep(meeting.movementStep));
}

function discipleshipStatusFor(person: DosAppPerson) {
  return discipleshipStageLabel(person.discipleshipStage);
}

function hasMultiplicationText(...values: Array<null | string | undefined>) {
  const text = normalizedText(...values);

  return text === "started discipling others"
    || text.includes("started discipling others")
    || text.includes("multiplication")
    || text.includes("disciple maker");
}

function hasMultiplicationFruitItem(item: DosAppFruit) {
  return item.outcomeTags.some((tag) => hasMultiplicationText(tag));
}

function multiplicationStatusFor({
  fruitEvents,
  fruitItems,
  person,
}: {
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  person: DosAppPerson;
}): PersonDetailFruitSummary["multiplicationStatus"] {
  const isDiscipleMaker = person.discipleshipStage === "disciple_maker";
  const fruitEventSignalCount = fruitEvents.filter((event) => hasMultiplicationText(event.fruitType, event.title)).length;
  const fruitItemSignalCount = fruitItems.filter(hasMultiplicationFruitItem).length;
  const fruitEvidenceCount = fruitEventSignalCount + fruitItemSignalCount;

  if (isDiscipleMaker && fruitEvidenceCount > 0) {
    return "Multiplying";
  }

  if (isDiscipleMaker) {
    return "Disciple Maker";
  }

  if (fruitEvidenceCount > 0) {
    return "Started";
  }

  return "Not yet";
}

export function selectPersonDetailFruitSummary({
  fruitEvents,
  fruitItems,
  leaderReflections,
  meetings,
  person,
}: PersonDetailFruitSummaryInput): PersonDetailFruitSummary {
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
  const displayableFruitEvents = displayableFruitEventsForPerson(fruitEvents, person.id, meetingsById);
  const summaryFruitEvents = summaryFruitEventsForPerson(fruitEvents, person.id, meetingsById);
  const displayableFruitItems = fruitItems
    .filter((item) => item.status === "approved")
    .filter((item) => fruitItemBelongsToPerson(item, person.id, meetingsById));

  return {
    discipleshipStatus: discipleshipStatusFor(person),
    followUpNeeded: hasFollowUpNeeded(person.id, leaderReflections, personMeetings, meetingsById) ? "Yes" : "No",
    fruitEvents: displayableFruitEvents,
    latestFruit: latestFruitLabel(summaryFruitEvents[0]),
    multiplicationStatus: multiplicationStatusFor({
      fruitEvents: summaryFruitEvents,
      fruitItems: displayableFruitItems,
      person,
    }),
  };
}
