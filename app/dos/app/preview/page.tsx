import type { Metadata } from "next";
import { buildFallbackCircleDataFromActivity } from "@/src/lib/dos/circle-scoring";
import {
  type DosAppData,
  type DosAppFruit,
  type DosAppFruitEvent,
  type DosAppLeaderReflection,
  type DosAppMeeting,
  type DosAppParticipantReview,
  type DosAppPerson,
} from "@/src/lib/dos/missionary-app";
import { DosMvpAppClient } from "../DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App Preview | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const demoTimestamp = "2026-05-27T10:30:00-05:00";
const demoWorkspaceId = "00000000-0000-4000-8000-000000000070";

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

function buildDosPreviewDemoData(): DosAppData {
  const people: DosAppPerson[] = [
    {
      church: "City Chapel",
      createdAt: "2026-05-06T09:15:00-05:00",
      email: "george.jenko@example.com",
      engagementLevel: "High",
      id: "demo-person-george-jenko",
      lastActivityAt: "2026-05-27T08:15:00-05:00",
      name: "George Jenko",
      notes: "Home address: 842 North Ash Ave, Tulsa, OK 74120\nOccupation: Firefighter\nBirthday: 1989-04-11\n\nHungry for Scripture and steady in follow-through.",
      phone: "918-555-0147",
      relationshipType: "Disciple",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: "Redemption Church",
      createdAt: "2026-05-08T11:00:00-05:00",
      email: "brooke.fox@example.com",
      engagementLevel: "High",
      id: "demo-person-brooke-fox",
      lastActivityAt: "2026-05-25T18:30:00-05:00",
      name: "Brooke Fox",
      notes: "Consistent prayer partner and helps host table conversations.",
      phone: "918-555-0182",
      relationshipType: "Co-laborer",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: null,
      createdAt: "2026-05-10T14:45:00-05:00",
      email: "tim.tran@example.com",
      engagementLevel: "Medium",
      id: "demo-person-tim-tran",
      lastActivityAt: "2026-05-24T16:00:00-05:00",
      name: "Tim Tran",
      notes: "New to Bible reading. Wants a simple next step after work.",
      phone: "918-555-0121",
      relationshipType: "Coworker",
      status: "active",
      updatedAt: demoTimestamp,
    },
    {
      church: null,
      createdAt: "2026-05-12T10:10:00-05:00",
      email: "naomi.lee@example.com",
      engagementLevel: "Medium",
      id: "demo-person-naomi-lee",
      lastActivityAt: "2026-05-14T12:15:00-05:00",
      name: "Naomi Lee",
      notes: "Asked for prayer after the coffee meeting. Follow up this week.",
      phone: "918-555-0166",
      relationshipType: "Neighbor",
      status: "follow_up",
      updatedAt: demoTimestamp,
    },
    {
      church: "Grace Fellowship",
      createdAt: "2026-05-23T15:20:00-05:00",
      email: "caleb.rivera@example.com",
      engagementLevel: "Low",
      id: "demo-person-caleb-rivera",
      lastActivityAt: "2026-05-23T15:20:00-05:00",
      name: "Caleb Rivera",
      notes: "Met through George. Open to joining a kitchen table soon.",
      phone: "918-555-0194",
      relationshipType: "New contact",
      status: "new",
      updatedAt: demoTimestamp,
    },
  ];

  const meetings: DosAppMeeting[] = [
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
  ];

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

  const circles = buildFallbackCircleDataFromActivity({
    meetings: meetings.map((meeting) => ({
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
    circles,
    fruit,
    fruitEvents,
    leaderReflections,
    meetings,
    participantReviews,
    participantTestimonies: [],
    people,
    stats: {
      approvedFruit: fruit.filter((item) => item.status === "approved").length,
      connectionsCount: meetings.filter((meeting) => meeting.source === "connection").length,
      fruitCount: fruit.length,
      meetingsCount: meetings.length,
      peopleCount: people.length,
    },
    workspace: {
      displayName: "Ryan & Brooke Fox",
      id: demoWorkspaceId,
      isPreview: true,
      isUsamWorkspace: true,
      profileImageUrl: null,
      publicProfileHref: "/missionaries/ryan-brooke-fox",
      shortMission: "DOS blue mobile demo preview.",
      slug: "dos-preview",
    },
  };
}

export default async function DosAppPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  await searchParams;

  return <DosMvpAppClient data={buildDosPreviewDemoData()} />;
}
