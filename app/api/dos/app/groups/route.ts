import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import {
  dosGroupsSimplifiedFeatureFlag,
  getDosGroupTemplate,
  isDosGroupTemplateKey,
  slugFromGroupName,
} from "@/src/lib/dos/groups";
import {
  missingPublicSiteSchema,
  resolveDefaultPublicSiteForWorkspace,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type GroupCreatePayload = {
  capacity?: unknown;
  coLeaderPersonIds?: unknown;
  defaultLocation?: unknown;
  helperPersonIds?: unknown;
  name?: unknown;
  primaryLeaderPersonId?: unknown;
  rhythmLabel?: unknown;
  slug?: unknown;
  templateKey?: unknown;
  visibility?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type GroupRow = {
  accepting_members: boolean | null;
  activity_type: string | null;
  active: boolean | null;
  audience: string | null;
  capacity: number | null;
  default_location: string | null;
  description: string | null;
  id: string;
  leader_person_id: string | null;
  name: string;
  primary_leader_person_id: string | null;
  public_site_id?: string | null;
  public_status?: string | null;
  rhythm_label: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  settings: Record<string, unknown> | null;
  shared_leadership_enabled: boolean | null;
  slug: string;
  tagline: string | null;
  template_category: string | null;
  template_key: string | null;
  type: string | null;
  visibility: string | null;
};

type PersonRow = {
  id: string;
  name: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function asCapacity(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  const parsed = Number(asString(value));

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function asVisibility(value: unknown) {
  return asString(value) === "workspace" ? "workspace" : "private";
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function workspaceHasGroupsV2Feature(supabase: ReturnType<typeof createSupabaseAdminClient>, workspaceId: string) {
  const { data, error } = await supabase
    .from("dos_workspace_feature_flags")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("flag_key", dosGroupsSimplifiedFeatureFlag)
    .maybeSingle();

  if (error) {
    return { enabled: false, error };
  }

  return { enabled: data?.enabled === true, error: null };
}

async function uniqueGroupSlug(supabase: ReturnType<typeof createSupabaseAdminClient>, workspaceId: string, requestedSlug: string) {
  const baseSlug = slugFromGroupName(requestedSlug || "group") || "group";

  for (let index = 0; index < 25; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const { data, error } = await supabase
      .from("dos_groups")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .limit(1);

    if (error) {
      return { error, slug: null };
    }

    if (!(data ?? []).length) {
      return { error: null, slug };
    }
  }

  return { error: new Error("Unable to generate a unique group slug."), slug: null };
}

async function loadWorkspacePeople(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  personIds: string[],
) {
  const uniqueIds = Array.from(new Set(personIds.filter(isUuid)));

  if (!uniqueIds.length) {
    return { error: null, people: [] as PersonRow[] };
  }

  const { data, error } = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .in("id", uniqueIds)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`);

  if (error) {
    return { error, people: [] as PersonRow[] };
  }

  return { error: null, people: (data ?? []) as PersonRow[] };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: GroupCreatePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const templateKey = asString(payload.templateKey);

  if (!isDosGroupTemplateKey(templateKey)) {
    return NextResponse.json({ error: "Choose an approved group template." }, { status: 400 });
  }

  const template = getDosGroupTemplate(templateKey);

  if (!template) {
    return NextResponse.json({ error: "Group template not found." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const featureResult = await workspaceHasGroupsV2Feature(supabase, workspaceId);

  if (featureResult.error) {
    return NextResponse.json({ error: featureResult.error.message }, { status: 500 });
  }

  if (!featureResult.enabled) {
    return NextResponse.json({ error: "Groups V2 is not enabled for this workspace." }, { status: 403 });
  }

  const name = asString(payload.name) || template.defaultName;
  const slugResult = await uniqueGroupSlug(supabase, workspaceId, asString(payload.slug) || template.defaultSlug || name);

  if (slugResult.error || !slugResult.slug) {
    return NextResponse.json({ error: slugResult.error?.message ?? "Unable to create group slug." }, { status: 500 });
  }

  const primaryLeaderPersonId = asString(payload.primaryLeaderPersonId);
  const coLeaderPersonIds = asStringArray(payload.coLeaderPersonIds);
  const helperPersonIds = asStringArray(payload.helperPersonIds);
  const leaderPersonIds = [primaryLeaderPersonId, ...coLeaderPersonIds, ...helperPersonIds].filter(Boolean);
  const peopleResult = await loadWorkspacePeople(supabase, workspaceId, leaderPersonIds);

  if (peopleResult.error) {
    return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });
  }

  const validPersonIds = new Set(peopleResult.people.map((person) => person.id));
  const invalidPersonId = leaderPersonIds.find((personId) => !validPersonIds.has(personId));

  if (invalidPersonId) {
    return NextResponse.json({ error: "Selected leader is not in this workspace." }, { status: 400 });
  }

  const defaultPublicSiteResult = await resolveDefaultPublicSiteForWorkspace(supabase, workspaceId);

  if (defaultPublicSiteResult.error) {
    return NextResponse.json({ error: defaultPublicSiteResult.error.message }, { status: 500 });
  }

  const baseGroupRecord = {
    accepting_members: true,
    active: true,
    activity_type: template.activityType,
    audience: template.audience,
    capacity: asCapacity(payload.capacity),
    default_location: asNullableString(payload.defaultLocation),
    description: template.description,
    leader_person_id: primaryLeaderPersonId || null,
    name,
    primary_leader_person_id: primaryLeaderPersonId || null,
    rhythm_label: asNullableString(payload.rhythmLabel),
    scripture_reference: template.scriptureReference,
    scripture_text: template.scriptureText,
    settings: {
      privacy: "private_by_default",
      records: "shared_group_gatherings_private_person_notes",
    },
    shared_leadership_enabled: true,
    slug: slugResult.slug,
    tagline: template.tagline,
    template_category: template.category,
    template_key: template.templateKey,
    type: template.category === "activity"
      ? template.activityType === "running" ? "running" : "other"
      : "discipleship",
    visibility: asVisibility(payload.visibility),
    workspace_id: workspaceId,
  };
  const groupRecord = {
    ...baseGroupRecord,
    organization_id: defaultPublicSiteResult.organizationId,
    public_site_id: defaultPublicSiteResult.site?.id ?? null,
    public_status: defaultPublicSiteResult.site?.id ? "published" : "draft",
  };

  let createResult = await supabase
    .from("dos_groups")
    .insert(groupRecord)
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, visibility, rhythm_label, default_location, leader_person_id, primary_leader_person_id, template_key, template_category, audience, activity_type, capacity, accepting_members, shared_leadership_enabled, settings, active")
    .single();

  if (missingPublicSiteSchema(createResult.error)) {
    createResult = await supabase
      .from("dos_groups")
      .insert(baseGroupRecord)
      .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, visibility, rhythm_label, default_location, leader_person_id, primary_leader_person_id, template_key, template_category, audience, activity_type, capacity, accepting_members, shared_leadership_enabled, settings, active")
      .single();
  }

  const { data: createdGroup, error: createError } = createResult;

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const membershipRows = [
    ...(primaryLeaderPersonId ? [{
      group_id: createdGroup.id,
      notes: "Added as primary leader during group creation.",
      permissions: { can_log_gatherings: true, can_manage_group: true, can_manage_people: true },
      person_id: primaryLeaderPersonId,
      role: "leader",
      status: "active",
      title: "Primary Leader",
    }] : []),
    ...coLeaderPersonIds.filter((personId) => personId !== primaryLeaderPersonId).map((personId) => ({
      group_id: createdGroup.id,
      notes: "Added as co-leader during group creation.",
      permissions: { can_log_gatherings: true, can_manage_people: true },
      person_id: personId,
      role: "co_leader",
      status: "active",
      title: "Co-Leader",
    })),
    ...helperPersonIds.filter((personId) => personId !== primaryLeaderPersonId && !coLeaderPersonIds.includes(personId)).map((personId) => ({
      group_id: createdGroup.id,
      notes: "Added as helper during group creation.",
      permissions: { can_log_gatherings: true },
      person_id: personId,
      role: "helper",
      status: "active",
      title: "Helper",
    })),
  ];

  if (membershipRows.length) {
    const { error: membershipError } = await supabase
      .from("dos_group_members")
      .insert(membershipRows);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${createdGroup.slug}`);

  const peopleById = new Map(peopleResult.people.map((person) => [person.id, person.name ?? "Field person"]));
  const members = membershipRows.map((member) => ({
    id: `${createdGroup.id}:${member.person_id}`,
    joinedAt: new Date().toISOString(),
    notes: member.notes,
    permissions: member.permissions,
    personId: member.person_id,
    personName: peopleById.get(member.person_id) ?? "Field person",
    role: member.role,
    status: "active",
    title: member.title,
  }));
  const group = createdGroup as GroupRow;

  return NextResponse.json({
    group: {
      acceptingMembers: group.accepting_members !== false,
      active: group.active !== false,
      activityType: group.activity_type,
      audience: group.audience,
      capacity: group.capacity,
      defaultLocation: group.default_location,
      description: group.description,
      gatherings: [],
      id: group.id,
      imageUrl: null,
      leaderName: primaryLeaderPersonId ? peopleById.get(primaryLeaderPersonId) ?? null : null,
      leaderPersonId: group.leader_person_id,
      memberCount: members.length,
      members,
      name: group.name,
      prayerRequests: [],
      primaryLeaderPersonId: group.primary_leader_person_id,
      resources: [],
      rhythmLabel: group.rhythm_label,
      scriptureReference: group.scripture_reference,
      scriptureText: group.scripture_text,
      settings: group.settings ?? {},
      sharedLeadershipEnabled: group.shared_leadership_enabled === true,
      slug: group.slug,
      tagline: group.tagline,
      templateCategory: group.template_category,
      templateKey: group.template_key,
      type: group.type,
      visibility: group.visibility,
    },
    ok: true,
  });
}
