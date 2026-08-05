// DOS V3 founder prototype — synthetic data only.
//
// Nothing here touches Supabase, auth, or any production table. The prototype
// runs entirely in React state so the founder can click every workflow end to
// end without writing a row. Names below are fictional test data.

export type Circle = "three" | "twelve" | "seventy" | "field";
export type MeetingKind = "kitchen_table" | "coffee" | "phone" | "zoom" | "group" | "other";
export type CommitmentOwner = "me" | "them";
export type CommitmentState = "open" | "done";
export type IntakeSource = "recording" | "transcript" | "paste" | "upload" | "connected";

export type Person = {
  id: string;
  name: string;
  circle: Circle;
  role: string;
  phone: string;
  lastMetAt: string | null;
  nextStep: string | null;
  nextStepDueAt: string | null;
};

export type PrayerNeed = {
  id: string;
  personId: string | null;
  text: string;
  answered: boolean;
  raisedAt: string;
};

export type Commitment = {
  id: string;
  personId: string;
  meetingId: string | null;
  owner: CommitmentOwner;
  text: string;
  dueAt: string | null;
  state: CommitmentState;
};

export type Meeting = {
  id: string;
  personIds: string[];
  kind: MeetingKind;
  at: string;
  notes: string;
  scripture: string | null;
  topics: string[];
  outcomes: string[];
  minutes: number;
  status: "draft" | "logged" | "scheduled";
};

export type FruitItem = {
  id: string;
  personId: string;
  meetingId: string | null;
  outcome: string;
  summary: string;
  at: string;
};

export const meetingKindLabels: Record<MeetingKind, string> = {
  kitchen_table: "Kitchen Table",
  coffee: "Coffee",
  phone: "Phone",
  zoom: "Zoom",
  group: "Group",
  other: "Other",
};

export const circleLabels: Record<Circle, string> = {
  three: "My 3",
  twelve: "My 12",
  seventy: "My 70",
  field: "Field",
};

export const outcomeOptions = [
  "Salvation",
  "Baptism",
  "Started discipleship",
  "Began multiplying",
  "Church connection",
  "Prayer answered",
  "Healing",
  "Reconciliation",
];

export const nextStepOptions = [
  "Meet again",
  "Begin discipleship",
  "Send follow up",
  "Invite to group",
  "Connect to church",
  "Hand off",
  "Pray and wait",
];

// A fixed "today" keeps the prototype's relative dates stable for review.
export const prototypeToday = "2026-08-05";

function daysFromToday(offset: number) {
  const base = new Date(`${prototypeToday}T09:00:00`);
  base.setDate(base.getDate() + offset);

  return base.toISOString().slice(0, 10);
}

export const seedPeople: Person[] = [
  {
    id: "p-marcus",
    name: "Marcus Bell",
    circle: "three",
    role: "Discipling",
    phone: "555-0142",
    lastMetAt: daysFromToday(-6),
    nextStep: "Walk through Luke 15 together",
    nextStepDueAt: daysFromToday(-1),
  },
  {
    id: "p-dana",
    name: "Dana Reyes",
    circle: "three",
    role: "Discipling",
    phone: "555-0188",
    lastMetAt: daysFromToday(-2),
    nextStep: "Introduce her to the Tuesday group",
    nextStepDueAt: daysFromToday(0),
  },
  {
    id: "p-theo",
    name: "Theo Nakamura",
    circle: "twelve",
    role: "Co-laborer",
    phone: "555-0119",
    lastMetAt: daysFromToday(-11),
    nextStep: "Check in on his dad's surgery",
    nextStepDueAt: daysFromToday(0),
  },
  {
    id: "p-priya",
    name: "Priya Anand",
    circle: "twelve",
    role: "Walking with",
    phone: "555-0163",
    lastMetAt: daysFromToday(-19),
    nextStep: "Send the baptism study",
    nextStepDueAt: daysFromToday(3),
  },
  {
    id: "p-sam",
    name: "Sam Ortega",
    circle: "seventy",
    role: "Walking with",
    phone: "555-0127",
    lastMetAt: daysFromToday(-34),
    nextStep: null,
    nextStepDueAt: null,
  },
  {
    id: "p-joan",
    name: "Joan Whitfield",
    circle: "seventy",
    role: "Neighbor",
    phone: "555-0175",
    lastMetAt: daysFromToday(-41),
    nextStep: "Drop off a meal",
    nextStepDueAt: daysFromToday(6),
  },
  {
    id: "p-eli",
    name: "Eli Braun",
    circle: "field",
    role: "New contact",
    phone: "555-0198",
    lastMetAt: null,
    nextStep: null,
    nextStepDueAt: null,
  },
];

export const seedMeetings: Meeting[] = [
  {
    id: "m-1",
    personIds: ["p-marcus"],
    kind: "kitchen_table",
    at: daysFromToday(-6),
    notes:
      "Marcus opened up about his brother. He is reading John on his own now and asked what repentance actually looks like day to day.",
    scripture: "John 3",
    topics: ["Repentance", "Family"],
    outcomes: ["Started discipleship"],
    minutes: 75,
    status: "logged",
  },
  {
    id: "m-2",
    personIds: ["p-dana"],
    kind: "coffee",
    at: daysFromToday(-2),
    notes: "Dana said yes to being baptized. Wants her mom there. Nervous about telling her roommate.",
    scripture: "Acts 2",
    topics: ["Baptism"],
    outcomes: ["Baptism"],
    minutes: 50,
    status: "logged",
  },
  {
    id: "m-3",
    personIds: ["p-theo", "p-priya"],
    kind: "group",
    at: daysFromToday(-11),
    notes: "Group night. Theo led the discussion for the first time.",
    scripture: "Matthew 5",
    topics: ["Leading", "Obedience"],
    outcomes: ["Began multiplying"],
    minutes: 90,
    status: "logged",
  },
  {
    id: "m-4",
    personIds: ["p-dana"],
    kind: "coffee",
    at: daysFromToday(2),
    notes: "",
    scripture: null,
    topics: [],
    outcomes: [],
    minutes: 45,
    status: "scheduled",
  },
];

// An intentionally unfinished capture, so "resume unfinished work" is testable.
export const seedDraftMeeting: Meeting = {
  id: "m-draft",
  personIds: ["p-theo"],
  kind: "phone",
  at: daysFromToday(-1),
  notes: "Called Theo after his dad's surgery got moved up. He sounded",
  scripture: null,
  topics: [],
  outcomes: [],
  minutes: 20,
  status: "draft",
};

export const seedPrayer: PrayerNeed[] = [
  { id: "pr-1", personId: "p-theo", text: "His dad's surgery on the 12th", answered: false, raisedAt: daysFromToday(-11) },
  { id: "pr-2", personId: "p-marcus", text: "Reconciliation with his brother", answered: false, raisedAt: daysFromToday(-6) },
  { id: "pr-3", personId: "p-dana", text: "Courage to tell her roommate", answered: false, raisedAt: daysFromToday(-2) },
  { id: "pr-4", personId: "p-priya", text: "Job interview", answered: true, raisedAt: daysFromToday(-19) },
];

export const seedCommitments: Commitment[] = [
  { id: "c-1", personId: "p-marcus", meetingId: "m-1", owner: "them", text: "Read John 4-6 before we meet", dueAt: daysFromToday(-1), state: "open" },
  { id: "c-2", personId: "p-marcus", meetingId: "m-1", owner: "me", text: "Send him the repentance study", dueAt: daysFromToday(-3), state: "done" },
  { id: "c-3", personId: "p-dana", meetingId: "m-2", owner: "me", text: "Talk to the elders about a baptism date", dueAt: daysFromToday(0), state: "open" },
  { id: "c-4", personId: "p-theo", meetingId: "m-3", owner: "them", text: "Prepare Matthew 6 for next group", dueAt: daysFromToday(4), state: "open" },
];

export const seedFruit: FruitItem[] = [
  { id: "f-1", personId: "p-dana", meetingId: "m-2", outcome: "Baptism", summary: "Dana said yes to baptism.", at: daysFromToday(-2) },
  { id: "f-2", personId: "p-marcus", meetingId: "m-1", outcome: "Started discipleship", summary: "Marcus began a weekly rhythm.", at: daysFromToday(-6) },
  { id: "f-3", personId: "p-theo", meetingId: "m-3", outcome: "Began multiplying", summary: "Theo led group for the first time.", at: daysFromToday(-11) },
];

// What the AI intake step "returns" for the sample input. Every field is a
// suggestion the user must review; nothing here is written without approval.
export type IntakeSuggestion = {
  peopleMatched: Array<{ personId: string; name: string; confidence: "high" | "medium" }>;
  peopleNew: string[];
  summary: string;
  kind: MeetingKind;
  minutes: number;
  scripture: string;
  topics: string[];
  prayer: string[];
  commitments: Array<{ owner: CommitmentOwner; text: string; dueOffsetDays: number | null }>;
  nextStep: string;
  followUpOffsetDays: number;
  outcomes: string[];
  ministryActivity: Array<{ label: string; value: string }>;
};

export const sampleTranscript = `Met Marcus at the house around 7. We talked for a little over an hour.
He's been reading John on his own — got through chapter 6 this week, which he
said was the first time he's finished anything he started in a while. He asked
again about what repentance looks like when you keep failing at the same thing.

His brother Caleb came up again. They still haven't talked since March. He asked
me to keep praying about that, and said he'd reach out this week if he could work
up the nerve.

I told him I'd send him the study on repentance and that we'd walk through Luke 15
together next time. We set the next one for a week from Thursday. He also mentioned
his neighbor Rosa has been asking him questions about church.`;

export const sampleSuggestion: IntakeSuggestion = {
  peopleMatched: [{ personId: "p-marcus", name: "Marcus Bell", confidence: "high" }],
  peopleNew: ["Caleb Bell", "Rosa"],
  summary:
    "Marcus finished John 6 on his own and asked again what repentance looks like in daily failure. Still no contact with his brother Caleb since March, but he is willing to reach out this week. His neighbor Rosa is asking questions about church.",
  kind: "kitchen_table",
  minutes: 70,
  scripture: "John 6",
  topics: ["Repentance", "Family", "Perseverance"],
  prayer: ["Reconciliation with his brother Caleb", "Courage to reach out this week"],
  commitments: [
    { owner: "me", text: "Send Marcus the study on repentance", dueOffsetDays: 2 },
    { owner: "them", text: "Reach out to Caleb", dueOffsetDays: 7 },
  ],
  nextStep: "Walk through Luke 15 together",
  followUpOffsetDays: 9,
  outcomes: ["Started discipleship"],
  ministryActivity: [
    { label: "Meeting type", value: "Kitchen Table" },
    { label: "Time invested", value: "1h 10m" },
    { label: "People engaged", value: "1 known, 2 new" },
    { label: "Scripture opened", value: "Yes" },
  ],
};

export const intakeSourceLabels: Record<IntakeSource, { title: string; detail: string }> = {
  recording: { title: "Record now", detail: "Capture audio in DOS" },
  transcript: { title: "Import transcript", detail: "From any recorder or notetaker" },
  paste: { title: "Paste notes", detail: "Typed or dictated notes" },
  upload: { title: "Upload a file", detail: "Text, doc, or PDF" },
  connected: { title: "Connected source", detail: "A device or service you have linked" },
};

export function formatPrototypeDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeDayLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date(`${prototypeToday}T12:00:00`).getTime();
  const target = new Date(`${value}T12:00:00`).getTime();
  const days = Math.round((target - today) / 86_400_000);

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days === -1) {
    return "Yesterday";
  }

  return days < 0 ? `${Math.abs(days)} days ago` : `In ${days} days`;
}

export function isOverdue(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(`${value}T12:00:00`).getTime() < new Date(`${prototypeToday}T12:00:00`).getTime();
}

export function addDaysFromToday(offset: number) {
  return daysFromToday(offset);
}
