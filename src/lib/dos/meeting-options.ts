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

export type DosMeetingType = typeof dosMeetingTypes[number];
export type DosMeetingMovement = typeof dosMeetingMovementOptions[number];

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
