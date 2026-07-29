export type JoinRollbackCollectiveMembershipRef = {
  collectiveId: string;
  profileId: string;
};

export type JoinRollbackResources = {
  authUserIds: string[];
  collectiveIds: string[];
  collectiveMemberships: JoinRollbackCollectiveMembershipRef[];
  householdIds: string[];
  organizationIds: string[];
  retainedProfileIds: string[];
  teamMemberIds: string[];
};

type JoinRollbackIdTable =
  | "collectives"
  | "missionary_households"
  | "missionary_team_members"
  | "organizations";

export type JoinRollbackDeleteStep =
  | {
    authUserIds: string[];
    type: "authUsers";
  }
  | {
    ids: string[];
    table: JoinRollbackIdTable;
    type: "ids";
  }
  | {
    refs: JoinRollbackCollectiveMembershipRef[];
    table: "collective_memberships";
    type: "collectiveMemberships";
  };

export function createEmptyJoinRollbackResources(): JoinRollbackResources {
  return {
    authUserIds: [],
    collectiveIds: [],
    collectiveMemberships: [],
    householdIds: [],
    organizationIds: [],
    retainedProfileIds: [],
    teamMemberIds: [],
  };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function uniqueCollectiveMemberships(refs: JoinRollbackCollectiveMembershipRef[]) {
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

export function buildJoinRollbackDeletePlan(
  resources: JoinRollbackResources,
  options: {
    blockedCollectiveIds?: string[];
    blockedHouseholdIds?: string[];
    blockedOrganizationIds?: string[];
  } = {},
): JoinRollbackDeleteStep[] {
  const steps: JoinRollbackDeleteStep[] = [];
  const blockedCollectiveIds = new Set(uniqueIds(options.blockedCollectiveIds ?? []));
  const blockedHouseholdIds = new Set(uniqueIds(options.blockedHouseholdIds ?? []));
  const blockedOrganizationIds = new Set(uniqueIds(options.blockedOrganizationIds ?? []));
  const collectiveMemberships = uniqueCollectiveMemberships(resources.collectiveMemberships);
  const pushIdStep = (table: JoinRollbackIdTable, ids: string[]) => {
    const unique = uniqueIds(ids);

    if (unique.length) {
      steps.push({ ids: unique, table, type: "ids" });
    }
  };
  const authUserIds = uniqueIds(resources.authUserIds);

  if (authUserIds.length) {
    steps.push({ authUserIds, type: "authUsers" });
  }

  if (collectiveMemberships.length) {
    steps.push({ refs: collectiveMemberships, table: "collective_memberships", type: "collectiveMemberships" });
  }

  pushIdStep("missionary_team_members", resources.teamMemberIds);
  pushIdStep(
    "missionary_households",
    uniqueIds(resources.householdIds).filter((householdId) => !blockedHouseholdIds.has(householdId)),
  );
  pushIdStep(
    "collectives",
    uniqueIds(resources.collectiveIds).filter((collectiveId) => !blockedCollectiveIds.has(collectiveId)),
  );
  pushIdStep(
    "organizations",
    uniqueIds(resources.organizationIds).filter((organizationId) => !blockedOrganizationIds.has(organizationId)),
  );

  return steps;
}
