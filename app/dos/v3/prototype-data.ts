export type RelationshipType = "Family" | "Friend" | "Neighbor" | "Coworker" | "Church" | "Other";

export type EngagementLevel = "New Contact" | "Building Trust" | "Open" | "Disciple" | "Leader";

export type MovementStep =
  | "Continue meeting"
  | "Begin discipleship"
  | "Send follow up"
  | "Invite to group"
  | "Connect to church"
  | "Connect to ministry"
  | "Hand off"
  | "Pray and wait"
  | "Other";

export const movementSteps: MovementStep[] = [
  "Continue meeting",
  "Begin discipleship",
  "Send follow up",
  "Invite to group",
  "Connect to church",
  "Connect to ministry",
  "Hand off",
  "Pray and wait",
  "Other",
];

export const meetingTypes = ["Kitchen Table", "Coffee", "Phone", "Zoom", "Group", "Other"] as const;
export type MeetingType = (typeof meetingTypes)[number];

export const outcomeTags = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
] as const;
export type OutcomeTag = (typeof outcomeTags)[number];

export type ProtoPerson = {
  church?: string;
  engagementLevel: EngagementLevel;
  id: string;
  lastMeetingAt: string | null;
  name: string;
  phone: string;
  relationshipType: RelationshipType;
};

export type ProtoCommitment = {
  createdAt: string;
  dueDate: string;
  done: boolean;
  id: string;
  personId: string;
  text: string;
};

export type ProtoNextStep = {
  createdAt: string;
  dueDate: string;
  done: boolean;
  id: string;
  personId: string;
  text: string;
};

export type ProtoPrayerNeed = {
  answered: boolean;
  createdAt: string;
  id: string;
  personId: string;
  text: string;
};

export type ProtoMeeting = {
  createdAt: string;
  date: string;
  followUpDate: string | null;
  id: string;
  movementStep: MovementStep;
  notes: string;
  personIds: string[];
  type: MeetingType;
};

export type ProtoFruit = {
  date: string;
  id: string;
  outcomeTag: OutcomeTag;
  personId: string;
  summary: string;
};

export type PrototypeState = {
  commitments: ProtoCommitment[];
  fruit: ProtoFruit[];
  meetings: ProtoMeeting[];
  nextSteps: ProtoNextStep[];
  people: ProtoPerson[];
  prayerNeeds: ProtoPrayerNeed[];
};

function daysFromToday(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function seedPrototypeState(): PrototypeState {
  const people: ProtoPerson[] = [
    {
      engagementLevel: "Disciple",
      id: "p1",
      lastMeetingAt: daysFromToday(-2),
      name: "Marcus Ellison",
      phone: "(555) 201-4487",
      relationshipType: "Friend",
    },
    {
      church: "Riverside Community",
      engagementLevel: "Open",
      id: "p2",
      lastMeetingAt: daysFromToday(-6),
      name: "Priya Nair",
      phone: "(555) 340-2291",
      relationshipType: "Neighbor",
    },
    {
      engagementLevel: "Building Trust",
      id: "p3",
      lastMeetingAt: daysFromToday(-14),
      name: "Jake Sorensen",
      phone: "(555) 118-9932",
      relationshipType: "Coworker",
    },
    {
      engagementLevel: "New Contact",
      id: "p4",
      lastMeetingAt: null,
      name: "Dana Whitfield",
      phone: "(555) 776-2015",
      relationshipType: "Other",
    },
    {
      church: "Grace Fellowship",
      engagementLevel: "Leader",
      id: "p5",
      lastMeetingAt: daysFromToday(-1),
      name: "Elena Cruz",
      phone: "(555) 902-6650",
      relationshipType: "Church",
    },
  ];

  const commitments: ProtoCommitment[] = [
    { createdAt: daysFromToday(-6), done: false, dueDate: daysFromToday(-1), id: "c1", personId: "p2", text: "Read John 3 before next meeting" },
    { createdAt: daysFromToday(-2), done: false, dueDate: daysFromToday(0), id: "c2", personId: "p1", text: "Call his brother about the visit" },
    { createdAt: daysFromToday(-14), done: false, dueDate: daysFromToday(2), id: "c3", personId: "p3", text: "Think about joining Tuesday group" },
  ];

  const nextSteps: ProtoNextStep[] = [
    { createdAt: daysFromToday(-2), done: false, dueDate: daysFromToday(0), id: "n1", personId: "p1", text: "Follow up on job interview" },
    { createdAt: daysFromToday(-1), done: false, dueDate: daysFromToday(3), id: "n2", personId: "p5", text: "Confirm baptism date" },
    { createdAt: daysFromToday(-6), done: false, dueDate: daysFromToday(-2), id: "n3", personId: "p2", text: "Send church service times" },
  ];

  const prayerNeeds: ProtoPrayerNeed[] = [
    { answered: false, createdAt: daysFromToday(-2), id: "pr1", personId: "p1", text: "Job interview on Friday" },
    { answered: false, createdAt: daysFromToday(-6), id: "pr2", personId: "p2", text: "Healing for her mother" },
    { answered: true, createdAt: daysFromToday(-20), id: "pr3", personId: "p5", text: "Peace about ministry transition" },
  ];

  const meetings: ProtoMeeting[] = [
    {
      createdAt: daysFromToday(-2),
      date: daysFromToday(-2),
      followUpDate: daysFromToday(0),
      id: "m1",
      movementStep: "Continue meeting",
      notes: "Talked through the job interview stress. Prayed together. He asked good questions about what following Jesus actually costs day to day.",
      personIds: ["p1"],
      type: "Coffee",
    },
    {
      createdAt: daysFromToday(-6),
      date: daysFromToday(-6),
      followUpDate: daysFromToday(-1),
      id: "m2",
      movementStep: "Send follow up",
      notes: "First real spiritual conversation. She's curious but has questions about suffering. Gave her John to read.",
      personIds: ["p2"],
      type: "Kitchen Table",
    },
    {
      createdAt: daysFromToday(-1),
      date: daysFromToday(-1),
      followUpDate: daysFromToday(3),
      id: "m3",
      movementStep: "Begin discipleship",
      notes: "Confirmed she wants to be baptized. Walking through what that means with her this month.",
      personIds: ["p5"],
      type: "Zoom",
    },
  ];

  const fruit: ProtoFruit[] = [
    { date: daysFromToday(-1), id: "f1", outcomeTag: "Discipleship", personId: "p5", summary: "Elena committed to baptism and weekly discipleship meetings." },
  ];

  return { commitments, fruit, meetings, nextSteps, people, prayerNeeds };
}

export function isOverdue(dueDate: string) {
  return dueDate < daysFromToday(0);
}

export function isDueToday(dueDate: string) {
  return dueDate === daysFromToday(0);
}

export function formatProtoDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function relativeDayLabel(value: string) {
  const today = daysFromToday(0);
  const tomorrow = daysFromToday(1);
  const yesterday = daysFromToday(-1);

  if (value === today) return "Today";
  if (value === tomorrow) return "Tomorrow";
  if (value === yesterday) return "Yesterday";
  return formatProtoDate(value);
}

export { daysFromToday };
