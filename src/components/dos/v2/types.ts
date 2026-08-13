/**
 * People + Home V2 prototype - local, self-contained data model.
 *
 * USA-164: this is intentionally NOT the production DosAppData shape. It is a
 * simplified, ministry-language model used only to demonstrate the target
 * information architecture with safe fixture data. Nothing here reads from or
 * writes to Supabase. See PROTOTYPE_NOTES in fixtureData.ts for which parts
 * map cleanly onto existing production concepts vs. require product/architecture
 * decisions before real implementation.
 */

export type Sphere = "three" | "twelve" | "seventy" | "onetwenty";

export type ProtoPerson = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  howKnown: string | null;
  relationshipLabel: string;
  engagementLevel: number; // -3..3
  church: string | null;
  occupation: string | null;
  spouseName: string | null;
  childrenNames: string | null;
  birthday: string | null;
  anniversary: string | null;
  address: string | null;
  householdNotes: string | null;
  sphere: Sphere;
  createdAt: string;
};

export type ProtoMeetingStatus = "scheduled" | "logged";

export type ProtoMeeting = {
  id: string;
  personIds: string[];
  status: ProtoMeetingStatus;
  scheduledAt: string;
  durationMinutes: number;
  calendarSynced: boolean;
  context: string | null;
  notes: string | null;
  loggedAt: string | null;
};

export type AccountabilityState = "going_well" | "struggling" | "discussed" | "reset";

export type ProtoAccountabilityTopic = {
  id: string;
  personId: string;
  topic: string;
  cadence: "Daily" | "Weekly" | "Biweekly";
  status: AccountabilityState;
  lastCheckInAt: string | null;
  createdAt: string;
};

export type ProtoAccountabilityCheckIn = {
  id: string;
  topicId: string;
  personId: string;
  outcome: AccountabilityState;
  note: string | null;
  meetingId: string | null;
  createdAt: string;
};

export type JourneyContext = "direct" | "group";

export type ProtoJourneyAssignment = {
  id: string;
  personId: string;
  resourceTitle: string;
  resourceType: "Reading Plan" | "Book Study";
  unitLabel: "Day" | "Week";
  totalUnits: number;
  completedUnits: number;
  context: JourneyContext;
  groupId: string | null;
  status: "not_started" | "in_progress" | "completed";
  startedAt: string;
  lastActivityAt: string | null;
};

export type ProtoPrayer = {
  id: string;
  personId: string;
  request: string;
  status: "active" | "answered";
  createdAt: string;
  answeredAt: string | null;
  answerNote: string | null;
};

export type ProtoNextStep = {
  id: string;
  personId: string;
  description: string;
  dueAt: string | null;
  status: "open" | "done";
  createdAt: string;
  completedAt: string | null;
  meetingId: string | null;
};

export type ProtoGroupGathering = {
  id: string;
  title: string;
  startsAt: string;
  status: "scheduled" | "completed";
  attendedPersonIds: string[];
};

export type ProtoGroup = {
  id: string;
  name: string;
  rhythmLabel: string;
  memberPersonIds: string[];
  gatherings: ProtoGroupGathering[];
};

export type ProtoFruit = {
  id: string;
  personId: string;
  summary: string;
  createdAt: string;
};

export type HistoryEventType =
  | "meeting_logged"
  | "meeting_scheduled"
  | "accountability_checkin"
  | "accountability_started"
  | "journey_assigned"
  | "journey_progress"
  | "journey_completed"
  | "prayer_added"
  | "prayer_answered"
  | "next_step_added"
  | "next_step_completed"
  | "group_gathering"
  | "fruit";

export type HistoryEvent = {
  id: string;
  personId: string;
  type: HistoryEventType;
  date: string;
  title: string;
  detail: string | null;
};
