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

type LaunchWorkspaceRow = WorkspaceRow & {
  public_visible: boolean | null;
  short_mission: string | null;
  show_household: boolean | null;
  sort_order: number | null;
  updated_at: string | null;
  usam_application_status: string | null;
  usam_profile_status: string | null;
};

export type DosLaunchWorkspace = {
  displayName: string;
  href: string;
  id: string;
  isConfirmedDefault: boolean;
  isLikelyTest: boolean;
  lastUpdatedAt: string | null;
  slug: string;
  statusLabel: string;
};

type DosScopeAuthorization = Pick<DosAuthorizedUser, "email" | "userId"> & {
  phone?: string | null;
};

const canonicalLaunchWorkspaceSlugs: Record<string, string> = {
  "bond-family": "dirk-bond",
};

const legacyWorkspaceSlugAliases: Record<string, string> = {
  "dirk-bond": "bond-family",
};

const launchWorkspaceDisplayNames: Record<string, string> = {
  "dirk-bond": "Dirk Bond",
};

const hiddenLaunchWorkspaceSlugs = new Set([
  "fox-family",
  "ryan-brooke-fox",
]);

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

function canonicalLaunchWorkspaceSlug(slug: string) {
  return canonicalLaunchWorkspaceSlugs[slug] ?? slug;
}

function resolveWorkspaceRef(workspaceRef: string) {
  if (isUuid(workspaceRef)) {
    return workspaceRef;
  }

  const slug = workspaceRef.trim().toLowerCase();

  return legacyWorkspaceSlugAliases[slug] ?? slug;
}

function normalizedPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function personalSlugCandidates(
  authorization: DosScopeAuthorization,
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
  const resolvedRef = resolveWorkspaceRef(workspaceRef);
  const query = supabase
    .from("missionary_households")
    .select("id, slug, display_name");
  const { data, error } = isUuid(resolvedRef)
    ? await query.eq("id", resolvedRef).maybeSingle()
    : await query.eq("slug", resolvedRef).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceRow | null;
}

function launchWorkspaceSearchText(workspace: Pick<LaunchWorkspaceRow, "display_name" | "short_mission" | "slug">) {
  return [workspace.display_name, workspace.short_mission, workspace.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isLikelyTestWorkspace(workspace: Pick<LaunchWorkspaceRow, "display_name" | "short_mission" | "slug">) {
  const text = launchWorkspaceSearchText(workspace);
  return /\b(demo|sample|seed|smoke|test)\b/.test(text) || text.includes("jointest") || text.includes("prodsmoke");
}

function isHiddenLaunchWorkspace(workspace: LaunchWorkspaceRow) {
  const slug = workspace.slug.toLowerCase();
  const text = launchWorkspaceSearchText(workspace);

  return hiddenLaunchWorkspaceSlugs.has(slug)
    || text.includes("codex joinaudit")
    || text.includes("join audit")
    || text.includes("brian jointest")
    || text.includes("join test")
    || /\bsetup\b/.test(text);
}

function isConfirmedWorkspace(workspace: LaunchWorkspaceRow) {
  if (isLikelyTestWorkspace(workspace)) {
    return false;
  }

  const applicationStatus = workspace.usam_application_status;
  const profileStatus = workspace.usam_profile_status;
  const publicProfileLive = workspace.public_visible === true && workspace.show_household !== false;

  return publicProfileLive
    || applicationStatus === "approved"
    || applicationStatus === "active"
    || profileStatus === "approved"
    || profileStatus === "published";
}

function launchWorkspaceStatus(workspace: LaunchWorkspaceRow) {
  if (isLikelyTestWorkspace(workspace)) {
    return "Setup/Test";
  }

  if (isConfirmedWorkspace(workspace)) {
    return "Confirmed";
  }

  if (workspace.usam_application_status === "application_submitted" || workspace.usam_application_status === "pending_review") {
    return "Pending Review";
  }

  if (workspace.usam_application_status === "more_info_requested") {
    return "Needs Info";
  }

  return "Available";
}

function launchWorkspaceFromRow(workspace: LaunchWorkspaceRow): DosLaunchWorkspace {
  const slug = canonicalLaunchWorkspaceSlug(workspace.slug);

  return {
    displayName: launchWorkspaceDisplayNames[slug] ?? workspace.display_name,
    href: `/dos/app?workspace=${encodeURIComponent(slug)}`,
    id: workspace.id,
    isConfirmedDefault: isConfirmedWorkspace(workspace),
    isLikelyTest: isLikelyTestWorkspace(workspace),
    lastUpdatedAt: workspace.updated_at,
    slug,
    statusLabel: launchWorkspaceStatus(workspace),
  };
}

function sortLaunchWorkspaces(workspaces: DosLaunchWorkspace[]) {
  return [...workspaces].sort((a, b) => {
    if (a.isConfirmedDefault !== b.isConfirmedDefault) {
      return a.isConfirmedDefault ? -1 : 1;
    }

    if (a.isLikelyTest !== b.isLikelyTest) {
      return a.isLikelyTest ? 1 : -1;
    }

    return (b.lastUpdatedAt ?? "").localeCompare(a.lastUpdatedAt ?? "") || a.displayName.localeCompare(b.displayName);
  });
}

function shouldShowInDosLauncher(workspace: LaunchWorkspaceRow) {
  return !isLikelyTestWorkspace(workspace)
    && !isHiddenLaunchWorkspace(workspace)
    && workspace.usam_application_status !== "archived"
    && workspace.usam_profile_status !== "archived";
}

function visibleLaunchWorkspaceRows(workspaces: LaunchWorkspaceRow[]) {
  return workspaces.filter(shouldShowInDosLauncher);
}

async function loadLaunchWorkspaceRowsByIds(workspaceIds: string[]) {
  if (!workspaceIds.length) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id, slug, display_name, public_visible, show_household, short_mission, sort_order, updated_at, usam_application_status, usam_profile_status")
    .in("id", workspaceIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LaunchWorkspaceRow[];
}

async function loadLaunchWorkspaceRowsBySlugs(slugs: string[]) {
  if (!slugs.length) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id, slug, display_name, public_visible, show_household, short_mission, sort_order, updated_at, usam_application_status, usam_profile_status")
    .in("slug", slugs);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LaunchWorkspaceRow[];
}

async function loadLaunchWorkspaceRowsForUser(authorization: DosScopeAuthorization) {
  const memberScope = await loadMemberWorkspaceScope(authorization);

  return [
    ...await loadLaunchWorkspaceRowsBySlugs(Array.from(memberScope.collectiveSlugs)),
    ...await loadLaunchWorkspaceRowsByIds(Array.from(memberScope.workspaceIds)),
  ];
}

async function loadMemberProfileIds(authorization: DosScopeAuthorization) {
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

async function loadMemberWorkspaceIdsFromTeam(authorization: DosScopeAuthorization) {
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

async function loadMemberWorkspaceScope(authorization: DosScopeAuthorization) {
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

    const scopedWorkspaceRows = visibleLaunchWorkspaceRows(await loadLaunchWorkspaceRowsForUser(authorization));

    if (scopedWorkspaceRows.length) {
      const isAllowed = scopedWorkspaceRows.some((scopedWorkspace) => scopedWorkspace.id === workspace.id);

      return isAllowed
        ? {
          status: "allowed",
          workspace: {
            displayName: workspace.display_name,
            id: workspace.id,
            slug: workspace.slug,
          },
        }
        : { status: "forbidden" };
    }

    return { status: "forbidden" };
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
    const scopedWorkspaceRows = visibleLaunchWorkspaceRows(await loadLaunchWorkspaceRowsForUser(authorization));

    if (scopedWorkspaceRows.length) {
      const defaultWorkspace = sortLaunchWorkspaces(
        Array.from(new Map(scopedWorkspaceRows.map((workspace) => [workspace.id, workspace])).values())
          .map(launchWorkspaceFromRow),
      )[0];

      return defaultWorkspace
        ? {
          status: "allowed",
          workspace: {
            displayName: defaultWorkspace.displayName,
            id: defaultWorkspace.id,
            slug: defaultWorkspace.slug,
          },
        }
        : { status: "not_found" };
    }

    if (isAdminDosAuthorization(authorization)) {
      const { data, error } = await supabase
        .from("missionary_households")
        .select("id, slug, display_name, public_visible, show_household, short_mission, sort_order, updated_at, usam_application_status, usam_profile_status")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false })
        .limit(40);

      if (error) {
        throw new Error(error.message);
      }

      const defaultWorkspace = sortLaunchWorkspaces(visibleLaunchWorkspaceRows((data ?? []) as LaunchWorkspaceRow[])
        .map(launchWorkspaceFromRow))[0];

      return defaultWorkspace
        ? {
          status: "allowed",
          workspace: {
            displayName: defaultWorkspace.displayName,
            id: defaultWorkspace.id,
            slug: defaultWorkspace.slug,
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

    const slugWorkspace = sortLaunchWorkspaces(
      visibleLaunchWorkspaceRows(await loadLaunchWorkspaceRowsBySlugs(collectiveSlugs))
        .map(launchWorkspaceFromRow),
    )[0];

    if (slugWorkspace) {
      return {
        status: "allowed",
        workspace: {
          displayName: slugWorkspace.displayName,
          id: slugWorkspace.id,
          slug: slugWorkspace.slug,
        },
      };
    }

    const idWorkspace = sortLaunchWorkspaces(
      visibleLaunchWorkspaceRows(await loadLaunchWorkspaceRowsByIds(workspaceIds))
        .map(launchWorkspaceFromRow),
    )[0];

    return idWorkspace
      ? {
        status: "allowed",
        workspace: {
          displayName: idWorkspace.displayName,
          id: idWorkspace.id,
          slug: idWorkspace.slug,
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

export async function getDosLaunchWorkspaces(
  authorization: DosAuthorization,
): Promise<DosLaunchWorkspace[]> {
  if (authorization.status !== "authorized" || !isSupabaseAdminConfigured()) {
    return [];
  }

  try {
    const supabase = createSupabaseAdminClient();
    let workspaceRows: LaunchWorkspaceRow[] = [];
    const scopedWorkspaceRows = await loadLaunchWorkspaceRowsForUser(authorization);

    if (scopedWorkspaceRows.length) {
      workspaceRows = scopedWorkspaceRows;
    } else if (isAdminDosAuthorization(authorization)) {
      const { data, error } = await supabase
        .from("missionary_households")
        .select("id, slug, display_name, public_visible, show_household, short_mission, sort_order, updated_at, usam_application_status, usam_profile_status")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false })
        .limit(40);

      if (error) {
        throw new Error(error.message);
      }

      workspaceRows = (data ?? []) as LaunchWorkspaceRow[];
    } else {
      workspaceRows = [];
    }

    const uniqueWorkspaces = Array.from(
      new Map(visibleLaunchWorkspaceRows(workspaceRows).map((workspace) => [workspace.id, workspace])).values(),
    ).map(launchWorkspaceFromRow);

    return sortLaunchWorkspaces(uniqueWorkspaces);
  } catch {
    return [];
  }
}

export function getConfirmedDosLaunchDefault(workspaces: DosLaunchWorkspace[]) {
  return workspaces.length === 1 && workspaces[0]?.isConfirmedDefault ? workspaces[0] : null;
}
