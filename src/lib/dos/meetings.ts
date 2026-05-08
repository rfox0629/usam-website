import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  dosDiscussionGuideOptions,
  dosMeetingMovementOptions,
  dosMeetingOutcomeOptions,
  dosMeetingTypeLabel,
  dosMeetingTypes,
  type DosDiscussionGuide,
  type DosMeetingFeedItem,
  type DosMeetingOutcome,
  type DosMeetingOption,
  type DosMeetingsWorkspaceData,
  type DosMeetingType,
} from "@/src/lib/dos/meeting-options";

export type DosMeetingDetailData = DosMeetingsWorkspaceData & {
  meeting: DosMeetingFeedItem;
};

type LoadResult<T> =
  | { data: T; status: "ready" }
  | { message: string; status: "error" }
  | { status: "not_found" };

type CollectiveRow = {
  id: string;
  name: string;
  owner_organization_id: string;
  slug: string;
  type: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

type ProfileRow = {
  first_name: string;
  id: string;
  last_name: string;
};

type PersonRow = {
  engagement_level: string | null;
  first_name: string;
  id: string;
  last_name: string;
};

type CollectiveMembershipRow = {
  profile_id: string;
  role: string;
  status: string;
};

type MeetingRow = {
  discussion_guide_key: string | null;
  follow_up_needed: boolean;
  id: string;
  meeting_at: string;
  meeting_date: string;
  notes_private: string | null;
  outcome_markers: string[] | null;
  outcome_notes_private: string | null;
  prayer_requested: boolean;
  relationship_movement: string | null;
  spiritual_openness_movement: string | null;
  summary_private: string | null;
  title: string;
  type: string;
};

type MeetingMinisterRow = {
  meeting_id: string;
  profile_id: string;
  role: string;
};

type MeetingPersonRow = {
  meeting_id: string;
  person_id: string;
  role: string;
};

type LoadContext = {
  collective: CollectiveRow;
  defaultMinisterId: string;
  fieldPeople: DosMeetingOption[];
  mappedMeetings: DosMeetingFeedItem[];
  ministers: DosMeetingOption[];
  organization: OrganizationRow;
  peopleRows: PersonRow[];
  profileRows: ProfileRow[];
};

type CreateDosMeetingInput = {
  discussionGuideKey?: string | null;
  followUpNeeded?: boolean;
  meetingAt?: string | null;
  meetingDate?: string | null;
  ministerProfileIds?: string[];
  outcomeMarkers?: string[];
  outcomeNotesPrivate?: string | null;
  peopleIds?: string[];
  prayerRequested?: boolean;
  relationshipMovement?: string | null;
  spiritualOpennessMovement?: string | null;
  summaryPrivate?: string | null;
  type?: string | null;
};

const dosMeetingTypeSet = new Set<string>(dosMeetingTypes);
const dosMeetingMovementSet = new Set<string>(dosMeetingMovementOptions);
const dosMeetingOutcomeSet = new Set<string>(dosMeetingOutcomeOptions);
const dosDiscussionGuideSet = new Set<string>(dosDiscussionGuideOptions);

function fullName(firstName: string, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || firstName;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function normalizeNullableString(value: string | null | undefined, maxLength = 500) {
  const trimmed = String(value ?? "").trim().slice(0, maxLength);

  return trimmed ? trimmed : null;
}

function normalizeMeetingType(value: string | null | undefined): DosMeetingType {
  return dosMeetingTypeSet.has(value ?? "") ? value as DosMeetingType : "kitchen_table";
}

function normalizeMovement(value: string | null | undefined) {
  const movement = normalizeNullableString(value, 80);

  if (!movement || movement === "no_change") {
    return null;
  }

  return movement && dosMeetingMovementSet.has(movement) ? movement : null;
}

function normalizeDiscussionGuide(value: string | null | undefined): Exclude<DosDiscussionGuide, "none"> | null {
  const discussionGuide = normalizeNullableString(value, 80);

  if (!discussionGuide || discussionGuide === "none") {
    return null;
  }

  // TODO: Move structured guide responses into meeting_discussion_responses
  // when templates ship. Answers must be captured per person, not shared
  // as one meeting-level answer.
  return dosDiscussionGuideSet.has(discussionGuide)
    ? discussionGuide as Exclude<DosDiscussionGuide, "none">
    : null;
}

function normalizeOutcomeMarkers(values: string[] | null | undefined): DosMeetingOutcome[] {
  return uniqueStrings(values ?? [])
    .filter((value): value is DosMeetingOutcome => dosMeetingOutcomeSet.has(value));
}

function normalizeMeetingAt(value: string | null | undefined) {
  const fallback = new Date();
  const parsed = value ? new Date(value) : fallback;

  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeMeetingDate(value: string | null | undefined, meetingAt: Date) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : meetingAt.toISOString().slice(0, 10);
}

function titleForMeeting(type: DosMeetingType, meetingAt: Date) {
  const timestamp = meetingAt.toISOString().slice(0, 16).replace("T", " ");

  return `${dosMeetingTypeLabel(type)} • ${timestamp}`;
}

function sortByName<T extends { name: string }>(items: T[]) {
  return items.sort((first, second) => first.name.localeCompare(second.name));
}

function buildDefaultMinisterId(collective: CollectiveRow, profiles: ProfileRow[], members: DosMeetingOption[]) {
  const ryanFoxProfile = profiles.find(
    (profile) =>
      collective.slug === "fox-family" &&
      profile.first_name.trim().toLowerCase() === "ryan" &&
      profile.last_name.trim().toLowerCase() === "fox",
  );

  // TODO: Resolve this from the authenticated DOS profile once auth/profile
  // selection exists. Fox Family defaults to Ryan Fox for the MVP workspace.
  return ryanFoxProfile?.id ?? members[0]?.id ?? profiles[0]?.id ?? "";
}

function mapMeeting(
  meeting: MeetingRow,
  meetingMinisters: MeetingMinisterRow[],
  meetingPeople: MeetingPersonRow[],
  profiles: Map<string, ProfileRow>,
  people: Map<string, PersonRow>,
): DosMeetingFeedItem {
  return {
    discussionGuideKey: meeting.discussion_guide_key,
    followUpNeeded: meeting.follow_up_needed,
    id: meeting.id,
    meetingAt: meeting.meeting_at,
    meetingDate: meeting.meeting_date,
    ministers: meetingMinisters
      .filter((minister) => minister.meeting_id === meeting.id)
      .map((minister) => {
        const profile = profiles.get(minister.profile_id);

        return {
          id: minister.profile_id,
          kind: "profile" as const,
          name: profile ? fullName(profile.first_name, profile.last_name) : "Unknown minister",
          role: minister.role,
        };
      }),
    outcomeMarkers: meeting.outcome_markers ?? [],
    outcomeNotesPrivate: meeting.outcome_notes_private,
    people: meetingPeople
      .filter((person) => person.meeting_id === meeting.id)
      .map((person) => {
        const fieldPerson = people.get(person.person_id);

        return {
          id: person.person_id,
          kind: "person" as const,
          name: fieldPerson ? fullName(fieldPerson.first_name, fieldPerson.last_name) : "Unknown person",
          role: person.role,
        };
      }),
    prayerRequested: meeting.prayer_requested,
    relationshipMovement: meeting.relationship_movement,
    spiritualOpennessMovement: meeting.spiritual_openness_movement,
    summaryPrivate: meeting.summary_private ?? meeting.notes_private,
    title: meeting.title,
    type: meeting.type,
  };
}

async function loadContext(collectiveSlug: string): Promise<LoadResult<LoadContext>> {
  if (!isSupabaseAdminConfigured()) {
    return {
      message: "Supabase admin environment variables are not configured.",
      status: "error",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: collectiveData, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, owner_organization_id, name, type, slug")
    .eq("slug", collectiveSlug)
    .maybeSingle();

  if (collectiveError) {
    return {
      message: collectiveError.message,
      status: "error",
    };
  }

  if (!collectiveData) {
    return { status: "not_found" };
  }

  const collective = collectiveData as CollectiveRow;
  const [
    organizationResult,
    profilesResult,
    peopleResult,
    membershipsResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", collective.owner_organization_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("owner_organization_id", collective.owner_organization_id)
      .order("first_name", { ascending: true }),
    supabase
      .from("people")
      .select("id, first_name, last_name, engagement_level")
      .eq("owner_organization_id", collective.owner_organization_id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("collective_memberships")
      .select("profile_id, role, status")
      .eq("collective_id", collective.id)
      .eq("status", "active"),
    supabase
      .from("meetings")
      .select("id, title, type, meeting_date, meeting_at, discussion_guide_key, summary_private, notes_private, prayer_requested, follow_up_needed, relationship_movement, spiritual_openness_movement, outcome_markers, outcome_notes_private")
      .eq("owner_organization_id", collective.owner_organization_id)
      .eq("primary_collective_id", collective.id)
      .order("meeting_at", { ascending: false }),
  ]);

  if (
    organizationResult.error ||
    profilesResult.error ||
    peopleResult.error ||
    membershipsResult.error ||
    meetingsResult.error
  ) {
    return {
      message:
        organizationResult.error?.message ??
        profilesResult.error?.message ??
        peopleResult.error?.message ??
        membershipsResult.error?.message ??
        meetingsResult.error?.message ??
        "Unable to load DOS meetings.",
      status: "error",
    };
  }

  const organization = organizationResult.data as OrganizationRow;
  const profileRows = (profilesResult.data ?? []) as ProfileRow[];
  const peopleRows = (peopleResult.data ?? []) as PersonRow[];
  const memberships = (membershipsResult.data ?? []) as CollectiveMembershipRow[];
  const meetings = (meetingsResult.data ?? []) as MeetingRow[];
  const meetingIds = meetings.map((meeting) => meeting.id);
  const [meetingMinistersResult, meetingPeopleResult] = await Promise.all([
    meetingIds.length
      ? supabase.from("meeting_ministers").select("meeting_id, profile_id, role").in("meeting_id", meetingIds)
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase.from("meeting_people").select("meeting_id, person_id, role").in("meeting_id", meetingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (meetingMinistersResult.error || meetingPeopleResult.error) {
    return {
      message: meetingMinistersResult.error?.message ?? meetingPeopleResult.error?.message ?? "Unable to load meeting people.",
      status: "error",
    };
  }

  const profiles = new Map(profileRows.map((profile) => [profile.id, profile]));
  const people = new Map(peopleRows.map((person) => [person.id, person]));
  const memberIds = new Set(memberships.map((membership) => membership.profile_id));
  const allMinisterOptions = profileRows.map((profile) => ({
    id: profile.id,
    kind: "profile" as const,
    name: fullName(profile.first_name, profile.last_name),
  }));
  const activeMemberOptions = allMinisterOptions.filter((profile) => memberIds.has(profile.id));
  const ministers = sortByName(activeMemberOptions.length ? activeMemberOptions : allMinisterOptions);
  const fieldPeople = sortByName(
    peopleRows.map((person) => ({
      id: person.id,
      kind: "person" as const,
      name: fullName(person.first_name, person.last_name),
      relationshipStage: person.engagement_level,
    })),
  );
  const mappedMeetings = meetings.map((meeting) =>
    mapMeeting(
      meeting,
      (meetingMinistersResult.data ?? []) as MeetingMinisterRow[],
      (meetingPeopleResult.data ?? []) as MeetingPersonRow[],
      profiles,
      people,
    ),
  );

  return {
    data: {
      collective,
      defaultMinisterId: buildDefaultMinisterId(collective, profileRows, ministers),
      fieldPeople,
      mappedMeetings,
      ministers,
      organization,
      peopleRows,
      profileRows,
    },
    status: "ready",
  };
}

function buildWorkspaceData(context: LoadContext): DosMeetingsWorkspaceData {
  return {
    collective: {
      id: context.collective.id,
      name: context.collective.name,
      slug: context.collective.slug,
      type: context.collective.type,
    },
    defaultMinisterId: context.defaultMinisterId,
    fieldPeople: context.fieldPeople,
    meetings: context.mappedMeetings,
    ministers: context.ministers,
    organization: context.organization,
  };
}

export async function loadDosMeetingsWorkspace(collectiveSlug: string): Promise<LoadResult<DosMeetingsWorkspaceData>> {
  const contextResult = await loadContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  return {
    data: buildWorkspaceData(contextResult.data),
    status: "ready",
  };
}

export async function loadDosMeetingDetail(
  collectiveSlug: string,
  meetingId: string,
): Promise<LoadResult<DosMeetingDetailData>> {
  const workspaceResult = await loadDosMeetingsWorkspace(collectiveSlug);

  if (workspaceResult.status !== "ready") {
    return workspaceResult;
  }

  const meeting = workspaceResult.data.meetings.find((candidate) => candidate.id === meetingId);

  if (!meeting) {
    return { status: "not_found" };
  }

  return {
    data: {
      ...workspaceResult.data,
      meeting,
    },
    status: "ready",
  };
}

export async function createDosMeeting(collectiveSlug: string, input: CreateDosMeetingInput) {
  const contextResult = await loadContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  if (!contextResult.data.defaultMinisterId) {
    return {
      message: "Add a collective member before logging a meeting.",
      status: "error" as const,
    };
  }

  const type = normalizeMeetingType(input.type);
  const meetingAt = normalizeMeetingAt(input.meetingAt);
  const meetingDate = normalizeMeetingDate(input.meetingDate, meetingAt);
  const summaryPrivate = normalizeNullableString(input.summaryPrivate, 600);
  const discussionGuideKey = normalizeDiscussionGuide(input.discussionGuideKey);
  const outcomeMarkers = normalizeOutcomeMarkers(input.outcomeMarkers);
  const outcomeNotesPrivate = normalizeNullableString(input.outcomeNotesPrivate, 500);
  const relationshipMovement = normalizeMovement(input.relationshipMovement);
  const spiritualOpennessMovement = normalizeMovement(input.spiritualOpennessMovement);
  const peopleIds = uniqueStrings(input.peopleIds ?? []).filter((personId) =>
    contextResult.data.peopleRows.some((person) => person.id === personId),
  );
  const ministerProfileIds = uniqueStrings([
    contextResult.data.defaultMinisterId,
    ...(input.ministerProfileIds ?? []),
  ]).filter((profileId) =>
    contextResult.data.profileRows.some((profile) => profile.id === profileId),
  );

  if (!peopleIds.length && ministerProfileIds.length <= 1) {
    return {
      message: "Choose at least one person or ministry teammate involved.",
      status: "error" as const,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: meetingData, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      created_by_profile_id: contextResult.data.defaultMinisterId,
      discussion_guide_key: discussionGuideKey,
      follow_up_needed: Boolean(input.followUpNeeded) || outcomeMarkers.includes("follow_up_needed"),
      meeting_at: meetingAt.toISOString(),
      meeting_date: meetingDate,
      owner_organization_id: contextResult.data.organization.id,
      outcome_markers: outcomeMarkers,
      outcome_notes_private: outcomeNotesPrivate,
      prayer_requested: Boolean(input.prayerRequested) || outcomeMarkers.includes("prayer_requested"),
      primary_collective_id: contextResult.data.collective.id,
      relationship_movement: relationshipMovement,
      spiritual_openness_movement: spiritualOpennessMovement,
      summary_private: summaryPrivate,
      title: titleForMeeting(type, meetingAt),
      type,
    })
    .select("id")
    .single();

  if (meetingError) {
    return {
      message: meetingError.code === "23505"
        ? "That meeting already appears to be logged."
        : meetingError.message,
      status: "error" as const,
    };
  }

  const meetingId = meetingData.id as string;
  const ministerRows = ministerProfileIds.map((profileId) => ({
    collective_id: contextResult.data.collective.id,
    meeting_id: meetingId,
    profile_id: profileId,
    role: profileId === contextResult.data.defaultMinisterId ? "lead" : "minister",
  }));
  const personRows = peopleIds.map((personId) => ({
    meeting_id: meetingId,
    person_id: personId,
    role: "participant",
  }));
  const [ministersResult, peopleResult] = await Promise.all([
    ministerRows.length
      ? supabase.from("meeting_ministers").insert(ministerRows)
      : Promise.resolve({ error: null }),
    personRows.length
      ? supabase.from("meeting_people").insert(personRows)
      : Promise.resolve({ error: null }),
  ]);

  if (ministersResult.error || peopleResult.error) {
    await supabase.from("meetings").delete().eq("id", meetingId);

    return {
      message: ministersResult.error?.message ?? peopleResult.error?.message ?? "Unable to attach people to this meeting.",
      status: "error" as const,
    };
  }

  return {
    data: {
      meetingId,
    },
    status: "ready" as const,
  };
}
