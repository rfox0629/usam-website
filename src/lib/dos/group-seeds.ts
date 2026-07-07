import "server-only";

import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

type RyanWorkspaceSeedTarget = {
  id: string;
  public_slug?: string | null;
  slug: string;
};

type ExistingPersonRow = {
  created_at: string | null;
  field_visibility: string | null;
  id: string;
  name: string | null;
  status: string | null;
  updated_at: string | null;
};

type RyanDosGroupSeed = {
  defaultLocation: string | null;
  description: string;
  gatheringDescription: string;
  gatheringTitle: string;
  name: string;
  rhythmLabel: string;
  scriptureReference: string | null;
  scriptureText: string | null;
  slug: string;
  tagline: string;
  type: "discipleship" | "running";
  visibility: "private";
  weekDay: number;
};

export const ryanDosGroupSeeds: RyanDosGroupSeed[] = [
  {
    defaultLocation: "Lebanon Hills Trailhead, Eagan, MN",
    description: "A men's discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.",
    gatheringDescription: "Run together, pair up two-by-two, and pray along the trail.",
    gatheringTitle: "Saturday Run & Prayer",
    name: "2three2",
    rhythmLabel: "Weekly · Saturday · 7:00 AM",
    scriptureReference: "2 Timothy 2:22",
    scriptureText: "Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.",
    slug: "2three2",
    tagline: "Run. Pray. Pursue.",
    type: "running",
    visibility: "private",
    weekDay: 6,
  },
  {
    defaultLocation: "Location TBD",
    description: "A weekly gathering focused on Scripture, accountability, prayer, and helping men pursue Christ together.",
    gatheringDescription: "Scripture, accountability, prayer, and next steps together.",
    gatheringTitle: "Tuesday Men's Group",
    name: "Tuesday Men's Group",
    rhythmLabel: "Weekly · Tuesday · 6:00 AM",
    scriptureReference: null,
    scriptureText: null,
    slug: "tuesday-mens-group",
    tagline: "Grow together.",
    type: "discipleship",
    visibility: "private",
    weekDay: 2,
  },
  {
    defaultLocation: "Location TBD",
    description: "An evening gathering where men encourage one another, study Scripture, pray together, and build authentic Christian community.",
    gatheringDescription: "Encouragement, Scripture, prayer, and authentic Christian community.",
    gatheringTitle: "Wednesday Men's Group",
    name: "Wednesday Men's Group",
    rhythmLabel: "Weekly · Wednesday · Evening",
    scriptureReference: null,
    scriptureText: null,
    slug: "wednesday-mens-group",
    tagline: "Brotherhood. Prayer. Discipleship.",
    type: "discipleship",
    visibility: "private",
    weekDay: 3,
  },
];

function isMissingDosGroupSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return [
    "dos_groups",
    "dos_group_members",
  ].some((tableName) => message.includes(tableName))
    && (
      message.includes("does not exist")
      || message.includes("relation")
      || message.includes("schema cache")
      || message.includes("could not find")
    );
}

function isRyanDosWorkspace(workspace: RyanWorkspaceSeedTarget) {
  return [
    workspace.slug,
    workspace.public_slug,
  ].some((slug) => slug === "ryan-fox" || slug === "ryan-brooke-fox" || slug === "fox-family");
}

function ryanLeaderScore(person: ExistingPersonRow) {
  const name = person.name?.trim().toLowerCase() ?? "";
  const visibilityScore = person.field_visibility === "primary" ? 0 : person.field_visibility === "secondary" ? 1 : 2;
  const nameScore = name === "ryan fox" ? 0 : name.includes("ryan") && name.includes("fox") ? 1 : name === "ryan" ? 2 : 3;

  return `${nameScore}:${visibilityScore}:${person.updated_at ?? ""}:${person.created_at ?? ""}`;
}

async function loadRyanLeaderPersonId(supabase: SupabaseAdminClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("missionary_field_people")
    .select("id, name, status, field_visibility, updated_at, created_at")
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .limit(200);

  if (error) {
    return { error, personId: null };
  }

  const people = ((data ?? []) as ExistingPersonRow[])
    .filter((person) => {
      const name = person.name?.trim().toLowerCase() ?? "";
      const status = person.status?.trim().toLowerCase() ?? "active";

      return !["archived", "deleted"].includes(status)
        && (name === "ryan fox" || name === "ryan" || (name.includes("ryan") && name.includes("fox")));
    })
    .sort((first, second) => ryanLeaderScore(first).localeCompare(ryanLeaderScore(second)));

  return { error: null, personId: people[0]?.id ?? null };
}

export async function ensureRyanDosWorkspaceGroups(
  supabase: SupabaseAdminClient,
  workspace: RyanWorkspaceSeedTarget,
) {
  if (!isRyanDosWorkspace(workspace)) {
    return { error: null, seeded: false };
  }

  const [organizationResult, leaderResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id")
      .eq("slug", "usa-missionaries")
      .maybeSingle(),
    loadRyanLeaderPersonId(supabase, workspace.id),
  ]);

  if (organizationResult.error) {
    return { error: organizationResult.error, seeded: false };
  }

  if (leaderResult.error) {
    return { error: leaderResult.error, seeded: false };
  }

  const groupRows = ryanDosGroupSeeds.map((group) => ({
    active: true,
    default_location: group.defaultLocation,
    description: group.description,
    name: group.name,
    organization_id: organizationResult.data?.id ?? null,
    rhythm_label: group.rhythmLabel,
    scripture_reference: group.scriptureReference,
    scripture_text: group.scriptureText,
    slug: group.slug,
    tagline: group.tagline,
    type: group.type,
    visibility: group.visibility,
    workspace_id: workspace.id,
    ...(leaderResult.personId ? { leader_person_id: leaderResult.personId } : {}),
  }));

  const { data: seededGroups, error: groupsError } = await supabase
    .from("dos_groups")
    .upsert(groupRows, { onConflict: "workspace_id,slug" })
    .select("id, slug");

  if (groupsError) {
    return {
      error: isMissingDosGroupSchema(groupsError) ? null : groupsError,
      seeded: false,
    };
  }

  if (leaderResult.personId && seededGroups?.length) {
    const membershipRows = seededGroups.map((group) => ({
      group_id: group.id,
      notes: "Seeded from the existing Ryan Fox person record.",
      person_id: leaderResult.personId,
      role: "leader",
      status: "active",
    }));
    const { error: membershipError } = await supabase
      .from("dos_group_members")
      .upsert(membershipRows, { onConflict: "group_id,person_id" });

    if (membershipError && !isMissingDosGroupSchema(membershipError)) {
      return { error: membershipError, seeded: false };
    }
  }

  return { error: null, seeded: true };
}
