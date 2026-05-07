import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export type DosPersonKind = "person" | "profile";

export type DosRelationshipStatus = "active" | "ended" | "paused";
export type DosRelationshipDepth = "New" | "Growing" | "Strong";

export type DosFieldPerson = {
  commitmentLevel: number | null;
  createdAt: string;
  discipling: DosRelationshipView[];
  disciplingCount: number;
  email: string | null;
  relationshipStage: string | null;
  firstName: string;
  id: string;
  inactive: boolean;
  kind: DosPersonKind;
  lastMeeting: DosPersonMeeting | null;
  lastName: string;
  name: string;
  newToField: boolean;
  notesPrivate: string | null;
  phone: string | null;
  relationshipDepth: DosRelationshipDepth | null;
  relationshipSummary: string;
  walkingWith: DosRelationshipView[];
};

export type DosPersonMeeting = {
  id: string;
  meetingDate: string;
  ministers: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  people: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  title: string;
  type: string;
};

export type DosRelationshipOption = {
  id: string;
  name: string;
};

export type DosRelationshipView = {
  discipleId: string;
  discipleKind: DosPersonKind;
  discipleName: string;
  disciplerId: string;
  disciplerName: string;
  id: string;
  startedAt: string;
  status: DosRelationshipStatus;
  strength: string;
  style: string;
};

export type DosPeopleWorkspaceData = {
  collective: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  members: DosRelationshipOption[];
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  people: DosFieldPerson[];
  relationshipOptions: DosRelationshipOption[];
  stats: {
    activeRelationships: number;
    peopleCount: number;
    peopleDiscipling: number;
  };
};

export type DosPersonDetailData = DosPeopleWorkspaceData & {
  multiplicationRoots: MultiplicationNode[];
  person: DosFieldPerson;
  recentMeetings: DosPersonMeeting[];
};

export type MultiplicationNode = {
  children: MultiplicationNode[];
  id: string;
  kind: DosPersonKind;
  name: string;
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
  created_at: string;
  email: string | null;
  first_name: string;
  id: string;
  last_name: string;
  owner_organization_id: string;
  phone: string | null;
  primary_collective_id: string | null;
};

type PersonRow = {
  commitment_level: number | null;
  created_at: string;
  email: string | null;
  engagement_level: string | null;
  first_name: string;
  id: string;
  last_name: string;
  notes_private: string | null;
  owner_organization_id: string;
  phone: string | null;
  relationship_depth: string | null;
  updated_at: string;
};

type RelationshipRow = {
  disciple_person_id: string | null;
  disciple_profile_id: string | null;
  discipler_profile_id: string;
  id: string;
  started_at: string;
  status: DosRelationshipStatus;
  strength: string;
  style: string;
};

type CollectiveMembershipRow = {
  profile_id: string;
  role: string;
  status: string;
};

type MeetingRow = {
  id: string;
  meeting_date: string;
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
  organization: OrganizationRow;
  peopleRows: PersonRow[];
  profileRows: ProfileRow[];
  relationships: RelationshipRow[];
  mappedMeetings: DosPersonMeeting[];
  members: DosRelationshipOption[];
};

type CreatePersonInput = {
  email?: string | null;
  relationshipStage?: string | null;
  firstName: string;
  lastName?: string | null;
  notesPrivate?: string | null;
  phone?: string | null;
};

type CreateRelationshipInput = {
  discipleId: string;
  discipleKind: DosPersonKind;
  disciplerProfileId: string;
  status?: string;
  strength?: string;
  style?: string;
};

type UpdatePersonInsightsInput = {
  commitmentLevel?: number | null;
  notesPrivate?: string | null;
  relationshipDepth?: string | null;
};

const relationshipStyles = new Set([
  "mentor",
  "pastor",
  "coach",
  "spiritual_parent",
  "peer_accountability",
  "prayer_support",
  "ministry_partner",
  "other",
]);

const relationshipStrengths = new Set(["primary", "supporting"]);
const relationshipStatuses = new Set(["active", "paused", "ended"]);
const relationshipStageOptions = [
  "New",
  "Exploring",
  "Walking With",
  "Discipling",
  "Multiplying",
  "Inactive",
] as const;
const relationshipStages = new Set<string>(relationshipStageOptions);
const relationshipDepthOptions = ["New", "Growing", "Strong"] as const;

function fullName(firstName: string, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || firstName;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function joinHuman(names: string[]) {
  if (names.length === 0) {
    return "";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function sortByName<T extends { name: string }>(items: T[]) {
  return items.sort((first, second) => first.name.localeCompare(second.name));
}

function normalizeNullableString(value: string | null | undefined, maxLength = 500) {
  const trimmed = String(value ?? "").trim().slice(0, maxLength);

  return trimmed ? trimmed : null;
}

function normalizeRelationshipStage(value: string | null | undefined) {
  const trimmed = normalizeNullableString(value, 80);

  if (!trimmed) {
    return "Walking With";
  }

  const stage = relationshipStageOptions.find((option) => option.toLowerCase() === trimmed.toLowerCase());

  return stage ?? null;
}

function normalizeRelationshipDepth(value: string | null | undefined): DosRelationshipDepth | null {
  const trimmed = normalizeNullableString(value, 80);

  if (!trimmed) {
    return null;
  }

  const depth = relationshipDepthOptions.find((option) => option.toLowerCase() === trimmed.toLowerCase());

  return depth ?? null;
}

function normalizeCommitmentLevel(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < -3 || value > 3) {
    return undefined;
  }

  return value;
}

function personKey(kind: DosPersonKind, id: string) {
  return `${kind}:${id}`;
}

function personKeyFromRelationship(relationship: DosRelationshipView) {
  return personKey(relationship.discipleKind, relationship.discipleId);
}

function profilePersonFromRow(row: ProfileRow): DosFieldPerson {
  return {
    commitmentLevel: null,
    createdAt: row.created_at,
    discipling: [],
    disciplingCount: 0,
    email: row.email,
    relationshipStage: null,
    firstName: row.first_name,
    id: row.id,
    inactive: false,
    kind: "profile",
    lastMeeting: null,
    lastName: row.last_name,
    name: fullName(row.first_name, row.last_name),
    newToField: false,
    notesPrivate: null,
    phone: row.phone,
    relationshipDepth: null,
    relationshipSummary: "No active discipleship relationship yet",
    walkingWith: [],
  };
}

function fieldPersonFromRow(row: PersonRow, includePrivateNotes = false): DosFieldPerson {
  return {
    commitmentLevel: row.commitment_level,
    createdAt: row.created_at,
    discipling: [],
    disciplingCount: 0,
    email: row.email,
    relationshipStage: row.engagement_level,
    firstName: row.first_name,
    id: row.id,
    inactive: false,
    kind: "person",
    lastMeeting: null,
    lastName: row.last_name,
    name: fullName(row.first_name, row.last_name),
    newToField: false,
    notesPrivate: includePrivateNotes ? row.notes_private : null,
    phone: row.phone,
    relationshipDepth: normalizeRelationshipDepth(row.relationship_depth),
    relationshipSummary: "No one walking with them yet",
    walkingWith: [],
  };
}

function buildRelationshipSummary(person: DosFieldPerson) {
  const activeWalkingWith = person.walkingWith.filter((relationship) => relationship.status === "active");

  if (activeWalkingWith.length > 0) {
    return `Walking with ${joinHuman(activeWalkingWith.map((relationship) => relationship.disciplerName))}`;
  }

  if (person.disciplingCount > 0) {
    return "Actively discipling others";
  }

  return person.kind === "profile" ? "Ready for discipleship relationships" : "No one walking with them yet";
}

function isRecentDate(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return now.getTime() - date.getTime() <= thirtyDays;
}

function decoratePeople(
  people: Map<string, DosFieldPerson>,
  relationships: DosRelationshipView[],
  meetingsByPerson: Map<string, DosPersonMeeting[]>,
) {
  people.forEach((person, key) => {
    const activeRelationships = relationships.filter(
      (relationship) =>
        relationship.status === "active" &&
        (personKeyFromRelationship(relationship) === key || personKey("profile", relationship.disciplerId) === key),
    );
    const meetings = meetingsByPerson.get(key) ?? [];
    const lastMeeting = meetings[0] ?? null;

    person.walkingWith = relationships.filter((relationship) => personKeyFromRelationship(relationship) === key);
    person.discipling = person.kind === "profile"
      ? relationships.filter((relationship) => relationship.disciplerId === person.id)
      : [];
    person.disciplingCount = person.discipling.filter((relationship) => relationship.status === "active").length;
    person.lastMeeting = lastMeeting;
    person.relationshipSummary = buildRelationshipSummary(person);
    person.newToField = activeRelationships.length === 0 && !lastMeeting;
    person.inactive = activeRelationships.length === 0 && !isRecentDate(lastMeeting?.meetingDate ?? null);
  });
}

function buildMultiplicationRoots(
  people: Map<string, DosFieldPerson>,
  relationships: DosRelationshipView[],
  focusKey?: string,
) {
  const activeRelationships = relationships.filter((relationship) => relationship.status === "active");
  const byDiscipler = new Map<string, DosRelationshipView[]>();
  const discipleKeys = new Set<string>();

  activeRelationships.forEach((relationship) => {
    const existing = byDiscipler.get(relationship.disciplerId) ?? [];
    existing.push(relationship);
    byDiscipler.set(relationship.disciplerId, existing);
    discipleKeys.add(personKeyFromRelationship(relationship));
  });

  function buildNode(kind: DosPersonKind, id: string, name: string, seen: Set<string>): MultiplicationNode {
    const key = personKey(kind, id);

    if (seen.has(key)) {
      return {
        children: [],
        id,
        kind,
        name,
      };
    }

    const nextSeen = new Set(seen);
    nextSeen.add(key);

    return {
      children: kind === "profile"
        ? (byDiscipler.get(id) ?? []).map((relationship) =>
          buildNode(relationship.discipleKind, relationship.discipleId, relationship.discipleName, nextSeen),
        )
        : [],
      id,
      kind,
      name,
    };
  }

  const rootRelationships = uniqueStrings(activeRelationships.map((relationship) => relationship.disciplerId))
    .filter((profileId) => !discipleKeys.has(personKey("profile", profileId)));
  const rootIds = rootRelationships.length
    ? rootRelationships
    : uniqueStrings(activeRelationships.map((relationship) => relationship.disciplerId));
  const roots = rootIds.map((profileId) => {
    const profile = people.get(personKey("profile", profileId));

    return buildNode("profile", profileId, profile?.name ?? "Unknown discipler", new Set());
  });

  if (!focusKey) {
    return roots;
  }

  function contains(node: MultiplicationNode): boolean {
    if (personKey(node.kind, node.id) === focusKey) {
      return true;
    }

    return node.children.some(contains);
  }

  return roots.filter(contains);
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
    relationshipsResult,
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
      .select("id, owner_organization_id, primary_collective_id, first_name, last_name, email, phone, created_at")
      .eq("owner_organization_id", collective.owner_organization_id)
      .order("first_name", { ascending: true }),
    supabase
      .from("people")
      .select("id, owner_organization_id, first_name, last_name, email, phone, engagement_level, commitment_level, relationship_depth, notes_private, created_at, updated_at")
      .eq("owner_organization_id", collective.owner_organization_id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("discipleship_relationships")
      .select("id, discipler_profile_id, disciple_person_id, disciple_profile_id, style, strength, status, started_at")
      .eq("owner_organization_id", collective.owner_organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collective_memberships")
      .select("profile_id, role, status")
      .eq("collective_id", collective.id)
      .eq("status", "active"),
    supabase
      .from("meetings")
      .select("id, title, type, meeting_date")
      .eq("owner_organization_id", collective.owner_organization_id)
      .eq("primary_collective_id", collective.id)
      .order("meeting_date", { ascending: false }),
  ]);

  if (
    organizationResult.error ||
    profilesResult.error ||
    peopleResult.error ||
    relationshipsResult.error ||
    membershipsResult.error ||
    meetingsResult.error
  ) {
    return {
      message:
        organizationResult.error?.message ??
        profilesResult.error?.message ??
        peopleResult.error?.message ??
        relationshipsResult.error?.message ??
        membershipsResult.error?.message ??
        meetingsResult.error?.message ??
        "Unable to load DOS people.",
      status: "error",
    };
  }

  const organization = organizationResult.data as OrganizationRow;
  const profileRows = (profilesResult.data ?? []) as ProfileRow[];
  const peopleRows = (peopleResult.data ?? []) as PersonRow[];
  const relationships = (relationshipsResult.data ?? []) as RelationshipRow[];
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
      message: meetingMinistersResult.error?.message ?? meetingPeopleResult.error?.message ?? "Unable to load meetings.",
      status: "error",
    };
  }

  const profiles = new Map(profileRows.map((row) => [row.id, profilePersonFromRow(row)]));
  const fieldPeople = new Map(peopleRows.map((row) => [row.id, fieldPersonFromRow(row)]));
  const meetingMinisters = (meetingMinistersResult.data ?? []) as MeetingMinisterRow[];
  const meetingPeople = (meetingPeopleResult.data ?? []) as MeetingPersonRow[];
  const mappedMeetings = meetings.map((meeting) => ({
    id: meeting.id,
    meetingDate: meeting.meeting_date,
    ministers: meetingMinisters
      .filter((minister) => minister.meeting_id === meeting.id)
      .map((minister) => ({
        id: minister.profile_id,
        name: profiles.get(minister.profile_id)?.name ?? "Unknown minister",
        role: minister.role,
      })),
    people: meetingPeople
      .filter((person) => person.meeting_id === meeting.id)
      .map((person) => ({
        id: person.person_id,
        name: fieldPeople.get(person.person_id)?.name ?? "Unknown person",
        role: person.role,
      })),
    title: meeting.title,
    type: meeting.type,
  }));

  return {
    data: {
      collective,
      mappedMeetings,
      members: memberships
        .map((membership) => {
          const profile = profiles.get(membership.profile_id);

          return profile ? { id: profile.id, name: profile.name } : null;
        })
        .filter((member): member is DosRelationshipOption => Boolean(member)),
      organization,
      peopleRows,
      profileRows,
      relationships,
    },
    status: "ready",
  };
}

function buildWorkspaceData(context: LoadContext): DosPeopleWorkspaceData {
  const profiles = new Map(context.profileRows.map((row) => [row.id, profilePersonFromRow(row)]));
  const people = new Map<string, DosFieldPerson>();

  context.peopleRows.forEach((row) => {
    const person = fieldPersonFromRow(row);
    people.set(personKey("person", row.id), person);
  });

  context.relationships.forEach((relationship) => {
    const discipler = profiles.get(relationship.discipler_profile_id);
    const discipleProfile = relationship.disciple_profile_id ? profiles.get(relationship.disciple_profile_id) : null;
    const disciplePerson = relationship.disciple_person_id
      ? people.get(personKey("person", relationship.disciple_person_id))
      : null;

    if (discipler) {
      people.set(personKey("profile", discipler.id), discipler);
    }

    if (discipleProfile) {
      people.set(personKey("profile", discipleProfile.id), discipleProfile);
    }

    if (disciplePerson) {
      people.set(personKey("person", disciplePerson.id), disciplePerson);
    }
  });

  context.members.forEach((member) => {
    const profile = profiles.get(member.id);

    if (profile) {
      people.set(personKey("profile", profile.id), profile);
    }
  });

  const relationshipViews = context.relationships.map((relationship) => {
    const discipler = profiles.get(relationship.discipler_profile_id);
    const discipleProfile = relationship.disciple_profile_id ? profiles.get(relationship.disciple_profile_id) : null;
    const disciplePerson = relationship.disciple_person_id
      ? people.get(personKey("person", relationship.disciple_person_id))
      : null;

    return {
      discipleId: relationship.disciple_profile_id ?? relationship.disciple_person_id ?? "",
      discipleKind: relationship.disciple_profile_id ? "profile" as const : "person" as const,
      discipleName: discipleProfile?.name ?? disciplePerson?.name ?? "Unknown disciple",
      disciplerId: relationship.discipler_profile_id,
      disciplerName: discipler?.name ?? "Unknown discipler",
      id: relationship.id,
      startedAt: relationship.started_at,
      status: relationship.status,
      strength: relationship.strength,
      style: relationship.style,
    };
  });
  const meetingsByPerson = new Map<string, DosPersonMeeting[]>();

  context.mappedMeetings.forEach((meeting) => {
    meeting.ministers.forEach((minister) => {
      const key = personKey("profile", minister.id);
      const existing = meetingsByPerson.get(key) ?? [];
      existing.push(meeting);
      meetingsByPerson.set(key, existing);
    });

    meeting.people.forEach((person) => {
      const key = personKey("person", person.id);
      const existing = meetingsByPerson.get(key) ?? [];
      existing.push(meeting);
      meetingsByPerson.set(key, existing);
    });
  });

  decoratePeople(people, relationshipViews, meetingsByPerson);

  const peopleList = sortByName(Array.from(people.values()));
  const activeRelationships = relationshipViews.filter((relationship) => relationship.status === "active");

  return {
    collective: {
      id: context.collective.id,
      name: context.collective.name,
      slug: context.collective.slug,
      type: context.collective.type,
    },
    members: context.members,
    organization: context.organization,
    people: peopleList,
    relationshipOptions: sortByName(
      context.profileRows.map((profile) => ({
        id: profile.id,
        name: fullName(profile.first_name, profile.last_name),
      })),
    ),
    stats: {
      activeRelationships: activeRelationships.length,
      peopleCount: peopleList.length,
      peopleDiscipling: peopleList.filter((person) => person.disciplingCount > 0).length,
    },
  };
}

export async function loadDosPeopleWorkspace(collectiveSlug: string): Promise<LoadResult<DosPeopleWorkspaceData>> {
  const contextResult = await loadContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  return {
    data: buildWorkspaceData(contextResult.data),
    status: "ready",
  };
}

export async function loadDosPersonDetail(
  collectiveSlug: string,
  personId: string,
): Promise<LoadResult<DosPersonDetailData>> {
  const contextResult = await loadContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  const workspace = buildWorkspaceData(contextResult.data);
  const workspacePerson = workspace.people.find((candidate) => candidate.id === personId);

  if (!workspacePerson) {
    return { status: "not_found" };
  }

  const person = workspacePerson.kind === "person"
    ? {
      ...workspacePerson,
      ...(() => {
        const row = contextResult.data.peopleRows.find((candidate) => candidate.id === workspacePerson.id);

        return row
          ? {
            commitmentLevel: row.commitment_level,
            notesPrivate: row.notes_private,
            relationshipDepth: normalizeRelationshipDepth(row.relationship_depth),
          }
          : {};
      })(),
    }
    : workspacePerson;

  const personMap = new Map(workspace.people.map((candidate) => [personKey(candidate.kind, candidate.id), candidate]));
  const relationshipViews = workspace.people.flatMap((candidate) => candidate.walkingWith);
  const focusKey = personKey(person.kind, person.id);
  const recentMeetings = contextResult.data.mappedMeetings.filter((meeting) => {
    if (person.kind === "profile") {
      return meeting.ministers.some((minister) => minister.id === person.id);
    }

    return meeting.people.some((meetingPerson) => meetingPerson.id === person.id);
  });

  return {
    data: {
      ...workspace,
      multiplicationRoots: buildMultiplicationRoots(personMap, relationshipViews, focusKey),
      person,
      recentMeetings,
    },
    status: "ready",
  };
}

async function loadMutationContext(collectiveSlug: string) {
  const contextResult = await loadContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  const { collective, organization, members, profileRows } = contextResult.data;
  const ryanFoxProfile = profileRows.find(
    (profile) =>
      collective.slug === "fox-family" &&
      profile.first_name.trim().toLowerCase() === "ryan" &&
      profile.last_name.trim().toLowerCase() === "fox",
  );
  const memberProfiles = members.length
    ? members
    : sortByName(
      profileRows.map((profile) => ({
        id: profile.id,
        name: fullName(profile.first_name, profile.last_name),
      })),
    );
  // TODO: Resolve this from the authenticated DOS profile once auth/profile
  // selection exists. Fox Family defaults to Ryan Fox for the MVP workspace.
  const defaultCreator = ryanFoxProfile
    ? { id: ryanFoxProfile.id, name: fullName(ryanFoxProfile.first_name, ryanFoxProfile.last_name) }
    : memberProfiles[0];

  if (!defaultCreator) {
    return {
      message: "Add a collective member before creating DOS people.",
      status: "error" as const,
    };
  }

  return {
    data: {
      collective,
      createdByProfileId: defaultCreator.id,
      organization,
      peopleRows: contextResult.data.peopleRows,
      profileRows,
    },
    status: "ready" as const,
  };
}

export async function createDosPerson(collectiveSlug: string, input: CreatePersonInput) {
  const firstName = normalizeNullableString(input.firstName, 120);
  const lastName = normalizeNullableString(input.lastName, 120);
  const relationshipStage = normalizeRelationshipStage(input.relationshipStage);

  if (!firstName) {
    return {
      message: "First name is required.",
      status: "error" as const,
    };
  }

  if (!lastName) {
    return {
      message: "Last name is required.",
      status: "error" as const,
    };
  }

  if (!relationshipStage || !relationshipStages.has(relationshipStage)) {
    return {
      message: "Choose a valid relationship stage.",
      status: "error" as const,
    };
  }

  const contextResult = await loadMutationContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("people")
    .insert({
      created_by_profile_id: contextResult.data.createdByProfileId,
      email: normalizeNullableString(input.email, 220),
      // TODO: Rename engagement_level to relationship_stage in a future DOS schema migration.
      engagement_level: relationshipStage,
      first_name: firstName,
      last_name: lastName,
      notes_private: normalizeNullableString(input.notesPrivate, 2000),
      owner_organization_id: contextResult.data.organization.id,
      phone: normalizeNullableString(input.phone, 80),
    })
    .select("id")
    .single();

  if (error) {
    return {
      message: error.message,
      status: "error" as const,
    };
  }

  const personId = data.id as string;
  const { data: relationshipData, error: relationshipError } = await supabase
    .from("discipleship_relationships")
    .insert({
      disciple_person_id: personId,
      discipler_profile_id: contextResult.data.createdByProfileId,
      owner_organization_id: contextResult.data.organization.id,
      status: "active",
      strength: "primary",
      style: "mentor",
    })
    .select("id")
    .single();

  if (relationshipError) {
    await supabase.from("people").delete().eq("id", personId);

    return {
      message: relationshipError.message,
      status: "error" as const,
    };
  }

  return {
    data: {
      personId,
      relationshipId: relationshipData.id as string,
    },
    status: "ready" as const,
  };
}

export async function createDosRelationship(collectiveSlug: string, input: CreateRelationshipInput) {
  const style = relationshipStyles.has(input.style ?? "") ? input.style : "mentor";
  const strength = relationshipStrengths.has(input.strength ?? "") ? input.strength : "supporting";
  const status = relationshipStatuses.has(input.status ?? "") ? input.status : "active";
  const contextResult = await loadMutationContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  const discipler = contextResult.data.profileRows.find((profile) => profile.id === input.disciplerProfileId);

  if (!discipler) {
    return {
      message: "Choose who else is helping disciple this person.",
      status: "error" as const,
    };
  }

  if (input.discipleKind === "profile" && input.discipleId === input.disciplerProfileId) {
    return {
      message: "Choose a different person for this discipleship relationship.",
      status: "error" as const,
    };
  }

  const workspaceResult = await loadDosPeopleWorkspace(collectiveSlug);

  if (workspaceResult.status !== "ready") {
    return workspaceResult;
  }

  const disciple = workspaceResult.data.people.find(
    (person) => person.id === input.discipleId && person.kind === input.discipleKind,
  );

  if (!disciple) {
    return {
      message: "This person was not found in the collective workspace.",
      status: "error" as const,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("discipleship_relationships")
    .insert({
      disciple_person_id: input.discipleKind === "person" ? input.discipleId : null,
      disciple_profile_id: input.discipleKind === "profile" ? input.discipleId : null,
      discipler_profile_id: input.disciplerProfileId,
      owner_organization_id: contextResult.data.organization.id,
      status,
      strength,
      style,
    })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "That active discipleship relationship already exists."
      : error.message;

    return {
      message,
      status: "error" as const,
    };
  }

  return {
    data: {
      relationshipId: data.id as string,
    },
    status: "ready" as const,
  };
}

export async function updateDosPersonInsights(
  collectiveSlug: string,
  personId: string,
  input: UpdatePersonInsightsInput,
) {
  const commitmentLevel = normalizeCommitmentLevel(input.commitmentLevel);
  const relationshipDepth = normalizeRelationshipDepth(input.relationshipDepth);

  if (commitmentLevel === undefined) {
    return {
      message: "Choose a valid commitment level.",
      status: "error" as const,
    };
  }

  if (input.relationshipDepth && !relationshipDepth) {
    return {
      message: "Choose a valid relationship depth.",
      status: "error" as const,
    };
  }

  const contextResult = await loadMutationContext(collectiveSlug);

  if (contextResult.status !== "ready") {
    return contextResult;
  }

  const supabase = createSupabaseAdminClient();
  const existingPerson = contextResult.data.peopleRows.find((person) => person.id === personId);

  if (!existingPerson) {
    return {
      message: "Relationship insights can be edited for field people added to your field.",
      status: "error" as const,
    };
  }

  // TODO: Add automatic multiplication detection, movement analytics,
  // relationship timeline/history, and AI insight suggestions after the
  // first relationship workflows are stable.
  const { error } = await supabase
    .from("people")
    .update({
      commitment_level: commitmentLevel,
      notes_private: normalizeNullableString(input.notesPrivate, 2000),
      relationship_depth: relationshipDepth,
    })
    .eq("id", personId)
    .eq("owner_organization_id", contextResult.data.organization.id);

  if (error) {
    return {
      message: error.message,
      status: "error" as const,
    };
  }

  return {
    data: {
      personId,
    },
    status: "ready" as const,
  };
}
