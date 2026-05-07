export const dosMeetingTypes = [
  "kitchen_table",
  "coffee",
  "prayer",
  "follow_up",
  "discipleship",
  "group_gathering",
  "evangelism_conversation",
  "other",
] as const;

export const dosMeetingMovementOptions = [
  "more_open",
  "more_engaged",
  "beginning_discipleship",
  "beginning_multiplication",
] as const;

export const dosMeetingOutcomeOptions = [
  "prayer_requested",
  "gospel_conversation",
  "follow_up_needed",
  "wants_to_meet_again",
  "breakthrough_moment",
  "interested_discipleship",
  "began_discipling_someone",
  "testimony_shared",
] as const;

export type DosMeetingType = typeof dosMeetingTypes[number];
export type DosMeetingMovement = typeof dosMeetingMovementOptions[number];
export type DosMeetingOutcome = typeof dosMeetingOutcomeOptions[number];

export type DosMeetingParticipant = {
  id: string;
  kind: "person" | "profile";
  name: string;
  role: string;
};

export type DosMeetingFeedItem = {
  followUpNeeded: boolean;
  id: string;
  meetingAt: string;
  meetingDate: string;
  ministers: DosMeetingParticipant[];
  outcomeMarkers: string[];
  outcomeNotesPrivate: string | null;
  people: DosMeetingParticipant[];
  prayerRequested: boolean;
  relationshipMovement: string | null;
  spiritualOpennessMovement: string | null;
  summaryPrivate: string | null;
  title: string;
  type: string;
};

export type DosMeetingOption = {
  id: string;
  kind: "person" | "profile";
  name: string;
  relationshipStage?: string | null;
};

export type DosMeetingsWorkspaceData = {
  collective: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  defaultMinisterId: string;
  fieldPeople: DosMeetingOption[];
  meetings: DosMeetingFeedItem[];
  ministers: DosMeetingOption[];
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

const dosMeetingTypeLabels: Record<DosMeetingType, string> = {
  coffee: "Coffee",
  discipleship: "Discipleship",
  evangelism_conversation: "Evangelism Conversation",
  follow_up: "Follow Up",
  group_gathering: "Group Gathering",
  kitchen_table: "Kitchen Table",
  other: "Other",
  prayer: "Prayer",
};

const dosMeetingMovementLabels: Record<DosMeetingMovement, string> = {
  beginning_discipleship: "Beginning Discipleship",
  beginning_multiplication: "Beginning Multiplication",
  more_engaged: "More Engaged",
  more_open: "More Open",
};

const dosMeetingOutcomeLabels: Record<DosMeetingOutcome, string> = {
  began_discipling_someone: "Began discipling someone",
  breakthrough_moment: "Breakthrough moment",
  follow_up_needed: "Follow up needed",
  gospel_conversation: "Gospel conversation",
  interested_discipleship: "Interested in discipleship",
  prayer_requested: "Prayer requested",
  testimony_shared: "Testimony shared",
  wants_to_meet_again: "Wants to meet again",
};

export function dosMeetingTypeLabel(type: string) {
  return dosMeetingTypeLabels[type as DosMeetingType] ?? type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dosMeetingMovementLabel(movement: string | null) {
  if (!movement) {
    return "";
  }

  return dosMeetingMovementLabels[movement as DosMeetingMovement] ?? dosMeetingTypeLabel(movement);
}

export function dosMeetingOutcomeLabel(outcome: string | null) {
  if (!outcome) {
    return "";
  }

  return dosMeetingOutcomeLabels[outcome as DosMeetingOutcome] ?? dosMeetingTypeLabel(outcome);
}
