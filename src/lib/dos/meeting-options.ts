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
  "no_change",
  "more_resistant",
  "more_curious",
  "more_open",
  "more_engaged",
  "ready_for_discipleship",
  "multiplying",
] as const;

export const dosLegacyMeetingMovementOptions = [
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
  "repentance_surrender",
  "committed_obey_jesus",
  "asked_baptism",
  "received_freedom_healing",
] as const;

export const dosDiscussionGuideOptions = [
  "none",
  "are_you_really_a_disciple",
  "the_10_commands",
  "relationship_with_jesus_check_in",
  "prayer_freedom_conversation",
  "testimony",
  "custom_discussion",
] as const;

export type DosMeetingType = typeof dosMeetingTypes[number];
export type DosMeetingMovement =
  | typeof dosMeetingMovementOptions[number]
  | typeof dosLegacyMeetingMovementOptions[number];
export type DosMeetingOutcome = typeof dosMeetingOutcomeOptions[number];
export type DosDiscussionGuide = typeof dosDiscussionGuideOptions[number];

export type DosMeetingParticipant = {
  id: string;
  kind: "person" | "profile";
  name: string;
  role: string;
};

export type DosMeetingFeedItem = {
  discussionGuideKey: string | null;
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
  more_curious: "More Curious",
  more_engaged: "More Engaged",
  more_open: "More Open",
  more_resistant: "More Resistant",
  multiplying: "Multiplying",
  no_change: "No Change",
  ready_for_discipleship: "Ready for Discipleship",
};

const dosMeetingOutcomeLabels: Record<DosMeetingOutcome, string> = {
  asked_baptism: "Asked for baptism",
  began_discipling_someone: "Began discipling someone",
  breakthrough_moment: "Breakthrough moment",
  committed_obey_jesus: "Committed to obey Jesus",
  follow_up_needed: "Follow up needed",
  gospel_conversation: "Gospel conversation",
  interested_discipleship: "Interested in discipleship",
  prayer_requested: "Prayer requested",
  received_freedom_healing: "Received freedom / healing",
  repentance_surrender: "Repentance / surrender",
  testimony_shared: "Testimony shared",
  wants_to_meet_again: "Wants to meet again",
};

const dosDiscussionGuideLabels: Record<DosDiscussionGuide, string> = {
  are_you_really_a_disciple: "Are You Really a Disciple?",
  custom_discussion: "Custom Discussion",
  none: "None",
  prayer_freedom_conversation: "Prayer / Freedom Conversation",
  relationship_with_jesus_check_in: "Relationship With Jesus Check In",
  testimony: "Testimony",
  the_10_commands: "The 10 Commands",
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

export function dosDiscussionGuideLabel(guide: string | null) {
  if (!guide) {
    return "";
  }

  return dosDiscussionGuideLabels[guide as DosDiscussionGuide] ?? dosMeetingTypeLabel(guide);
}
