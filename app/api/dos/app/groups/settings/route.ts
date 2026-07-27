import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { loadDosGroupRoleAccess } from "@/src/lib/dos/identity";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type GroupSettingsPayload = {
  active?: unknown;
  dayOfWeek?: unknown;
  defaultLocation?: unknown;
  description?: unknown;
  endTime?: unknown;
  groupId?: unknown;
  leaderPersonId?: unknown;
  name?: unknown;
  rhythmLabel?: unknown;
  scriptureReference?: unknown;
  scriptureText?: unknown;
  slug?: unknown;
  startTime?: unknown;
  tagline?: unknown;
  type?: unknown;
  updateFutureGatheringLocations?: unknown;
  visibility?: unknown;
  workspaceId?: unknown;
};

type GroupRow = {
  active: boolean | null;
  default_location: string | null;
  description: string | null;
  id: string;
  leader_person_id: string | null;
  name: string;
  rhythm_label: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  slug: string;
  tagline: string | null;
  type: string | null;
  visibility: string | null;
};

const groupTypes = ["discipleship", "prayer", "running", "study", "table", "other"] as const;

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

function slugFromText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isValidSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,80}$/.test(value);
}

function asGroupType(value: unknown) {
  const type = asString(value);

  return groupTypes.includes(type as typeof groupTypes[number]) ? type : "discipleship";
}

function asVisibility(value: unknown) {
  return asString(value) === "workspace" ? "workspace" : "private";
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function buildRhythmLabel(payload: GroupSettingsPayload) {
  const explicitRhythm = asString(payload.rhythmLabel);
  const day = asString(payload.dayOfWeek);
  const start = asString(payload.startTime);
  const end = asString(payload.endTime);
  const timeRange = [start, end].filter(Boolean).join(" - ");
  const generated = ["Weekly", day, timeRange].filter(Boolean).join(" · ");

  return explicitRhythm || generated || null;
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

export async function PATCH(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: GroupSettingsPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const groupId = asString(payload.groupId);
  const name = asString(payload.name);
  const requestedSlug = slugFromText(asString(payload.slug) || name);

  if (!workspaceId || !groupId) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  if (!name) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }

  if (!isValidSlug(requestedSlug)) {
    return NextResponse.json({ error: "Public slug must use letters, numbers, and hyphens." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const groupAccess = await loadDosGroupRoleAccess(supabase, authResult.authorization, {
    allowedRoles: ["leader", "co_leader"],
    groupId,
    workspaceId,
  });

  if (groupAccess.status !== "allowed") {
    return NextResponse.json(
      { error: groupAccess.message },
      { status: groupAccess.status === "not_found" ? 404 : groupAccess.status === "forbidden" ? 403 : 500 },
    );
  }

  const existingGroupSelect = "id, workspace_id, slug, leader_person_id, default_location";
  const existingGroupResult = isUuid(groupId)
    ? await supabase
      .from("dos_groups")
      .select(existingGroupSelect)
      .eq("id", groupId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    : await supabase
      .from("dos_groups")
      .select(existingGroupSelect)
      .eq("slug", requestedSlug)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

  if (existingGroupResult.error) {
    return NextResponse.json({ error: existingGroupResult.error.message }, { status: 500 });
  }

  if (!existingGroupResult.data) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const resolvedGroupId = existingGroupResult.data.id;

  const duplicateSlugResult = await supabase
    .from("dos_groups")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", requestedSlug)
    .neq("id", resolvedGroupId)
    .limit(1);

  if (duplicateSlugResult.error) {
    return NextResponse.json({ error: duplicateSlugResult.error.message }, { status: 500 });
  }

  if ((duplicateSlugResult.data ?? []).length > 0) {
    return NextResponse.json({ error: "That public slug is already used by another group." }, { status: 409 });
  }

  let leaderPersonId = asString(payload.leaderPersonId);

  if (leaderPersonId) {
    if (!isUuid(leaderPersonId)) {
      leaderPersonId = existingGroupResult.data.leader_person_id ?? "";
    }
  }

  if (leaderPersonId) {
    if (!isUuid(leaderPersonId)) {
      return NextResponse.json({ error: "Selected leader is invalid." }, { status: 400 });
    }

    const leaderResult = await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("id", leaderPersonId)
      .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
      .maybeSingle();

    if (leaderResult.error) {
      return NextResponse.json({ error: leaderResult.error.message }, { status: 500 });
    }

    if (!leaderResult.data) {
      const existingLeaderMemberResult = await supabase
        .from("dos_group_members")
        .select("id")
        .eq("group_id", resolvedGroupId)
        .eq("person_id", leaderPersonId)
        .in("role", ["leader", "co_leader"])
        .neq("status", "removed")
        .limit(1);

      if (existingLeaderMemberResult.error) {
        return NextResponse.json({ error: existingLeaderMemberResult.error.message }, { status: 500 });
      }

      const isCurrentGroupLeader = existingGroupResult.data.leader_person_id === leaderPersonId;

      if (!isCurrentGroupLeader && !existingLeaderMemberResult.data?.length) {
        return NextResponse.json({ error: "Selected leader is not in this workspace." }, { status: 400 });
      }
    }
  }

  const updateRecord = {
    active: asBoolean(payload.active, true),
    default_location: asNullableString(payload.defaultLocation),
    description: asNullableString(payload.description),
    leader_person_id: leaderPersonId || null,
    name,
    rhythm_label: buildRhythmLabel(payload),
    scripture_reference: asNullableString(payload.scriptureReference),
    scripture_text: asNullableString(payload.scriptureText),
    slug: requestedSlug,
    tagline: asNullableString(payload.tagline),
    type: asGroupType(payload.type),
    updated_at: new Date().toISOString(),
    visibility: asVisibility(payload.visibility),
  };
  const { data: updatedGroup, error: updateError } = await supabase
    .from("dos_groups")
    .update(updateRecord)
    .eq("id", resolvedGroupId)
    .eq("workspace_id", workspaceId)
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, visibility, rhythm_label, default_location, leader_person_id, active")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (leaderPersonId) {
    const previousLeaderId = existingGroupResult.data.leader_person_id;

    if (previousLeaderId && previousLeaderId !== leaderPersonId) {
      await supabase
        .from("dos_group_members")
        .update({ role: "member", updated_at: new Date().toISOString() })
        .eq("group_id", resolvedGroupId)
        .eq("person_id", previousLeaderId)
        .eq("role", "leader");
    }

    const existingLeaderMemberResult = await supabase
      .from("dos_group_members")
      .select("id")
      .eq("group_id", resolvedGroupId)
      .eq("person_id", leaderPersonId)
      .maybeSingle();

    if (existingLeaderMemberResult.error) {
      return NextResponse.json({ error: existingLeaderMemberResult.error.message }, { status: 500 });
    }

    const leaderMemberWrite = existingLeaderMemberResult.data
      ? await supabase
        .from("dos_group_members")
        .update({ role: "leader", status: "active", updated_at: new Date().toISOString() })
        .eq("id", existingLeaderMemberResult.data.id)
      : await supabase
        .from("dos_group_members")
        .insert({
          group_id: resolvedGroupId,
          joined_at: new Date().toISOString(),
          notes: "Added as group leader from DOS settings.",
          person_id: leaderPersonId,
          role: "leader",
          status: "active",
        });

    if (leaderMemberWrite.error) {
      return NextResponse.json({ error: leaderMemberWrite.error.message }, { status: 500 });
    }
  }

  if (
    asBoolean(payload.updateFutureGatheringLocations)
    && asString(payload.defaultLocation) !== (existingGroupResult.data.default_location ?? "")
  ) {
    const gatheringUpdateResult = await supabase
      .from("dos_group_gatherings")
      .update({ location: asNullableString(payload.defaultLocation), updated_at: new Date().toISOString() })
      .eq("group_id", resolvedGroupId)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString());

    if (gatheringUpdateResult.error) {
      return NextResponse.json({ error: gatheringUpdateResult.error.message }, { status: 500 });
    }
  }

  const group = updatedGroup as GroupRow;
  revalidatePath("/community");
  revalidatePath("/groups");
  revalidatePath(`/community/${group.slug}`);
  revalidatePath(`/groups/${group.slug}`);

  return NextResponse.json({
    group: {
      active: group.active !== false,
      defaultLocation: group.default_location,
      description: group.description,
      id: group.id,
      leaderPersonId: group.leader_person_id,
      name: group.name,
      rhythmLabel: group.rhythm_label,
      scriptureReference: group.scripture_reference,
      scriptureText: group.scripture_text,
      slug: group.slug,
      tagline: group.tagline,
      type: group.type,
      visibility: group.visibility,
    },
    ok: true,
  });
}
