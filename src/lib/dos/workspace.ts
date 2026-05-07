import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export type DosProfile = {
  email: string | null;
  firstName: string;
  id: string;
  lastName: string;
  name: string;
};

export type DosPerson = {
  firstName: string;
  id: string;
  lastName: string;
  name: string;
};

export type DosRelationship = {
  discipleId: string;
  discipleName: string;
  discipleType: "person" | "profile";
  disciplerId: string;
  disciplerName: string;
  id: string;
  startedAt: string;
  status: string;
  strength: string;
  style: string;
};

export type DosMeeting = {
  followUpNeeded: boolean;
  id: string;
  meetingAt: string;
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
  prayerRequested: boolean;
  relationshipMovement: string | null;
  spiritualOpennessMovement: string | null;
  summaryPrivate: string | null;
  title: string;
  type: string;
};

export type MultiplicationNode = {
  children: MultiplicationNode[];
  generation: number;
  id: string;
  name: string;
};

export type DosWorkspaceData = {
  affiliates: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  collective: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  fieldActivity: {
    kitchenTablesThisMonth: number;
    meetingsThisMonth: number;
    prayerEncounters: number;
    uniquePeopleMetThisMonth: number;
  };
  meetings: DosMeeting[];
  members: Array<{
    profile: DosProfile;
    role: string;
    status: string;
  }>;
  multiplication: {
    activeDisciplers: number;
    chainCount: number;
    roots: MultiplicationNode[];
    secondGenerationDisciples: number;
  };
  networks: Array<{
    id: string;
    name: string;
    organizationId: string;
  }>;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  peopleDiscipling: DosRelationship[];
  peopleWalkingWithUs: DosRelationship[];
  relationships: DosRelationship[];
  stats: {
    meetingsThisMonth: number;
    multiplicationChains: number;
    peopleDiscipling: number;
    peopleWalkingWithUs: number;
  };
};

type WorkspaceLoadResult =
  | { data: DosWorkspaceData; status: "ready" }
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

type NetworkRow = {
  id: string;
  name: string;
  organization_id: string;
};

type MembershipRow = {
  profile_id: string;
  role: string;
  status: string;
};

type ProfileRow = {
  email: string | null;
  first_name: string;
  id: string;
  last_name: string;
};

type PersonRow = {
  first_name: string;
  id: string;
  last_name: string;
};

type RelationshipRow = {
  disciple_person_id: string | null;
  disciple_profile_id: string | null;
  discipler_profile_id: string;
  id: string;
  started_at: string;
  status: string;
  strength: string;
  style: string;
};

type MeetingRow = {
  follow_up_needed: boolean;
  id: string;
  meeting_at: string;
  meeting_date: string;
  notes_private: string | null;
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

type VisibilityRuleRow = {
  affiliate_organization_id: string;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function fullName(firstName: string, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || firstName;
}

function toProfile(row: ProfileRow): DosProfile {
  return {
    email: row.email,
    firstName: row.first_name,
    id: row.id,
    lastName: row.last_name,
    name: fullName(row.first_name, row.last_name),
  };
}

function toPerson(row: PersonRow): DosPerson {
  return {
    firstName: row.first_name,
    id: row.id,
    lastName: row.last_name,
    name: fullName(row.first_name, row.last_name),
  };
}

function isInCurrentMonth(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const now = new Date();

  return date.getUTCFullYear() === now.getFullYear() && date.getUTCMonth() === now.getMonth();
}

function buildMultiplicationRoots(relationships: DosRelationship[]) {
  const activeProfileRelationships = relationships.filter(
    (relationship) => relationship.status === "active" && relationship.discipleType === "profile",
  );
  const discipleIds = new Set(activeProfileRelationships.map((relationship) => relationship.discipleId));
  const disciplerIds = uniqueStrings(activeProfileRelationships.map((relationship) => relationship.disciplerId));
  const rootIds = disciplerIds.filter((id) => !discipleIds.has(id));
  const rootsToRender = rootIds.length ? rootIds : disciplerIds.slice(0, 1);
  const relationshipsByDiscipler = new Map<string, DosRelationship[]>();

  activeProfileRelationships.forEach((relationship) => {
    const existing = relationshipsByDiscipler.get(relationship.disciplerId) ?? [];
    existing.push(relationship);
    relationshipsByDiscipler.set(relationship.disciplerId, existing);
  });

  function buildNode(id: string, name: string, generation: number, seen: Set<string>): MultiplicationNode {
    if (seen.has(id)) {
      return {
        children: [],
        generation,
        id,
        name,
      };
    }

    const nextSeen = new Set(seen);
    nextSeen.add(id);

    return {
      children: (relationshipsByDiscipler.get(id) ?? []).map((relationship) =>
        buildNode(relationship.discipleId, relationship.discipleName, generation + 1, nextSeen),
      ),
      generation,
      id,
      name,
    };
  }

  return rootsToRender.map((id) => {
    const rootRelationship = activeProfileRelationships.find((relationship) => relationship.disciplerId === id);

    return buildNode(id, rootRelationship?.disciplerName ?? "Unknown discipler", 0, new Set());
  });
}

function countNodesAtGeneration(roots: MultiplicationNode[], generation: number) {
  const ids = new Set<string>();

  function walk(node: MultiplicationNode) {
    if (node.generation === generation) {
      ids.add(node.id);
    }

    node.children.forEach(walk);
  }

  roots.forEach(walk);

  return ids.size;
}

export async function loadDosWorkspace(collectiveSlug: string): Promise<WorkspaceLoadResult> {
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
    membershipResult,
    visibilityResult,
    meetingsResult,
    relationshipsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", collective.owner_organization_id)
      .single(),
    supabase
      .from("collective_memberships")
      .select("profile_id, role, status")
      .eq("collective_id", collective.id)
      .eq("status", "active"),
    supabase
      .from("visibility_rules")
      .select("affiliate_organization_id")
      .eq("owner_organization_id", collective.owner_organization_id)
      .eq("status", "active")
      .or(`collective_id.is.null,collective_id.eq.${collective.id}`),
    supabase
      .from("meetings")
      .select("id, title, type, meeting_date, meeting_at, summary_private, notes_private, prayer_requested, follow_up_needed, relationship_movement, spiritual_openness_movement")
      .eq("owner_organization_id", collective.owner_organization_id)
      .eq("primary_collective_id", collective.id)
      .order("meeting_at", { ascending: false }),
    supabase
      .from("discipleship_relationships")
      .select("id, discipler_profile_id, disciple_person_id, disciple_profile_id, style, strength, status, started_at")
      .eq("owner_organization_id", collective.owner_organization_id)
      .eq("status", "active"),
  ]);

  if (
    organizationResult.error ||
    membershipResult.error ||
    visibilityResult.error ||
    meetingsResult.error ||
    relationshipsResult.error
  ) {
    return {
      message:
        organizationResult.error?.message ??
        membershipResult.error?.message ??
        visibilityResult.error?.message ??
        meetingsResult.error?.message ??
        relationshipsResult.error?.message ??
        "Unable to load DOS workspace.",
      status: "error",
    };
  }

  const organization = organizationResult.data as OrganizationRow;
  const memberships = (membershipResult.data ?? []) as MembershipRow[];
  const visibilityRules = (visibilityResult.data ?? []) as VisibilityRuleRow[];
  const meetings = (meetingsResult.data ?? []) as MeetingRow[];
  const relationships = (relationshipsResult.data ?? []) as RelationshipRow[];
  const meetingIds = meetings.map((meeting) => meeting.id);
  const affiliateOrganizationIds = uniqueStrings(visibilityRules.map((rule) => rule.affiliate_organization_id));

  const [
    affiliatesResult,
    networksResult,
    meetingMinistersResult,
    meetingPeopleResult,
  ] = await Promise.all([
    affiliateOrganizationIds.length
      ? supabase.from("organizations").select("id, name, slug").in("id", affiliateOrganizationIds)
      : Promise.resolve({ data: [], error: null }),
    affiliateOrganizationIds.length
      ? supabase.from("networks").select("id, organization_id, name").in("organization_id", affiliateOrganizationIds)
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase.from("meeting_ministers").select("meeting_id, profile_id, role").in("meeting_id", meetingIds)
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase.from("meeting_people").select("meeting_id, person_id, role").in("meeting_id", meetingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (affiliatesResult.error || networksResult.error || meetingMinistersResult.error || meetingPeopleResult.error) {
    return {
      message:
        affiliatesResult.error?.message ??
        networksResult.error?.message ??
        meetingMinistersResult.error?.message ??
        meetingPeopleResult.error?.message ??
        "Unable to load DOS workspace details.",
      status: "error",
    };
  }

  const meetingMinisters = (meetingMinistersResult.data ?? []) as MeetingMinisterRow[];
  const meetingPeople = (meetingPeopleResult.data ?? []) as MeetingPersonRow[];
  const profileIds = uniqueStrings([
    ...memberships.map((membership) => membership.profile_id),
    ...meetingMinisters.map((minister) => minister.profile_id),
    ...relationships.map((relationship) => relationship.discipler_profile_id),
    ...relationships.map((relationship) => relationship.disciple_profile_id),
  ]);
  const personIds = uniqueStrings([
    ...meetingPeople.map((person) => person.person_id),
    ...relationships.map((relationship) => relationship.disciple_person_id),
  ]);

  const [profilesResult, peopleResult] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    personIds.length
      ? supabase.from("people").select("id, first_name, last_name").in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || peopleResult.error) {
    return {
      message: profilesResult.error?.message ?? peopleResult.error?.message ?? "Unable to load DOS people.",
      status: "error",
    };
  }

  const profiles = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, toProfile(row)]));
  const people = new Map(((peopleResult.data ?? []) as PersonRow[]).map((row) => [row.id, toPerson(row)]));
  const memberIds = new Set(memberships.map((membership) => membership.profile_id));
  const mappedRelationships = relationships.map((relationship) => {
    const discipler = profiles.get(relationship.discipler_profile_id);
    const discipleProfile = relationship.disciple_profile_id ? profiles.get(relationship.disciple_profile_id) : undefined;
    const disciplePerson = relationship.disciple_person_id ? people.get(relationship.disciple_person_id) : undefined;

    return {
      discipleId: relationship.disciple_profile_id ?? relationship.disciple_person_id ?? "",
      discipleName: discipleProfile?.name ?? disciplePerson?.name ?? "Unknown disciple",
      discipleType: relationship.disciple_profile_id ? "profile" as const : "person" as const,
      disciplerId: relationship.discipler_profile_id,
      disciplerName: discipler?.name ?? "Unknown discipler",
      id: relationship.id,
      startedAt: relationship.started_at,
      status: relationship.status,
      strength: relationship.strength,
      style: relationship.style,
    };
  });
  const mappedMeetings = meetings.map((meeting) => ({
    followUpNeeded: meeting.follow_up_needed,
    id: meeting.id,
    meetingAt: meeting.meeting_at,
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
        name: people.get(person.person_id)?.name ?? "Unknown person",
        role: person.role,
      })),
    prayerRequested: meeting.prayer_requested,
    relationshipMovement: meeting.relationship_movement,
    spiritualOpennessMovement: meeting.spiritual_openness_movement,
    summaryPrivate: meeting.summary_private ?? meeting.notes_private,
    title: meeting.title,
    type: meeting.type,
  }));
  const meetingsThisMonth = mappedMeetings.filter((meeting) => isInCurrentMonth(meeting.meetingDate));
  const peopleMetThisMonth = new Set(
    meetingsThisMonth.flatMap((meeting) => meeting.people.map((person) => person.id)),
  );
  const multiplicationRoots = buildMultiplicationRoots(mappedRelationships);
  const peopleDiscipling = mappedRelationships.filter((relationship) => memberIds.has(relationship.disciplerId));
  const peopleWalkingWithUs = mappedRelationships.filter(
    (relationship) => relationship.discipleType === "profile" && memberIds.has(relationship.discipleId),
  );

  return {
    data: {
      affiliates: (affiliatesResult.data ?? []) as Array<{ id: string; name: string; slug: string }>,
      collective: {
        id: collective.id,
        name: collective.name,
        slug: collective.slug,
        type: collective.type,
      },
      fieldActivity: {
        kitchenTablesThisMonth: meetingsThisMonth.filter((meeting) => meeting.type === "kitchen_table").length,
        meetingsThisMonth: meetingsThisMonth.length,
        prayerEncounters: meetingsThisMonth.filter((meeting) => meeting.prayerRequested).length,
        uniquePeopleMetThisMonth: peopleMetThisMonth.size,
      },
      meetings: mappedMeetings,
      members: memberships.map((membership) => ({
        profile: profiles.get(membership.profile_id) ?? {
          email: null,
          firstName: "Unknown",
          id: membership.profile_id,
          lastName: "",
          name: "Unknown member",
        },
        role: membership.role,
        status: membership.status,
      })),
      multiplication: {
        activeDisciplers: uniqueStrings(mappedRelationships.map((relationship) => relationship.disciplerId)).length,
        chainCount: multiplicationRoots.length,
        roots: multiplicationRoots,
        secondGenerationDisciples: countNodesAtGeneration(multiplicationRoots, 2),
      },
      networks: ((networksResult.data ?? []) as NetworkRow[]).map((network) => ({
        id: network.id,
        name: network.name,
        organizationId: network.organization_id,
      })),
      organization,
      peopleDiscipling,
      peopleWalkingWithUs,
      relationships: mappedRelationships,
      stats: {
        meetingsThisMonth: meetingsThisMonth.length,
        multiplicationChains: multiplicationRoots.length,
        peopleDiscipling: peopleDiscipling.length,
        peopleWalkingWithUs: peopleWalkingWithUs.length,
      },
    },
    status: "ready",
  };
}
