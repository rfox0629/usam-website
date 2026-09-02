import type { GroupMemberPortalData } from "./member-access";

/**
 * Leader preview adapter for the member Group Home.
 *
 * USA-170: "Preview Tanner's Experience" used to render a second, hand-built
 * black/gold mock of Group Home inside the leader app. Two implementations of
 * one surface meant the preview could — and did — drift from what the
 * participant actually sees through their secure link.
 *
 * This adapter is the whole fix in one sentence: project the leader's already
 * loaded group/journey/progress data into the exact `GroupMemberPortalData`
 * shape the real portal loader returns, so the leader preview and the
 * participant's real link render the same `GroupHomeMemberView`.
 *
 * It is deliberately pure and read-only. It never reads a session, never mints
 * a token, and never writes participant state — the preview is a projection of
 * data the leader already has on screen.
 */

export type LeaderPreviewGathering = {
  description?: string | null;
  endsAt?: string | null;
  id: string;
  location?: string | null;
  startsAt: string;
  status?: "canceled" | "completed" | "scheduled";
  title: string;
};

export type LeaderPreviewJourney = {
  completedAt?: string | null;
  dueDate?: string | null;
  id: string;
  personalMessage?: string | null;
  resourceSlug: string;
  startDate: string;
  status: string;
};

export type LeaderPreviewProgress = {
  assignmentId?: string | null;
  completedAt?: string | null;
  id: string;
  resourceSlug: string;
  sessionId: string;
  updatedAt?: string | null;
};

export type LeaderPreviewInput = {
  group: {
    /** `template_category === "activity" || type === "running"` upstream. */
    activityTemplate?: boolean;
    defaultLocation?: string | null;
    description?: string | null;
    id: string;
    memberVisibleLocationMode?: "exact" | "general" | "hidden" | null;
    name: string;
    rhythm?: string | null;
    slug: string;
    tagline?: string | null;
  };
  journeys: readonly LeaderPreviewJourney[];
  member: {
    id: string;
    personId: string;
    personName: string;
  };
  nextGathering?: LeaderPreviewGathering | null;
  progress: readonly LeaderPreviewProgress[];
};

function text(value: string | null | undefined, fallback = "") {
  const trimmed = value?.trim() ?? "";

  return trimmed || fallback;
}

/**
 * The next four helpers mirror `loadGroupMemberPortalData`'s own derivations.
 * The participant's real link fills a sparse group record with these exact
 * fallbacks, so the preview has to fill them the same way or the two surfaces
 * disagree on empty groups — the narrow seam the old mock drifted through.
 */

function previewGroupTypeLabel(input: LeaderPreviewInput["group"]) {
  return input.activityTemplate ? "Activity group" : "Discipleship group";
}

function previewRhythm(input: LeaderPreviewInput["group"]) {
  return text(input.rhythm, "Recurring");
}

function previewDescription(input: LeaderPreviewInput["group"]) {
  return text(
    input.description,
    `A ${previewGroupTypeLabel(input).toLowerCase()} connected to ${text(input.rhythm, "a steady rhythm")}.`,
  );
}

function previewLocation(group: LeaderPreviewInput["group"], gathering: LeaderPreviewGathering | null) {
  const mode = group.memberVisibleLocationMode ?? "general";

  if (mode === "hidden") {
    return "Shared after leader confirmation";
  }

  if (mode === "exact") {
    return text(gathering?.location, text(group.defaultLocation, "Location TBD"));
  }

  return text(group.defaultLocation, text(gathering?.location, "Location TBD"));
}

export function buildLeaderPreviewPortalData(input: LeaderPreviewInput): GroupMemberPortalData {
  const gathering = input.nextGathering ?? null;
  const location = previewLocation(input.group, gathering);

  return {
    // Preview surfaces nothing that depends on private per-member history.
    // Empty is honest here; an invented roster would be worse than none.
    attendance: [],
    group: {
      description: previewDescription(input.group),
      id: input.group.id,
      location,
      name: input.group.name,
      rhythm: previewRhythm(input.group),
      routeBuilderEligible: false,
      slug: input.group.slug,
      tagline: text(input.group.tagline, "Discipleship happens in rhythms."),
      type: previewGroupTypeLabel(input.group),
    },
    identity: {
      email: null,
      id: `preview-identity-${input.member.id}`,
      name: input.member.personName,
      personId: input.member.personId,
      phone: null,
    },
    // Completed Journeys must survive into the preview: a leader checking
    // Tanner's Home needs to see the same history Tanner sees.
    journeyAssignments: input.journeys.map((journey) => ({
      completedAt: journey.completedAt ?? null,
      dueDate: journey.dueDate ?? null,
      id: journey.id,
      personalMessage: journey.personalMessage ?? null,
      resourceSlug: journey.resourceSlug,
      startDate: journey.startDate,
      status: journey.status,
    })),
    journeyProgress: input.progress.map((item) => ({
      actionStep: null,
      assignmentId: item.assignmentId ?? null,
      completedAt: item.completedAt ?? null,
      id: item.id,
      prayerFocus: null,
      reflection: null,
      resourceSlug: item.resourceSlug,
      sessionId: item.sessionId,
      updatedAt: item.updatedAt ?? null,
    })),
    nextGathering: gathering
      ? {
        description: gathering.description ?? null,
        endsAt: gathering.endsAt ?? null,
        id: gathering.id,
        location,
        startsAt: gathering.startsAt,
        status: gathering.status ?? "scheduled",
        title: gathering.title,
      }
      : null,
    prayerRequests: [],
    preferences: [],
    resources: [],
    rsvp: null,
    // No real session backs a preview, and the marker says so out loud.
    sessionId: `preview-session-${input.member.id}`,
    updates: [],
  };
}
