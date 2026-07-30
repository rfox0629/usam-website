import { buildJoinRollbackDeletePlan, type JoinRollbackDeleteStep, type JoinRollbackResources } from "@/src/lib/join/rollback-policy";

type SupabaseLike = {
  auth: {
    admin: {
      deleteUser: (id: string) => Promise<{ error?: { message?: string } | null }>;
    };
  };
  from: (tableName: string) => any;
};

type JoinRollbackLogger = (message: string) => void;

export type JoinRollbackCleanupResult = {
  failedSteps: number;
  skippedDeletes: number;
};

function warnSkippedRollbackDelete(
  logger: JoinRollbackLogger,
  resourceName: string,
  requestedCount: number,
  deletedCount: number,
) {
  const skippedCount = requestedCount - deletedCount;

  if (skippedCount > 0) {
    logger(`Join rollback skipped ${skippedCount} ${resourceName} delete(s) because ownership was ambiguous.`);
  }
}

function warnCleanupFailure(logger: JoinRollbackLogger, resourceName: string) {
  logger(`Join rollback cleanup failed for ${resourceName}; continuing with remaining cleanup.`);
}

async function hasRemainingRows(
  supabase: SupabaseLike,
  tableName: "collective_memberships" | "collectives" | "missionary_team_members" | "profiles" | "usam_missionary_applications",
  columnName: "collective_id" | "owner_organization_id" | "primary_collective_id" | "workspace_id" | "household_id",
  value: string,
  logger: JoinRollbackLogger,
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .eq(columnName, value)
    .limit(1);

  if (error) {
    warnCleanupFailure(logger, `${tableName} reference check`);

    return true;
  }

  return Boolean(data?.length);
}

async function householdHasRemainingReferences(supabase: SupabaseLike, householdId: string, logger: JoinRollbackLogger) {
  return await hasRemainingRows(supabase, "missionary_team_members", "household_id", householdId, logger)
    || await hasRemainingRows(supabase, "usam_missionary_applications", "workspace_id", householdId, logger);
}

async function collectiveHasRemainingReferences(supabase: SupabaseLike, collectiveId: string, logger: JoinRollbackLogger) {
  return await hasRemainingRows(supabase, "profiles", "primary_collective_id", collectiveId, logger)
    || await hasRemainingRows(supabase, "collective_memberships", "collective_id", collectiveId, logger);
}

async function organizationHasRemainingReferences(supabase: SupabaseLike, organizationId: string, logger: JoinRollbackLogger) {
  return await hasRemainingRows(supabase, "profiles", "owner_organization_id", organizationId, logger)
    || await hasRemainingRows(supabase, "collectives", "owner_organization_id", organizationId, logger);
}

async function deleteRollbackStep(
  supabase: SupabaseLike,
  step: JoinRollbackDeleteStep,
  logger: JoinRollbackLogger,
): Promise<JoinRollbackCleanupResult> {
  if (step.type === "authUsers") {
    let failedSteps = 0;

    for (const authUserId of step.authUserIds) {
      const { error } = await supabase.auth.admin.deleteUser(authUserId);

      if (error) {
        failedSteps += 1;
        warnCleanupFailure(logger, "auth user");
      }
    }

    return { failedSteps, skippedDeletes: 0 };
  }

  if (step.type === "collectiveMemberships") {
    let failedSteps = 0;

    for (const ref of step.refs) {
      const { error } = await supabase
        .from(step.table)
        .delete()
        .match({ collective_id: ref.collectiveId, profile_id: ref.profileId });

      if (error) {
        failedSteps += 1;
        warnCleanupFailure(logger, "collective membership");
      }
    }

    return { failedSteps, skippedDeletes: 0 };
  }

  if (step.table === "missionary_households") {
    const deletableHouseholdIds: string[] = [];

    for (const householdId of step.ids) {
      if (!await householdHasRemainingReferences(supabase, householdId, logger)) {
        deletableHouseholdIds.push(householdId);
      }
    }

    const skippedDeletes = step.ids.length - deletableHouseholdIds.length;

    if (deletableHouseholdIds.length) {
      const { error } = await supabase.from(step.table).delete().in("id", deletableHouseholdIds);

      if (error) {
        warnCleanupFailure(logger, "household");

        return { failedSteps: 1, skippedDeletes };
      }
    }

    warnSkippedRollbackDelete(logger, "household", step.ids.length, deletableHouseholdIds.length);

    return { failedSteps: 0, skippedDeletes };
  }

  if (step.table === "collectives") {
    const deletableCollectiveIds: string[] = [];

    for (const collectiveId of step.ids) {
      if (!await collectiveHasRemainingReferences(supabase, collectiveId, logger)) {
        deletableCollectiveIds.push(collectiveId);
      }
    }

    const skippedDeletes = step.ids.length - deletableCollectiveIds.length;

    if (deletableCollectiveIds.length) {
      const { error } = await supabase.from(step.table).delete().in("id", deletableCollectiveIds);

      if (error) {
        warnCleanupFailure(logger, "collective");

        return { failedSteps: 1, skippedDeletes };
      }
    }

    warnSkippedRollbackDelete(logger, "collective", step.ids.length, deletableCollectiveIds.length);

    return { failedSteps: 0, skippedDeletes };
  }

  if (step.table === "organizations") {
    const deletableOrganizationIds: string[] = [];

    for (const organizationId of step.ids) {
      if (!await organizationHasRemainingReferences(supabase, organizationId, logger)) {
        deletableOrganizationIds.push(organizationId);
      }
    }

    const skippedDeletes = step.ids.length - deletableOrganizationIds.length;

    if (deletableOrganizationIds.length) {
      const { error } = await supabase.from(step.table).delete().in("id", deletableOrganizationIds);

      if (error) {
        warnCleanupFailure(logger, "organization");

        return { failedSteps: 1, skippedDeletes };
      }
    }

    warnSkippedRollbackDelete(logger, "organization", step.ids.length, deletableOrganizationIds.length);

    return { failedSteps: 0, skippedDeletes };
  }

  const { error } = await supabase.from(step.table).delete().in("id", step.ids);

  if (error) {
    warnCleanupFailure(logger, step.table);

    return { failedSteps: 1, skippedDeletes: 0 };
  }

  return { failedSteps: 0, skippedDeletes: 0 };
}

export async function cleanupJoinCreatedResources(
  supabase: SupabaseLike,
  resources: JoinRollbackResources,
  logger: JoinRollbackLogger = console.warn,
): Promise<JoinRollbackCleanupResult> {
  const deletePlan = buildJoinRollbackDeletePlan(resources);
  const result: JoinRollbackCleanupResult = { failedSteps: 0, skippedDeletes: 0 };

  // USA-111: failed cleanup is recorded and the remaining safe cleanup steps still run.
  for (const step of deletePlan) {
    try {
      const stepResult = await deleteRollbackStep(supabase, step, logger);

      result.failedSteps += stepResult.failedSteps;
      result.skippedDeletes += stepResult.skippedDeletes;
    } catch {
      result.failedSteps += 1;
      warnCleanupFailure(logger, "rollback step");
    }
  }

  return result;
}
