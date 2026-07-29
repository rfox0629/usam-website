export type PortalRollbackOrganizationMembershipRef = {
  organizationId: string;
  profileId: string;
};

export type PortalRollbackCollectiveMembershipRef = {
  collectiveId: string;
  profileId: string;
};

export type PortalRollbackResources = {
  collectiveIds: string[];
  collectiveMemberships: PortalRollbackCollectiveMembershipRef[];
  fieldPersonIds: string[];
  householdIds: string[];
  organizationIds: string[];
  organizationMemberships: PortalRollbackOrganizationMembershipRef[];
  profileIds: string[];
  teamMemberIds: string[];
};

type PortalRollbackIdTable =
  | "collectives"
  | "missionary_field_people"
  | "missionary_households"
  | "missionary_team_members"
  | "organizations"
  | "profiles";

export type PortalRollbackDeleteStep =
  | {
    ids: string[];
    table: PortalRollbackIdTable;
    type: "ids";
  }
  | {
    refs: PortalRollbackCollectiveMembershipRef[];
    table: "collective_memberships";
    type: "collectiveMemberships";
  }
  | {
    refs: PortalRollbackOrganizationMembershipRef[];
    table: "organization_memberships";
    type: "organizationMemberships";
  };

export function createEmptyPortalRollbackResources(): PortalRollbackResources {
  return {
    collectiveIds: [],
    collectiveMemberships: [],
    fieldPersonIds: [],
    householdIds: [],
    organizationIds: [],
    organizationMemberships: [],
    profileIds: [],
    teamMemberIds: [],
  };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function uniqueOrganizationMemberships(refs: PortalRollbackOrganizationMembershipRef[]) {
  const seen = new Set<string>();

  return refs.filter((ref) => {
    if (!ref.organizationId || !ref.profileId) {
      return false;
    }

    const key = `${ref.organizationId}:${ref.profileId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function uniqueCollectiveMemberships(refs: PortalRollbackCollectiveMembershipRef[]) {
  const seen = new Set<string>();

  return refs.filter((ref) => {
    if (!ref.collectiveId || !ref.profileId) {
      return false;
    }

    const key = `${ref.collectiveId}:${ref.profileId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

export function buildPortalRollbackDeletePlan(
  resources: PortalRollbackResources,
  options: { blockedOrganizationIds?: string[] } = {},
): PortalRollbackDeleteStep[] {
  const steps: PortalRollbackDeleteStep[] = [];
  const blockedOrganizationIds = new Set(uniqueIds(options.blockedOrganizationIds ?? []));
  const collectiveMemberships = uniqueCollectiveMemberships(resources.collectiveMemberships);
  const organizationMemberships = uniqueOrganizationMemberships(resources.organizationMemberships);
  const pushIdStep = (table: PortalRollbackIdTable, ids: string[]) => {
    const unique = uniqueIds(ids);

    if (unique.length) {
      steps.push({ ids: unique, table, type: "ids" });
    }
  };

  if (collectiveMemberships.length) {
    steps.push({ refs: collectiveMemberships, table: "collective_memberships", type: "collectiveMemberships" });
  }

  if (organizationMemberships.length) {
    steps.push({ refs: organizationMemberships, table: "organization_memberships", type: "organizationMemberships" });
  }

  pushIdStep("missionary_team_members", resources.teamMemberIds);
  pushIdStep("missionary_field_people", resources.fieldPersonIds);
  pushIdStep("missionary_households", resources.householdIds);
  pushIdStep("profiles", resources.profileIds);
  pushIdStep("collectives", resources.collectiveIds);

  const deletableOrganizationIds = uniqueIds(resources.organizationIds)
    .filter((organizationId) => !blockedOrganizationIds.has(organizationId));

  pushIdStep("organizations", deletableOrganizationIds);

  return steps;
}
