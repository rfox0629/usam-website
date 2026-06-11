import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildFallbackCircleDataFromActivity } from "@/src/lib/dos/circle-scoring";
import {
  type DosAppData,
  type DosAppFruit,
  type DosAppFruitEvent,
  type DosAppLeaderReflection,
  type DosAppMeeting,
  type DosAppParticipantReview,
  type DosAppPerson,
  type DosAppRelationshipReminder,
} from "@/src/lib/dos/missionary-app";
import { normalizeRelationshipType, relationshipModelCounts } from "@/src/lib/dos/relationship-model";
import { DosMobileMessageScreen } from "../DosMobileMessageScreen";
import { DosMvpAppClient } from "../DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

// Optional smoke-test route only. The live `/dos/[slug]` workspace is the
// primary DOS testing and demo surface; keep this data synthetic and keep UI
// changes in the shared DosMvpAppClient.
const demoTimestamp = "2026-05-27T10:30:00-05:00";
const demoWorkspaceId = "00000000-0000-4000-8000-000000000070";
const demoAccessToken = process.env.DOS_PREVIEW_TOKEN?.trim() || "dos2026";
type DemoMeetingInput = Omit<DosAppMeeting, "googleSyncEnabled" | "googleSyncStatus" | "meetingStatus" | "scheduledEndAt" | "scheduledStartAt" | "timezone">
  & Partial<Pick<DosAppMeeting, "googleSyncEnabled" | "googleSyncStatus" | "meetingStatus" | "scheduledEndAt" | "scheduledStartAt" | "timezone">>;

function LockedPreviewScreen() {
  return (
    <DosMobileMessageScreen eyebrow="DOS Preview" title="Enter demo access code.">
      <form action="/dos/app/preview" className="space-y-3" method="get">
        <label className="block">
          <span className="text-xs font-semibold text-[#64748B]">Access code</span>
          <input
            autoComplete="off"
            className="mt-2 min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 text-sm font-medium text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
            name="demo"
            placeholder="Enter code"
            type="password"
          />
        </label>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          type="submit"
        >
          Open Preview
        </button>
      </form>
    </DosMobileMessageScreen>
  );
}

function buildDemoReview(status: DosAppMeeting["review"]["status"] = "not_sent", stoodOut: string | null = null): DosAppMeeting["review"] {
  return {
    sharePermission: status === "approved" ? "internal" : null,
    status,
    stoodOut,
    submittedAt: status === "not_sent" ? null : demoTimestamp,
    submittedName: status === "not_sent" ? null : "Ryan Fox",
    token: null,
  };
}

function buildDemoMeeting(meeting: DemoMeetingInput): DosAppMeeting {
  return {
    googleSyncEnabled: false,
    googleSyncStatus: null,
    meetingStatus: "logged",
    scheduledEndAt: null,
    scheduledStartAt: null,
    timezone: "America/Chicago",
    ...meeting,
  };
}

function buildDosPreviewDemoData(): DosAppData {
  const people: DosAppPerson[] = [
    {
      church: "City Chapel",
      createdAt: "2026-05-06T09:15:00-05:00",
      email: "george.jenko@example.com",
      discipleshipStage: "disciple_maker",
      engagementLevel: "High",
      spouseName: "Mara Jenko",
      childrenNames: "Liam, Nora",
      householdNotes: "Friday evenings are best for family follow-up.",
      id: "demo-person-george-jenko",
      lastActivityAt: "2026-05-27T08:15:00-05:00",
      name: "George Jenko",
      notes: "Home address: 842 North Ash Ave, Tulsa, OK 74120\nOccupation: Firefighter\nBirthday: 1989-04-11\n\nHungry for Scripture and steady in follow-through.",
      phone: "918-555-0147",
      relationshipContext: "church",
      relationshipType: "Disciple",
      roleInMyLife: "discipling_them",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: "Redemption Church",
      createdAt: "2026-05-08T11:00:00-05:00",
      email: "brooke.fox@example.com",
      discipleshipStage: "walking_with",
      engagementLevel: "High",
      id: "demo-person-brooke-fox",
      lastActivityAt: "2026-05-25T18:30:00-05:00",
      name: "Brooke Fox",
      notes: "Consistent prayer partner and helps host table conversations.",
      phone: "918-555-0182",
      relationshipContext: "family",
      relationshipType: "Co-laborer",
      roleInMyLife: "peer_encouragement",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: null,
      createdAt: "2026-05-10T14:45:00-05:00",
      email: "tim.tran@example.com",
      discipleshipStage: "exploring",
      engagementLevel: "Medium",
      id: "demo-person-tim-tran",
      lastActivityAt: "2026-05-24T16:00:00-05:00",
      name: "Tim Tran",
      notes: "New to Bible reading. Wants a simple next step after work.",
      phone: "918-555-0121",
      relationshipContext: "work",
      relationshipType: "Coworker",
      roleInMyLife: "walking_with_them",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: null,
      createdAt: "2026-05-12T10:10:00-05:00",
      email: "naomi.lee@example.com",
      discipleshipStage: "exploring",
      engagementLevel: "Medium",
      id: "demo-person-naomi-lee",
      lastActivityAt: "2026-05-14T12:15:00-05:00",
      name: "Naomi Lee",
      notes: "Asked for prayer after the coffee meeting. Follow up this week.",
      phone: "918-555-0166",
      relationshipContext: "community",
      relationshipType: "Neighbor",
      roleInMyLife: "walking_with_them",
      status: "follow_up",
      updatedAt: demoTimestamp,
    },
    {
      church: "Grace Fellowship",
      createdAt: "2026-05-23T15:20:00-05:00",
      email: "caleb.rivera@example.com",
      discipleshipStage: "not_started",
      engagementLevel: "Low",
      id: "demo-person-caleb-rivera",
      lastActivityAt: "2026-05-23T15:20:00-05:00",
      name: "Caleb Rivera",
      notes: "Met through George. Open to joining a kitchen table soon.",
      phone: "918-555-0194",
      relationshipContext: "outreach",
      relationshipType: "New contact",
      roleInMyLife: "not_active",
      status: "new",
      updatedAt: demoTimestamp,
    },
  ];

  const meetingInputs = [
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-06-02T18:00:00-05:00",
      fieldPersonIds: ["demo-person-naomi-lee"],
      googleSyncEnabled: true,
      googleSyncStatus: "pending",
      id: "demo-meeting-naomi-scheduled",
      meetingStatus: "scheduled",
      notes: "Bring the John reading plan and ask about her family prayer request.",
      participantNames: ["Naomi Lee"],
      recommendedResources: [],
      review: buildDemoReview(),
      scheduledEndAt: "2026-06-02T19:00:00-05:00",
      scheduledStartAt: "2026-06-02T18:00:00-05:00",
      source: "table",
      timezone: "America/Chicago",
      title: "Coffee",
      type: "coffee",
      updatedAt: "2026-05-30T10:00:00-05:00",
    },
    {
      conversationFlowKey: "kitchen_table_gospel",
      conversationResponses: {
        attendChurchOften: "yes",
        baptized: "yes",
        believeJesus: "yes",
        bibleDaily: "yes",
        disciplingAnyone: "yes",
        honorSabbath: "unsure",
        prayFastOften: "yes",
        preachGoodNews: "yes",
        spiritualGifts: "unsure",
        tithe: "yes",
      },
      date: "2026-05-27T08:15:00-05:00",
      fieldPersonIds: ["demo-person-george-jenko"],
      id: "demo-meeting-george-scripture",
      notes: "Read Luke 10 together and talked through who George is praying for this week.",
      participantNames: ["George Jenko"],
      recommendedResources: [
        { id: "discipleship", reason: "George wants a repeatable framework for new believers.", status: "queued", title: "Discipleship", type: "resource" },
      ],
      review: buildDemoReview("approved", "George is beginning to think beyond his own growth and name people he can disciple."),
      source: "table",
      title: "Morning Scripture",
      type: "discipleship",
      updatedAt: "2026-05-27T09:00:00-05:00",
    },
    {
      conversationFlowKey: "four_questions",
      conversationResponses: {
        conversation_notes: "Brooke helped guide the conversation and Tim stayed engaged.",
        needs_outside_help: "yes",
        recognizes_problem: "yes",
        response_notes: "Tim resonated with needing help outside himself.",
        willing_to_follow_through: "unsure",
        willing_to_receive_help: "yes",
      },
      date: "2026-05-25T18:30:00-05:00",
      fieldPersonIds: ["demo-person-george-jenko", "demo-person-brooke-fox", "demo-person-tim-tran"],
      id: "demo-meeting-table-george-brooke-tim",
      notes: "Kitchen table night. Tim asked honest questions and George shared part of his story.",
      participantNames: ["George Jenko", "Brooke Fox", "Tim Tran"],
      recommendedResources: [
        { id: "attending-church", reason: "Tim wants a next conversation about following Jesus.", status: "queued", title: "Attending Church", type: "resource" },
      ],
      review: buildDemoReview("submitted", "Tim is open and Brooke is helping create a warm space for follow up."),
      source: "table",
      title: "Kitchen Table",
      type: "kitchen_table",
      updatedAt: "2026-05-25T20:00:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-24T16:00:00-05:00",
      fieldPersonIds: ["demo-person-tim-tran"],
      id: "demo-meeting-tim-coffee",
      notes: "Coffee after work. Tim wants to start reading John and asked for prayer for courage.",
      participantNames: ["Tim Tran"],
      recommendedResources: [],
      review: buildDemoReview(),
      source: "table",
      title: "Coffee",
      type: "coffee",
      updatedAt: "2026-05-24T17:10:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-23T15:20:00-05:00",
      fieldPersonIds: ["demo-person-caleb-rivera"],
      id: "demo-meeting-caleb-intro",
      notes: "Met Caleb through George. He is curious and open to joining next month's table.",
      participantNames: ["Caleb Rivera"],
      recommendedResources: [],
      review: buildDemoReview(),
      source: "table",
      title: "Intro Coffee",
      type: "coffee",
      updatedAt: "2026-05-23T16:00:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-22T12:00:00-05:00",
      fieldPersonIds: ["demo-person-brooke-fox"],
      id: "demo-meeting-brooke-prayer",
      notes: "Prayed over the upcoming table and named two people to invite.",
      participantNames: ["Brooke Fox"],
      recommendedResources: [],
      review: buildDemoReview(),
      source: "connection",
      title: "Prayer Check-In",
      type: "prayer",
      updatedAt: "2026-05-22T12:30:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-21T07:30:00-05:00",
      fieldPersonIds: ["demo-person-george-jenko"],
      id: "demo-meeting-george-coffee",
      notes: "Followed up on baptism and daily prayer rhythms.",
      participantNames: ["George Jenko"],
      recommendedResources: [],
      review: buildDemoReview(),
      source: "table",
      title: "Coffee",
      type: "coffee",
      updatedAt: "2026-05-21T08:10:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-19T19:00:00-05:00",
      fieldPersonIds: ["demo-person-george-jenko", "demo-person-brooke-fox"],
      id: "demo-meeting-george-brooke-discipleship",
      notes: "Practiced sharing the gospel simply and prayed for George's brother.",
      participantNames: ["George Jenko", "Brooke Fox"],
      recommendedResources: [],
      review: buildDemoReview("approved", "George is growing in confidence and Brooke is actively investing."),
      source: "table",
      title: "Discipleship Practice",
      type: "discipleship",
      updatedAt: "2026-05-19T20:10:00-05:00",
    },
    {
      conversationFlowKey: "none",
      conversationResponses: {},
      date: "2026-05-14T12:15:00-05:00",
      fieldPersonIds: ["demo-person-naomi-lee"],
      id: "demo-meeting-naomi-coffee",
      notes: "Naomi shared about family pressure and asked for prayer. Follow up is needed.",
      participantNames: ["Naomi Lee"],
      recommendedResources: [],
      review: buildDemoReview(),
      source: "table",
      title: "Coffee",
      type: "coffee",
      updatedAt: "2026-05-14T13:00:00-05:00",
    },
  ] satisfies DemoMeetingInput[];
  const meetings = meetingInputs.map(buildDemoMeeting);

  const fruit: DosAppFruit[] = [
    {
      fieldPersonId: "demo-person-george-jenko",
      id: "demo-fruit-george-discipling",
      outcomeTags: ["Joined Discipleship", "Started Discipling Others"],
      permissionToShare: true,
      sourceApp: "dos_preview",
      status: "approved",
      submittedByName: "Ryan Fox",
      summary: "George named two people he wants to begin discipling and committed to meeting weekly.",
      tableId: "demo-meeting-george-scripture",
      testimonyDate: "2026-05-27T09:00:00-05:00",
      updatedAt: demoTimestamp,
    },
  ];

  const fruitEvents: DosAppFruitEvent[] = [
    {
      confidenceLevel: "verified",
      date: "2026-05-27T09:00:00-05:00",
      debugContext: {},
      description: "George is preparing to disciple his brother and a coworker.",
      fruitType: "Started Discipling Others",
      generatedBy: "DOS Preview",
      generationKey: "demo-george-multiplication",
      id: "demo-fruit-event-george-multiplication",
      meetingId: "demo-meeting-george-scripture",
      personId: "demo-person-george-jenko",
      sourceId: "demo-reflection-george-scripture",
      sourceType: "leader_reflection",
      status: "approved",
      title: "George began multiplying",
      visibility: "internal",
    },
  ];

  const leaderReflections: DosAppLeaderReflection[] = [
    {
      createdAt: "2026-05-27T09:00:00-05:00",
      followUpNeeded: false,
      id: "demo-reflection-george-scripture",
      meetingId: "demo-meeting-george-scripture",
      nextStep: "Begin discipleship",
      observedFruit: ["Started Discipling Others"],
      personId: "demo-person-george-jenko",
      prayerNeeds: "Pray for courage as George invites his brother into a weekly rhythm.",
      privateNotes: "Keep George close this week and help him prepare his first conversation.",
      spiritualOpenness: "Actively following",
      whatHappened: "George moved from receiving discipleship to naming people he can invest in.",
    },
    {
      createdAt: "2026-05-14T13:00:00-05:00",
      followUpNeeded: true,
      id: "demo-reflection-naomi-follow-up",
      meetingId: "demo-meeting-naomi-coffee",
      nextStep: "Send follow up",
      observedFruit: ["Prayer Request"],
      personId: "demo-person-naomi-lee",
      prayerNeeds: "Naomi asked for peace and wisdom with her family.",
      privateNotes: "Send a text and invite Naomi to coffee again.",
      spiritualOpenness: "Open",
      whatHappened: "Naomi was honest and receptive, but needs a gentle follow up.",
    },
  ];

  const participantReviews: DosAppParticipantReview[] = [
    {
      comments: "I felt cared for and want to keep meeting.",
      conversationHelpful: "yes",
      feltCaredFor: "yes",
      feltHeard: "yes",
      id: "demo-participant-review-tim",
      meetingId: "demo-meeting-table-george-brooke-tim",
      personId: "demo-person-tim-tran",
      status: "approved",
      submittedAt: "2026-05-25T21:10:00-05:00",
      wouldMeetAgain: true,
    },
  ];
  const reminders: DosAppRelationshipReminder[] = [
    {
      googleSyncEnabled: true,
      googleSyncStatus: "pending",
      id: "demo-reminder-george-birthday",
      notes: "Send a note in the morning.",
      personId: "demo-person-george-jenko",
      recurrence: "yearly",
      reminderDate: "2026-06-11T12:00:00-05:00",
      reminderType: "birthday",
      title: null,
      updatedAt: demoTimestamp,
    },
    {
      googleSyncEnabled: false,
      googleSyncStatus: null,
      id: "demo-reminder-naomi-follow-up",
      notes: "Ask how the prayer request is going.",
      personId: "demo-person-naomi-lee",
      recurrence: "none",
      reminderDate: "2026-06-03T12:00:00-05:00",
      reminderType: "follow_up",
      title: "Family follow-up",
      updatedAt: demoTimestamp,
    },
  ];

  const circles = buildFallbackCircleDataFromActivity({
    meetings: meetings.filter((meeting) => meeting.meetingStatus === "logged").map((meeting) => ({
      date: meeting.date,
      fieldPersonIds: meeting.fieldPersonIds,
    })),
    people: people.map((person) => ({
      engagementLevel: person.engagementLevel,
      id: person.id,
      lastActivityAt: person.lastActivityAt,
      name: person.name,
      relationshipType: person.relationshipType,
      status: person.status,
    })),
    workspaceId: demoWorkspaceId,
  });

  return {
    calendarConnection: {
      calendarId: "primary",
      connected: true,
      connectedAt: demoTimestamp,
      googleAccountEmail: "ryan@example.com",
      googleConfigured: true,
      lastSyncedAt: demoTimestamp,
    },
    circles,
    externalCalendarEvents: [],
    fruit,
    fruitEvents,
    leaderReflections,
    meetings,
    organizations: [
      {
        id: "independent",
        name: "Independent DOS",
        profileStatus: null,
        publicProfileHref: null,
        publicProfileLive: false,
        slug: null,
        status: "active",
        type: "independent",
      },
      {
        id: "demo-usam-organization",
        name: "USA Missionaries",
        profileStatus: "published",
        publicProfileHref: "/missionaries/ryan-brooke-fox",
        publicProfileLive: true,
        slug: "usa-missionaries",
        status: "active",
        type: "usam",
      },
      {
        id: "river-valley-church",
        name: "River Valley Church",
        profileStatus: null,
        publicProfileHref: null,
        publicProfileLive: false,
        slug: "river-valley-church",
        status: "active",
        type: "church",
      },
    ],
    participantReviews,
    participantTestimonies: [],
    people,
    prayerLogs: [],
    reminders,
    usamApplication: {
      applicationId: "demo-usam-application",
      appliedAt: demoTimestamp,
      assignedAdminEmail: "admin@usamissionaries.org",
      organizationId: "demo-usam-organization",
      organizationName: "USA Missionaries",
      profileStatus: "published",
      publicProfileHref: "/missionaries/ryan-brooke-fox",
      publicProfileLive: true,
      reviewedAt: demoTimestamp,
      status: "active",
    },
    stats: {
      approvedFruit: fruit.filter((item) => item.status === "approved").length,
      connectionsCount: meetings.filter((meeting) => meeting.source === "connection").length,
      fruitCount: fruit.length,
      meetingsCount: meetings.filter((meeting) => meeting.meetingStatus === "logged").length,
      peopleCount: people.length,
      relationshipStewardship: relationshipModelCounts(people.map((person) => ({
        discipleshipStage: person.discipleshipStage,
        relationshipContext: person.relationshipContext,
        relationshipType: normalizeRelationshipType(person.relationshipType, person.roleInMyLife, person.status),
        roleInMyLife: person.roleInMyLife,
      }))),
    },
    workspace: {
      displayName: "Fox Family",
      greetingName: "Ryan",
      id: demoWorkspaceId,
      isPreview: true,
      isUsamWorkspace: true,
      organizationName: "USA Missionaries",
      profileImageUrl: null,
      publicProfileHref: "/missionaries/ryan-brooke-fox",
      shortMission: "DOS blue mobile demo preview.",
      slug: "dos-preview",
      stateName: "Minnesota",
      userEmail: "ryan@foxfamily.org",
      userFullName: "Ryan Fox",
      userPhone: "(555) 013-1420",
    },
  };
}

export default async function DosAppPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; workspace?: string }>;
}) {
  redirect("/dos");

  const params = await searchParams;

  if (params.demo !== demoAccessToken) {
    return <LockedPreviewScreen />;
  }

  return <DosMvpAppClient data={buildDosPreviewDemoData()} />;
}
