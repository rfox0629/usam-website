import type {
  ProtoAccountabilityCheckIn,
  ProtoAccountabilityTopic,
  ProtoFruit,
  ProtoGroup,
  ProtoJourneyAssignment,
  ProtoMeeting,
  ProtoNextStep,
  ProtoPerson,
  ProtoPrayer,
} from "./types";

/**
 * PROTOTYPE NOTES - mocked vs. backed by current architecture
 * ------------------------------------------------------------
 * Backed by real DOS architecture (this prototype uses the same concepts,
 * just simplified copy/IA - see src/lib/dos/missionary-app.ts):
 *   - Person, Meeting, Accountability schedule/check-in, Journey/resource
 *     assignment (context: direct vs. group, per USA-155), Group + gatherings,
 *     Prayer requests.
 *
 * Mocked / assumed for this click-through only - needs product + architecture
 * confirmation before real implementation:
 *   - "Next step / Follow-up" as a distinct object. Production currently
 *     represents this as commitments / growth-reflection follow-up fields.
 *     This prototype treats it as its own lightweight concept per the issue's
 *     terminology cleanup request.
 *   - The 3/12/70/120 sphere placement shown here is a fixed label on the
 *     fixture person, not the real weighted circle-scoring engine in
 *     src/lib/dos/circle-scoring.ts (discipleship progress / fruit / meeting
 *     frequency / momentum / multiplication / time invested). The report
 *     screen calls this out inline.
 *   - Per-person "total time invested" and "engagement score" trend are
 *     derived from fixture meeting durations only, not a production formula.
 */

const now = "2026-08-13T09:00:00-05:00";

export const CURRENT_WORKSPACE_NAME = "Ryan Fox";

export const people: ProtoPerson[] = [
  {
    id: "brooke-fox",
    firstName: "Brooke",
    lastName: "Fox",
    phone: "612-555-0110",
    email: "brooke.fox@example.com",
    howKnown: "Family and ministry partner",
    relationshipLabel: "Closest partner",
    engagementLevel: 3,
    church: "Grace Fellowship",
    occupation: "Ministry operations",
    spouseName: "Ryan Fox",
    childrenNames: null,
    birthday: "1991-02-17",
    anniversary: "2013-10-12",
    address: "9745 Oak Shore Dr, Lakeville, MN 55044",
    householdNotes: "Primary prayer and discernment partner.",
    sphere: "three",
    createdAt: "2026-01-04T10:00:00-05:00",
  },
  {
    id: "lyf-nimmo",
    firstName: "Lyf",
    lastName: "Nimmo",
    phone: "612-555-0148",
    email: "lyf.nimmo@example.com",
    howKnown: "Met through Wednesday Men's Group",
    relationshipLabel: "Discipling",
    engagementLevel: 2,
    church: "Grace Fellowship",
    occupation: "Electrician",
    spouseName: "Tammie Nimmo",
    childrenNames: "Wren, Silas",
    birthday: "1990-03-02",
    anniversary: "2014-06-21",
    address: "418 Birchwood Ln, Eagan, MN 55123",
    householdNotes: "Tammie works nights Thursdays - mornings are easiest for follow-up.",
    sphere: "twelve",
    createdAt: "2026-04-02T10:00:00-05:00",
  },
  {
    id: "marcus-webb",
    firstName: "Marcus",
    lastName: "Webb",
    phone: "612-555-0173",
    email: "marcus.webb@example.com",
    howKnown: "Wednesday Men's Group",
    relationshipLabel: "Walking with",
    engagementLevel: 1,
    church: null,
    occupation: "Warehouse supervisor",
    spouseName: null,
    childrenNames: null,
    birthday: null,
    anniversary: null,
    address: null,
    householdNotes: null,
    sphere: "seventy",
    createdAt: "2026-06-11T10:00:00-05:00",
  },
  {
    id: "caleb-rivera",
    firstName: "Caleb",
    lastName: "Rivera",
    phone: "612-555-0194",
    email: "caleb.rivera@example.com",
    howKnown: "Met through Lyf after group",
    relationshipLabel: "New contact",
    engagementLevel: 0,
    church: null,
    occupation: "Mechanic",
    spouseName: null,
    childrenNames: null,
    birthday: null,
    anniversary: null,
    address: null,
    householdNotes: null,
    sphere: "onetwenty",
    createdAt: "2026-08-09T10:00:00-05:00",
  },
];

export const meetings: ProtoMeeting[] = [
  {
    id: "meeting-lyf-past-1",
    personIds: ["lyf-nimmo"],
    status: "logged",
    scheduledAt: "2026-07-30T07:00:00-05:00",
    durationMinutes: 45,
    calendarSynced: true,
    context: "Coffee",
    notes:
      "Walked through 1 Corinthians 13 together. Lyf opened up about feeling behind on Quiet Time With God since the new work schedule started. Prayed for wisdom with the night shift. He's still solid in the New Testament reading plan.",
    loggedAt: "2026-07-30T08:00:00-05:00",
  },
  {
    id: "meeting-lyf-past-2",
    personIds: ["lyf-nimmo"],
    status: "logged",
    scheduledAt: "2026-07-16T07:00:00-05:00",
    durationMinutes: 40,
    calendarSynced: true,
    context: "Coffee",
    notes: "Caught up after two weeks off. Encouraged him to keep leading family devotions with Tammie.",
    loggedAt: "2026-07-16T08:00:00-05:00",
  },
  {
    id: "meeting-marcus-past-1",
    personIds: ["marcus-webb"],
    status: "logged",
    scheduledAt: "2026-08-05T18:00:00-05:00",
    durationMinutes: 30,
    calendarSynced: false,
    context: "Wednesday Men's Group follow-up",
    notes: "Quick conversation after group. Marcus asked good questions about the Discipleship study.",
    loggedAt: "2026-08-05T18:45:00-05:00",
  },
  {
    id: "meeting-brooke-past-1",
    personIds: ["brooke-fox"],
    status: "logged",
    scheduledAt: "2026-08-11T20:00:00-05:00",
    durationMinutes: 50,
    calendarSynced: true,
    context: "Prayer",
    notes: "Prayed through the week, group launch details, and people needing direct follow-up.",
    loggedAt: "2026-08-11T21:00:00-05:00",
  },
];

export const accountabilityTopics: ProtoAccountabilityTopic[] = [
  {
    id: "acct-lyf-qt",
    personId: "lyf-nimmo",
    topic: "Quiet Time With God",
    cadence: "Weekly",
    status: "struggling",
    lastCheckInAt: "2026-08-06T09:00:00-05:00",
    createdAt: "2026-04-09T09:00:00-05:00",
  },
];

export const accountabilityCheckIns: ProtoAccountabilityCheckIn[] = [
  {
    id: "checkin-lyf-qt-1",
    topicId: "acct-lyf-qt",
    personId: "lyf-nimmo",
    outcome: "struggling",
    note: "New work schedule is making mornings hard. Going to try switching to lunch break.",
    meetingId: null,
    createdAt: "2026-08-06T09:00:00-05:00",
  },
  {
    id: "checkin-lyf-qt-0",
    topicId: "acct-lyf-qt",
    personId: "lyf-nimmo",
    outcome: "going_well",
    note: "Steady every morning before work.",
    meetingId: "meeting-lyf-past-2",
    createdAt: "2026-07-16T08:00:00-05:00",
  },
];

export const journeyAssignments: ProtoJourneyAssignment[] = [
  {
    id: "journey-lyf-nt14",
    personId: "lyf-nimmo",
    resourceTitle: "14 Days Through the New Testament",
    resourceType: "Reading Plan",
    unitLabel: "Day",
    totalUnits: 14,
    completedUnits: 6,
    context: "direct",
    groupId: null,
    status: "in_progress",
    startedAt: "2026-07-20T09:00:00-05:00",
    lastActivityAt: "2026-08-10T07:20:00-05:00",
  },
  {
    id: "journey-lyf-discipleship",
    personId: "lyf-nimmo",
    resourceTitle: "Discipleship",
    resourceType: "Book Study",
    unitLabel: "Week",
    totalUnits: 6,
    completedUnits: 1,
    context: "group",
    groupId: "group-wednesday-mens",
    status: "in_progress",
    startedAt: "2026-08-05T18:00:00-05:00",
    lastActivityAt: "2026-08-05T18:00:00-05:00",
  },
  {
    id: "journey-marcus-discipleship",
    personId: "marcus-webb",
    resourceTitle: "Discipleship",
    resourceType: "Book Study",
    unitLabel: "Week",
    totalUnits: 6,
    completedUnits: 1,
    context: "group",
    groupId: "group-wednesday-mens",
    status: "in_progress",
    startedAt: "2026-08-05T18:00:00-05:00",
    lastActivityAt: "2026-08-05T18:00:00-05:00",
  },
];

export const prayers: ProtoPrayer[] = [
  {
    id: "prayer-brooke-launch",
    personId: "brooke-fox",
    request: "Clarity and peace around the next DOS launch decisions.",
    status: "active",
    createdAt: "2026-08-11T21:00:00-05:00",
    answeredAt: null,
    answerNote: null,
  },
  {
    id: "prayer-lyf-nightshift",
    personId: "lyf-nimmo",
    request: "Peace and rhythm as the family adjusts to Tammie's night shifts.",
    status: "active",
    createdAt: "2026-07-30T08:00:00-05:00",
    answeredAt: null,
    answerNote: null,
  },
];

export const nextSteps: ProtoNextStep[] = [
  {
    id: "nextstep-caleb-invite",
    personId: "caleb-rivera",
    description: "Invite Caleb to coffee and hear more of his story.",
    dueAt: "2026-08-18T09:00:00-05:00",
    status: "open",
    createdAt: "2026-08-09T10:00:00-05:00",
    completedAt: null,
    meetingId: null,
  },
  {
    id: "nextstep-lyf-morning",
    personId: "lyf-nimmo",
    description: "Text Lyf midweek to see how the lunch-break Quiet Time is going.",
    dueAt: "2026-08-14T09:00:00-05:00",
    status: "open",
    createdAt: "2026-08-06T09:00:00-05:00",
    completedAt: null,
    meetingId: null,
  },
];

export const fruit: ProtoFruit[] = [
  {
    id: "fruit-lyf-family",
    personId: "lyf-nimmo",
    summary: "Started leading a short family devotion with Tammie and the kids twice a week.",
    createdAt: "2026-07-16T08:00:00-05:00",
  },
];

export const groups: ProtoGroup[] = [
  {
    id: "group-wednesday-mens",
    name: "Wednesday Men's Group",
    rhythmLabel: "Weekly - Wednesday - 6:00 PM",
    memberPersonIds: ["lyf-nimmo", "marcus-webb"],
    gatherings: [
      {
        id: "gathering-wed-aug5",
        title: "Wednesday Men's Group",
        startsAt: "2026-08-05T18:00:00-05:00",
        status: "completed",
        attendedPersonIds: ["lyf-nimmo", "marcus-webb"],
      },
      {
        id: "gathering-wed-aug12",
        title: "Wednesday Men's Group",
        startsAt: "2026-08-12T18:00:00-05:00",
        status: "completed",
        attendedPersonIds: ["marcus-webb"],
      },
      {
        id: "gathering-wed-aug19",
        title: "Wednesday Men's Group",
        startsAt: "2026-08-19T18:00:00-05:00",
        status: "scheduled",
        attendedPersonIds: [],
      },
    ],
  },
  {
    id: "group-2three2",
    name: "2THREE2 Running Group",
    rhythmLabel: "Weekly - Saturday - 7:00 AM",
    memberPersonIds: ["lyf-nimmo"],
    gatherings: [
      {
        id: "gathering-2three2-aug8",
        title: "Saturday Run & Prayer",
        startsAt: "2026-08-08T07:00:00-05:00",
        status: "completed",
        attendedPersonIds: ["lyf-nimmo"],
      },
    ],
  },
];

export const NOW_ISO = now;
