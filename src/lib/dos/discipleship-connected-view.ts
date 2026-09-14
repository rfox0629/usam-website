/* USA-275 — the read-only connected view.
 *
 * What an authorized upstream viewer receives about a downstream workspace:
 * its existing and future DOS information, by category (People and notes,
 * meetings, prayer, accountability, Journeys, groups and attendance, Fruit,
 * feedback, and the connected account's own discipleship meetings), each
 * attributed to the workspace it belongs to.
 *
 * Built from the canonical `DosAppData` so new records appear without a
 * second loader. It deliberately omits what is not DOS ministry history or
 * belongs to third parties: contact details (email, phone, addresses),
 * review-link tokens, submitters' email and names, leader reflections'
 * private notes, calendar connections and events, scheduling links and
 * bookings, prayer partners, organization and application records, feature
 * flags and circle placements. Nothing here can be written back.
 *
 * Leaf module (type imports only), so the regression runs it directly. */

import type { DosAppData } from "./missionary-app";

export type DosConnectedPerson = {
  id: string;
  name: string;
  notes: string | null;
  relationshipTypeValue: string;
  roleInMyLife: string;
  status: string;
};

export type DosConnectedMeeting = {
  conversationFlowKey: string;
  date: string | null;
  id: string;
  meetingStatus: "canceled" | "logged" | "scheduled";
  minutes: number | null;
  notes: string | null;
  personIds: string[];
  prayerNeeds: string | null;
  source: "connection" | "table";
  tableRole: string;
  tableRoleRecorded: boolean;
  type: string;
  whatHappened: string | null;
};

export type DosConnectedPrayer = {
  answeredAt: string | null;
  createdAt: string;
  id: string;
  personIds: string[];
  request: string;
  status: string;
  title: string;
};

export type DosConnectedAccountability = {
  date: string | null;
  detail: string | null;
  id: string;
  kind: "commitment" | "schedule" | "check_in";
  minutes: number | null;
  personId: string;
  status: string;
  title: string;
};

export type DosConnectedJourney = {
  completedAt: string | null;
  id: string;
  personId: string;
  resourceSlug: string;
  startDate: string;
  status: string;
};

export type DosConnectedGroup = {
  gatherings: Array<{ date: string; id: string; presentPersonIds: string[]; status: string; title: string }>;
  id: string;
  memberPersonIds: string[];
  name: string;
};

export type DosConnectedFruit = {
  date: string | null;
  description: string | null;
  fruitType: string;
  id: string;
  meetingId: string | null;
  personId: string | null;
  title: string | null;
};

export type DosConnectedFeedback = {
  comments: string | null;
  id: string;
  meetingId: string;
  overallRating: string | null;
  personId: string | null;
  submittedAt: string | null;
  wantsFollowUp: string | null;
};

export type DosConnectedDiscipleshipMeeting = {
  date: string;
  discussed: string | null;
  id: string;
  mentorName: string;
  minutes: number | null;
};

export type DosConnectedWorkspaceView = {
  accountability: DosConnectedAccountability[];
  /* How many connections lie between the viewer and this workspace. */
  depth: number;
  discipleshipMeetings: DosConnectedDiscipleshipMeeting[];
  feedback: DosConnectedFeedback[];
  fruit: DosConnectedFruit[];
  groups: DosConnectedGroup[];
  journeys: DosConnectedJourney[];
  meetings: DosConnectedMeeting[];
  /* The name the viewer knows this account by (their Person record). */
  ownerName: string;
  people: DosConnectedPerson[];
  prayer: DosConnectedPrayer[];
  readOnly: true;
  workspaceId: string;
};

function loggedMinutes(start: string | null, end: string | null) {
  if (!start || !end) {
    return null;
  }

  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

const byNewest = <T,>(date: (item: T) => string | null) => (first: T, second: T) => (date(second) ?? "").localeCompare(date(first) ?? "");

export function dosConnectedWorkspaceViewFromAppData(
  data: DosAppData,
  { depth, ownerName, workspaceId }: { depth: number; ownerName: string; workspaceId: string },
): DosConnectedWorkspaceView {
  const reflectionsByMeeting = new Map(data.leaderReflections.map((reflection) => [reflection.meetingId, reflection]));

  return {
    accountability: [
      ...data.commitments.map((commitment): DosConnectedAccountability => ({
        date: commitment.completedDate ?? commitment.assignedDate,
        detail: commitment.description,
        id: commitment.id,
        kind: "commitment",
        minutes: null,
        personId: commitment.personId,
        status: commitment.status,
        title: commitment.title,
      })),
      ...data.accountabilitySchedules.map((schedule): DosConnectedAccountability => ({
        date: schedule.nextCheckIn,
        detail: schedule.frequency,
        id: schedule.id,
        kind: "schedule",
        minutes: null,
        personId: schedule.personId,
        status: schedule.status,
        title: schedule.title,
      })),
      ...data.accountabilityCheckIns.map((checkIn): DosConnectedAccountability => ({
        date: checkIn.checkInDate,
        detail: checkIn.generalUpdate || null,
        id: checkIn.id,
        kind: "check_in",
        minutes: checkIn.durationMinutes,
        personId: checkIn.personId,
        status: "logged",
        title: "Check-in",
      })),
    ].sort(byNewest((item) => item.date)),
    depth,
    discipleshipMeetings: data.myRecord.mentorMeetings
      .map((meeting) => ({
        date: meeting.meetingDate,
        discussed: meeting.discussed,
        id: meeting.id,
        mentorName: meeting.mentorName,
        minutes: meeting.durationMinutes > 0 ? meeting.durationMinutes : null,
      }))
      .sort(byNewest((item) => item.date)),
    feedback: data.participantReviews
      .filter((review) => review.status !== "hidden" && review.status !== "draft")
      .map((review) => ({
        comments: review.comments,
        id: review.id,
        meetingId: review.meetingId,
        overallRating: review.overallRating,
        personId: review.personId,
        submittedAt: review.submittedAt,
        wantsFollowUp: review.wantsFollowUp,
      }))
      .sort(byNewest((item) => item.submittedAt)),
    fruit: data.fruitEvents
      .filter((event) => event.status !== "hidden" && event.status !== "draft")
      .map((event) => ({
        date: event.date,
        description: event.description,
        fruitType: event.fruitType,
        id: event.id,
        meetingId: event.meetingId,
        personId: event.personId,
        title: event.title,
      }))
      .sort(byNewest((item) => item.date)),
    groups: data.groups.map((group) => ({
      gatherings: group.gatherings
        .map((gathering) => ({
          date: gathering.startsAt,
          id: gathering.id,
          presentPersonIds: gathering.attendance.filter((row) => row.status === "present" || row.status === "guest").map((row) => row.personId),
          status: gathering.status,
          title: gathering.title,
        }))
        .sort(byNewest((item) => item.date)),
      id: group.id,
      memberPersonIds: group.members.filter((member) => member.status === "active").map((member) => member.personId),
      name: group.name,
    })),
    journeys: data.resourceAssignments
      .map((assignment) => ({
        completedAt: assignment.completedAt,
        id: assignment.id,
        personId: assignment.personId,
        resourceSlug: assignment.resourceSlug,
        startDate: assignment.startDate,
        status: assignment.status,
      }))
      .sort(byNewest((item) => item.startDate)),
    meetings: data.meetings
      .map((meeting) => {
        const reflection = reflectionsByMeeting.get(meeting.id);

        return {
          conversationFlowKey: meeting.conversationFlowKey,
          date: meeting.date,
          id: meeting.id,
          meetingStatus: meeting.meetingStatus,
          minutes: meeting.meetingStatus === "logged" ? loggedMinutes(meeting.scheduledStartAt, meeting.scheduledEndAt) : null,
          notes: meeting.notes,
          personIds: Array.from(new Set(meeting.fieldPersonIds)),
          prayerNeeds: reflection?.prayerNeeds ?? null,
          source: meeting.source,
          tableRole: meeting.tableRole,
          tableRoleRecorded: meeting.tableRoleRecorded,
          type: meeting.type,
          whatHappened: reflection?.whatHappened ?? null,
        };
      })
      .sort(byNewest((item) => item.date)),
    ownerName,
    people: data.people
      .filter((person) => person.status !== "archived")
      .map((person) => ({
        id: person.id,
        name: person.name,
        notes: person.notes,
        relationshipTypeValue: person.relationshipTypeValue,
        roleInMyLife: person.roleInMyLife,
        status: person.status,
      })),
    prayer: data.prayerRequests
      .filter((request) => request.status !== "archived")
      .map((request) => ({
        answeredAt: request.answeredAt,
        createdAt: request.createdAt,
        id: request.id,
        personIds: Array.from(new Set([request.fieldPersonId, ...request.linkedPersonIds].filter((id): id is string => Boolean(id)))),
        request: request.request,
        status: request.status,
        title: request.title,
      }))
      .sort(byNewest((item) => item.createdAt)),
    readOnly: true,
    workspaceId,
  };
}
