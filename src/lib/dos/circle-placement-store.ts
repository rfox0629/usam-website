import "server-only";

import { circleTiers, type CirclePlacement, type CircleTier } from "@/src/lib/dos/circle-tiers";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

/* USA-247. The only module that reads or writes confirmed circle placement.
   Three states, per founder decision 4:
     no current row                    -> not reviewed
     placement 'reviewed_not_placed'   -> reviewed, deliberately not placed
     placement in the four tiers       -> confirmed placement
   The machine values in dos_relationship_scores are historical evidence. This
   module never reads them and never writes them. */

export const reviewedNotPlaced = "reviewed_not_placed" as const;

export type ConfirmedPlacementValue = CircleTier | typeof reviewedNotPlaced;

export type ConfirmedPlacement = {
  confirmedAt: string;
  confirmedByEmail: string | null;
  personId: string;
  placement: ConfirmedPlacementValue;
  reason: string | null;
};

export type PlacementHistoryEntry = {
  confirmedByEmail: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  personId: string;
  placement: ConfirmedPlacementValue;
};

export type PlacementChangeRequest = {
  personId: string;
  to: CirclePlacement | typeof reviewedNotPlaced;
};

export type ConfirmPlacementsResult =
  | { appliedCount: number; batchId: string; status: "applied" | "already_applied" }
  | { code: string; conflicts: PlacementCapacityConflict[]; message: string; status: "rejected" };

export type PlacementCapacityConflict = {
  capacity: number;
  label: string;
  overBy: number;
  used: number;
  view: string;
};

const placementValues = new Set<string>([...circleTiers, reviewedNotPlaced]);

function isPlacementValue(value: unknown): value is ConfirmedPlacementValue {
  return typeof value === "string" && placementValues.has(value);
}

/* Current confirmed placement for one workspace. A person with no row is
   absent from the result: that absence is the "not reviewed" state, and the
   caller must not invent a placement for them. */
export async function loadConfirmedPlacements(workspaceId: string): Promise<ConfirmedPlacement[]> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("dos_circle_placements")
    .select("person_id, placement, effective_from, confirmed_by_email, reason")
    .eq("workspace_id", workspaceId)
    .is("effective_to", null);

  if (error) {
    if (isMissingPlacementTable(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row) => {
    if (!isPlacementValue(row.placement) || typeof row.person_id !== "string") {
      return [];
    }

    return [{
      confirmedAt: String(row.effective_from),
      confirmedByEmail: typeof row.confirmed_by_email === "string" ? row.confirmed_by_email : null,
      personId: row.person_id,
      placement: row.placement,
      reason: typeof row.reason === "string" ? row.reason : null,
    }];
  });
}

/* Every placement a person has ever held, newest first, including the closed
   rows a move or a removal left behind. */
export async function loadPlacementHistory(workspaceId: string, personId: string): Promise<PlacementHistoryEntry[]> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("dos_circle_placements")
    .select("person_id, placement, effective_from, effective_to, confirmed_by_email")
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .order("effective_from", { ascending: false });

  if (error) {
    if (isMissingPlacementTable(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row) => {
    if (!isPlacementValue(row.placement) || typeof row.person_id !== "string") {
      return [];
    }

    return [{
      confirmedByEmail: typeof row.confirmed_by_email === "string" ? row.confirmed_by_email : null,
      effectiveFrom: String(row.effective_from),
      effectiveTo: row.effective_to ? String(row.effective_to) : null,
      personId: row.person_id,
      placement: row.placement,
    }];
  });
}

/* One review-and-save. The database function owns capacity, concurrency,
   idempotency and history; this wrapper only translates its refusals into
   something the surface can show without losing the operator's work. */
export async function confirmCirclePlacements(input: {
  changes: PlacementChangeRequest[];
  confirmedByEmail: string | null;
  confirmedById: string | null;
  operationKey: string;
  reason?: string | null;
  workspaceId: string;
}): Promise<ConfirmPlacementsResult> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("dos_confirm_circle_placements", {
    p_input: {
      changes: input.changes.map((change) => ({ person_id: change.personId, to: change.to })),
      confirmed_by: input.confirmedById,
      confirmed_by_email: input.confirmedByEmail,
      operation_key: input.operationKey,
      reason: input.reason ?? null,
      workspace_id: input.workspaceId,
    },
  });

  if (error) {
    return interpretPlacementError(error.message);
  }

  const result = (data ?? {}) as { applied_count?: number; batch_id?: string; status?: string };

  return {
    appliedCount: Number(result.applied_count ?? 0),
    batchId: String(result.batch_id ?? ""),
    status: result.status === "already_applied" ? "already_applied" : "applied",
  };
}

/* A refusal must say which circle is full and by how much, so the operator can
   fix it. The proposed changes are never discarded on the client. */
export function interpretPlacementError(message: string): ConfirmPlacementsResult {
  if (message.includes("circle_placement_over_capacity")) {
    const conflicts = parseConflicts(message);
    const first = conflicts[0];

    return {
      code: "over_capacity",
      conflicts,
      message: first
        ? `${first.label} would hold ${first.used}, which is ${first.overBy} more than ${first.capacity}. Move someone further out, then save again.`
        : "One of your circles would go over its limit. Move someone further out, then save again.",
      status: "rejected",
    };
  }

  if (message.includes("circle_placement_person_not_in_workspace")) {
    return {
      code: "person_not_in_workspace",
      conflicts: [],
      message: "One of those people is not in this workspace. Nothing was saved.",
      status: "rejected",
    };
  }

  if (message.includes("circle_placement_duplicate_person")) {
    return {
      code: "duplicate_person",
      conflicts: [],
      message: "The same person appears twice in this save. Nothing was saved.",
      status: "rejected",
    };
  }

  if (message.includes("circle_placement_no_changes")) {
    return { code: "no_changes", conflicts: [], message: "There is nothing to save.", status: "rejected" };
  }

  if (message.includes("circle_placement_operation_key_required")) {
    return { code: "operation_key_required", conflicts: [], message: "That save is missing its request key. Nothing was saved.", status: "rejected" };
  }

  if (message.includes("circle_placement_unknown_target") || message.includes("circle_placement_target_required")) {
    return { code: "unknown_target", conflicts: [], message: "That is not a circle DOS recognises. Nothing was saved.", status: "rejected" };
  }

  return { code: "unknown", conflicts: [], message: "Your changes could not be saved. Nothing was changed.", status: "rejected" };
}

function parseConflicts(message: string): PlacementCapacityConflict[] {
  const start = message.indexOf("[");
  const end = message.lastIndexOf("]");

  if (start < 0 || end <= start) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(message.slice(start, end + 1));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const row = entry as Record<string, unknown>;

      return [{
        capacity: Number(row.capacity ?? 0),
        label: typeof row.label === "string" ? row.label : "That circle",
        overBy: Number(row.over_by ?? 0),
        used: Number(row.used ?? 0),
        view: typeof row.view === "string" ? row.view : "",
      }];
    });
  } catch {
    return [];
  }
}

/* Before the migration runs, the table is absent. Treating that as "nobody has
   confirmed anyone yet" keeps People readable on a deployment that is ahead of
   its database, and is the same answer the feature gives on day one. */
function isMissingPlacementTable(error: { code?: string; message?: string }) {
  return error.code === "42P01" || Boolean(error.message?.includes("dos_circle_placements"));
}
