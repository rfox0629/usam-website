import "server-only";

import {
  canEditAdminContent,
  getAdminAuthorization,
  type AdminAuthorization,
} from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type AuthorizedAdmin = Extract<AdminAuthorization, { status: "authorized" }>;

export type DosAuthorizedUser =
  | (AuthorizedAdmin & {
      access: "admin";
    })
  | {
      access: "member";
      email: string;
      isActive: true;
      phone?: string | null;
      prayerPermissions: [];
      role: "member";
      status: "authorized";
      userId: string;
    };

export type DosAuthorization =
  | DosAuthorizedUser
  | Exclude<AdminAuthorization, { status: "authorized" }>;

export type DosWorkspaceAccess =
  | {
      status: "allowed";
      workspace: {
        displayName: string;
        id: string;
        slug: string;
      };
    }
  | {
      status: "configuration_error";
      message: string;
    }
  | {
      status: "forbidden" | "not_found";
    };

type ProfileRow = {
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  primary_collective_id: string | null;
};

type CollectiveMembershipRow = {
  collective_id: string;
  status: string | null;
};

type CollectiveRow = {
  id: string;
  slug: string;
};

type TeamMemberWorkspaceRow = {
  household_id: string | null;
  status: string | null;
};

type WorkspaceRow = {
  display_name: string;
  id: string;
  slug: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// DOS keeps the admin allowlist path for Command Center operators, but normal
// users are admitted through their profile/workspace membership below.
export async function getDosAuthorization(): Promise<DosAuthorization> {
  const adminAuthorization = await getAdminAuthorization();

  if (adminAuthorization.status === "authorized") {
    return {
      ...adminAuthorization,
      access: "admin",
    };
  }

  if (adminAuthorization.status !== "unauthorized") {
    return adminAuthorization;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { status: "unauthenticated" };
  }

  return {
    access: "member",
    email: user.email.trim().toLowerCase(),
    isActive: true,
    phone: user.phone ?? null,
    prayerPermissions: [],
    role: "member",
    status: "authorized",
    userId: user.id,
  };
}

export function canWriteDosActivity(authorization: DosAuthorization) {
  if (authorization.status !== "authorized") {
    return false;
  }

  if (authorization.access === "member") {
    return true;
  }

  return canEditAdminContent(authorization);
}

export function isAdminDosAuthorization(
  authorization: DosAuthorization,
): authorization is Extract<DosAuthorization, { access: "admin"; status: "authorized" }> {
  return authorization.status === "authorized" && authorization.access === "admin";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function workspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizedPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function personalSlugCandidates(
  authorization: Extract<DosAuthorization, { access: "member"; status: "authorized" }>,
  profiles: ProfileRow[],
) {
  const profileSlugs = profiles.map((profile) => workspaceSlug([profile.first_name, profile.last_name].filter(Boolean).join(" ")));
  const emailLocalPart = workspaceSlug(authorization.email.split("@")[0]?.replace(/[._]+/g, " ") ?? "");

  return uniqueStrings([...profileSlugs, emailLocalPart]);
}

async function loadWorkspaceByRef(workspaceRef: string | null | undefined) {
  if (!workspaceRef) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("missionary_households")
    .select("id, slug, display_name");
  const { data, error } = isUuid(workspaceRef)
    ? await query.eq("id", workspaceRef).maybeSingle()
    : await query.eq("slug", workspaceRef).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceRow | null;
}

async function loadMemberProfileIds(authorization: Extract<DosAuthorization, { access: "member"; status: "authorized" }>) {
  const supabase = createSupabaseAdminClient();
  const [userProfilesResult, emailProfilesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, primary_collective_id")
      .eq("user_id", authorization.userId),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, primary_collective_id")
      .ilike("email", authorization.email),
  ]);

  if (userProfilesResult.error) {
    throw new Error(userProfilesResult.error.message);
  }

  if (emailProfilesResult.error) {
    throw new Error(emailProfilesResult.error.message);
  }

  return Array.from(
    new Map(
      ([...(userProfilesResult.data ?? []), ...(emailProfilesResult.data ?? [])] as ProfileRow[])
        .map((profile) => [profile.id, profile]),
    ).values(),
  );
}

async function loadMemberWorkspaceIdsFromTeam(authorization: Extract<DosAuthorization, { access: "member"; status: "authorized" }>) {
  const supabase = createSupabaseAdminClient();
  const workspaceRows: TeamMemberWorkspaceRow[] = [];
  const appendRows = (rows: TeamMemberWorkspaceRow[] | null | undefined) => {
    workspaceRows.push(...(rows ?? []));
  };
  const isMissingInviteColumn = (message: string) => (
    message.includes("invite_email")
    || message.includes("invite_phone")
    || message.includes("invite_phone_normalized")
    || message.includes("schema cache")
    || message.includes("could not find")
  );
  const directResult = await supabase
    .from("missionary_team_members")
    .select("household_id, status")
    .in("dos_user_id", [authorization.userId, authorization.email]);

  if (directResult.error) {
    const message = directResult.error.message.toLowerCase();

    if (!message.includes("dos_user_id") && !message.includes("schema cache") && !message.includes("could not find")) {
      throw new Error(directResult.error.message);
    }
  } else {
    appendRows(directResult.data as TeamMemberWorkspaceRow[]);
  }

  const inviteEmailResult = await supabase
    .from("missionary_team_members")
    .select("household_id, status")
    .ilike("invite_email", authorization.email);

  if (inviteEmailResult.error) {
    const message = inviteEmailResult.error.message.toLowerCase();

    if (!isMissingInviteColumn(message)) {
      throw new Error(inviteEmailResult.error.message);
    }
  } else {
    appendRows(inviteEmailResult.data as TeamMemberWorkspaceRow[]);
  }

  const phone = normalizedPhone(authorization.phone);

  if (phone) {
    const invitePhoneResult = await supabase
      .from("missionary_team_members")
      .select("household_id, status")
      .eq("invite_phone_normalized", phone);

    if (invitePhoneResult.error) {
      const message = invitePhoneResult.error.message.toLowerCase();

      if (!isMissingInviteColumn(message)) {
        throw new Error(invitePhoneResult.error.message);
      }
    } else {
      appendRows(invitePhoneResult.data as TeamMemberWorkspaceRow[]);
    }
  }

  return Array.from(new Set(workspaceRows
    .filter((member) => member.household_id && member.status !== "inactive" && member.status !== "archived")
    .map((member) => member.household_id as string)));
}

async function loadMemberWorkspaceScope(authorization: Extract<DosAuthorization, { access: "member"; status: "authorized" }>) {
  const supabase = createSupabaseAdminClient();
  const profiles = await loadMemberProfileIds(authorization);
  const profileIds = profiles.map((profile) => profile.id);
  const primaryCollectiveIds = uniqueStrings(profiles.map((profile) => profile.primary_collective_id));
  const membershipResult = profileIds.length
    ? await supabase
      .from("collective_memberships")
      .select("collective_id, status")
      .in("profile_id", profileIds)
    : { data: [], error: null };

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  const memberships = (membershipResult.data ?? []) as CollectiveMembershipRow[];
  const inactiveCollectiveIds = new Set(
    memberships
      .filter((membership) => membership.status === "inactive")
      .map((membership) => membership.collective_id),
  );
  const membershipCollectiveIds = memberships
    .filter((membership) => membership.status !== "inactive")
    .map((membership) => membership.collective_id);
  const collectiveIds = uniqueStrings([
    ...primaryCollectiveIds.filter((collectiveId) => !inactiveCollectiveIds.has(collectiveId)),
    ...membershipCollectiveIds,
  ]);
  const collectiveResult = collectiveIds.length
    ? await supabase
      .from("collectives")
      .select("id, slug")
      .in("id", collectiveIds)
    : { data: [], error: null };

  if (collectiveResult.error) {
    throw new Error(collectiveResult.error.message);
  }

  const workspaceIdsFromTeam = await loadMemberWorkspaceIdsFromTeam(authorization);

  return {
    collectiveSlugs: new Set(((collectiveResult.data ?? []) as CollectiveRow[]).map((collective) => collective.slug)),
    personalSlugs: personalSlugCandidates(authorization, profiles),
    workspaceIds: new Set(workspaceIdsFromTeam),
  };
}

export async function getDosWorkspaceAccess(
  authorization: DosAuthorization,
  workspaceRef: string | null | undefined,
): Promise<DosWorkspaceAccess> {
  if (authorization.status !== "authorized") {
    return { status: "forbidden" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      message: "Supabase admin environment variables are not configured.",
      status: "configuration_error",
    };
  }

  try {
    const workspace = await loadWorkspaceByRef(workspaceRef);

    if (!workspace) {
      return { status: "not_found" };
    }

    if (isAdminDosAuthorization(authorization)) {
      return {
        status: "allowed",
        workspace: {
          displayName: workspace.display_name,
          id: workspace.id,
          slug: workspace.slug,
        },
      };
    }

    const memberScope = await loadMemberWorkspaceScope(authorization);
    const isAllowed = memberScope.collectiveSlugs.has(workspace.slug) || memberScope.workspaceIds.has(workspace.id);

    if (!isAllowed) {
      return { status: "forbidden" };
    }

    return {
      status: "allowed",
      workspace: {
        displayName: workspace.display_name,
        id: workspace.id,
        slug: workspace.slug,
      },
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to verify DOS workspace access.",
      status: "configuration_error",
    };
  }
}

export async function getDefaultDosWorkspaceAccess(
  authorization: DosAuthorization,
): Promise<DosWorkspaceAccess> {
  if (authorization.status !== "authorized") {
    return { status: "forbidden" };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      message: "Supabase admin environment variables are not configured.",
      status: "configuration_error",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();

    if (isAdminDosAuthorization(authorization)) {
      const { data, error } = await supabase
        .from("missionary_households")
        .select("id, slug, display_name")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data
        ? {
          status: "allowed",
          workspace: {
            displayName: data.display_name,
            id: data.id,
            slug: data.slug,
          },
        }
        : { status: "not_found" };
    }

    const memberScope = await loadMemberWorkspaceScope(authorization);
    const collectiveSlugs = Array.from(memberScope.collectiveSlugs);
    const personalSlugs = memberScope.personalSlugs.filter((slug) => memberScope.collectiveSlugs.has(slug));
    const workspaceIds = Array.from(memberScope.workspaceIds);

    for (const personalSlug of personalSlugs) {
      const personalWorkspace = await loadWorkspaceByRef(personalSlug);

      if (personalWorkspace) {
        return {
          status: "allowed",
          workspace: {
            displayName: personalWorkspace.display_name,
            id: personalWorkspace.id,
            slug: personalWorkspace.slug,
          },
        };
      }
    }

    const slugResult = collectiveSlugs.length
      ? await supabase
        .from("missionary_households")
        .select("id, slug, display_name")
        .in("slug", collectiveSlugs)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null, error: null };

    if (slugResult.error) {
      throw new Error(slugResult.error.message);
    }

    if (slugResult.data) {
      return {
        status: "allowed",
        workspace: {
          displayName: slugResult.data.display_name,
          id: slugResult.data.id,
          slug: slugResult.data.slug,
        },
      };
    }

    const idResult = workspaceIds.length
      ? await supabase
        .from("missionary_households")
        .select("id, slug, display_name")
        .in("id", workspaceIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null, error: null };

    if (idResult.error) {
      throw new Error(idResult.error.message);
    }

    return idResult.data
      ? {
        status: "allowed",
        workspace: {
          displayName: idResult.data.display_name,
          id: idResult.data.id,
          slug: idResult.data.slug,
        },
      }
      : { status: "not_found" };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to verify DOS workspace access.",
      status: "configuration_error",
    };
  }
}
