import "server-only";

import { NextResponse } from "next/server";
import {
  asString,
  commitmentsSetupResponse,
  firstDefined,
  isMissingCommitmentsSchema,
} from "@/src/lib/dos/commitments-accountability-api";
import { getDosResourceBySlug, type DosResource } from "@/src/lib/dos/resource-catalog";
import {
  defaultResourceAssignmentDueDate,
  dosResourceAssignmentFollowUpCadences,
  isDosResourceAssignmentFollowUpCadence,
  isDosResourceAssignmentStatus,
  normalizeResourceAssignmentDateKey,
  resourceAssignmentFollowUpDates,
  resourceAssignmentFollowUpScheduleTitle,
  parseResourceAssignmentFollowUpScheduleTitle,
  resourceAssignmentCommitmentTitle,
  todayResourceAssignmentDateKey,
  type DosResourceAssignmentFollowUpKind,
  type DosResourceAssignmentFollowUpCadence,
  type DosResourceAssignmentStatus,
} from "@/src/lib/dos/resource-assignments";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseQueryError = { message?: string } | null | undefined;
type ResourceAssignmentSupabase = ReturnType<typeof createSupabaseAdminClient>;

export const resourceAssignmentSelect = "id, workspace_id, resource_slug, person_id, assigned_by_user_id, status, start_date, due_date, completed_at, paused_at, personal_message, follow_up_cadence, linked_commitment_id, created_at, updated_at";
export const resourceAssignmentFollowUpScheduleSelect = "id, workspace_id, person_id, title, frequency, day_of_week, scheduled_time, start_date, next_check_in, status, created_by_user_id, created_at, updated_at";

export function isMissingResourceAssignmentsSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_resource_assignments")
    || message.includes("linked_commitment_id")
    || isMissingCommitmentsSchema(error);
}

export function resourceAssignmentsSetupResponse() {
  return commitmentsSetupResponse();
}

export function normalizeResourceAssignmentStatus(value: unknown, fallback: DosResourceAssignmentStatus = "not_started") {
  const nextValue = asString(value);

  return nextValue && isDosResourceAssignmentStatus(nextValue) ? nextValue : fallback;
}

export function normalizeResourceAssignmentFollowUpCadence(value: unknown, fallback: DosResourceAssignmentFollowUpCadence = "midpoint_and_completion") {
  const nextValue = asString(value);

  return nextValue && isDosResourceAssignmentFollowUpCadence(nextValue) ? nextValue : fallback;
}

export function resolveAssignableDosResource(value: unknown): DosResource | null {
  const slug = asString(value);
  const resource = getDosResourceBySlug(slug);

  return resource?.assignable ? resource : null;
}

export function assignmentStartDateFromPayload(value: unknown) {
  return normalizeResourceAssignmentDateKey(typeof value === "string" ? value : null);
}

export function assignmentDueDateFromPayload(value: unknown, resource: DosResource, startDate: string) {
  const explicitDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? value.trim()
    : null;

  return explicitDate ?? defaultResourceAssignmentDueDate(startDate, resource.assignmentDefaults?.durationDays);
}

export function assignmentCommitmentTitle(resource: Pick<DosResource, "title">) {
  return resourceAssignmentCommitmentTitle(resource.title);
}

export function assignmentFollowUpCadenceOptions() {
  return dosResourceAssignmentFollowUpCadences;
}

export function mapResourceAssignmentRow(row: Record<string, unknown>) {
  return {
    assignedByUserId: row.assigned_by_user_id ? String(row.assigned_by_user_id) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    followUpCadence: normalizeResourceAssignmentFollowUpCadence(row.follow_up_cadence),
    id: String(row.id),
    linkedCommitmentId: row.linked_commitment_id ? String(row.linked_commitment_id) : null,
    pausedAt: row.paused_at ? String(row.paused_at) : null,
    personId: String(row.person_id),
    personalMessage: row.personal_message ? String(row.personal_message) : null,
    resourceSlug: String(row.resource_slug),
    startDate: String(row.start_date ?? todayResourceAssignmentDateKey()),
    status: normalizeResourceAssignmentStatus(row.status),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    workspaceId: String(row.workspace_id),
  };
}

function resourceAssignmentFollowUpScheduleLike(assignmentId: string) {
  return `%[resource-assignment:${assignmentId}:%]`;
}

function scheduleKindFromRow(row: Record<string, unknown>) {
  return parseResourceAssignmentFollowUpScheduleTitle(String(row.title ?? ""))?.kind ?? null;
}

async function loadResourceAssignmentFollowUpScheduleRows({
  assignmentId,
  personId,
  supabase,
  workspaceId,
}: {
  assignmentId: string;
  personId: string;
  supabase: ResourceAssignmentSupabase;
  workspaceId: string;
}) {
  return supabase
    .from("dos_accountability_schedules")
    .select(resourceAssignmentFollowUpScheduleSelect)
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .like("title", resourceAssignmentFollowUpScheduleLike(assignmentId));
}

export async function syncResourceAssignmentFollowUpSchedules({
  assignedBy,
  assignment,
  resource,
  supabase,
  workspaceId,
}: {
  assignedBy: string | null;
  assignment: Record<string, unknown>;
  resource: Pick<DosResource, "assignmentDefaults" | "title">;
  supabase: ResourceAssignmentSupabase;
  workspaceId: string;
}) {
  const assignmentId = String(assignment.id);
  const personId = String(assignment.person_id);
  const startDate = normalizeResourceAssignmentDateKey(String(assignment.start_date ?? todayResourceAssignmentDateKey()));
  const dueDate = assignment.due_date ? String(assignment.due_date) : defaultResourceAssignmentDueDate(startDate, resource.assignmentDefaults?.durationDays);
  const followUpCadence = normalizeResourceAssignmentFollowUpCadence(assignment.follow_up_cadence, resource.assignmentDefaults?.followUpCadence ?? "midpoint_and_completion");
  const status = normalizeResourceAssignmentStatus(assignment.status);
  const desiredRows = resourceAssignmentFollowUpDates({
    dueDate,
    followUpCadence,
    startDate,
    status,
  });
  const existingResult = await loadResourceAssignmentFollowUpScheduleRows({
    assignmentId,
    personId,
    supabase,
    workspaceId,
  });

  if (existingResult.error) {
    return { error: existingResult.error };
  }

  const existingRows = (existingResult.data ?? []) as Array<Record<string, unknown>>;
  const rowsByKind = new Map<DosResourceAssignmentFollowUpKind, Array<Record<string, unknown>>>();

  existingRows.forEach((row) => {
    const kind = scheduleKindFromRow(row);

    if (!kind) {
      return;
    }

    rowsByKind.set(kind, [...(rowsByKind.get(kind) ?? []), row]);
  });

  const desiredKinds = new Set(desiredRows.map((row) => row.kind));

  for (const row of desiredRows) {
    const existingForKind = rowsByKind.get(row.kind) ?? [];
    const title = resourceAssignmentFollowUpScheduleTitle(assignmentId, row.kind);
    const firstExisting = existingForKind[0] ?? null;

    if (firstExisting) {
      const updateResult = await supabase
        .from("dos_accountability_schedules")
        .update({
          day_of_week: null,
          frequency: "one_time",
          next_check_in: row.date,
          person_id: personId,
          scheduled_time: null,
          start_date: row.date,
          status: "active",
          title,
        })
        .eq("id", String(firstExisting.id))
        .eq("workspace_id", workspaceId);

      if (updateResult.error) {
        return { error: updateResult.error };
      }

      for (const duplicate of existingForKind.slice(1)) {
        const pauseResult = await supabase
          .from("dos_accountability_schedules")
          .update({ status: "paused" })
          .eq("id", String(duplicate.id))
          .eq("workspace_id", workspaceId);

        if (pauseResult.error) {
          return { error: pauseResult.error };
        }
      }
    } else {
      const insertResult = await supabase
        .from("dos_accountability_schedules")
        .insert({
          created_by_user_id: assignedBy,
          day_of_week: null,
          frequency: "one_time",
          next_check_in: row.date,
          person_id: personId,
          scheduled_time: null,
          start_date: row.date,
          status: "active",
          title,
          workspace_id: workspaceId,
        });

      if (insertResult.error) {
        return { error: insertResult.error };
      }
    }
  }

  for (const existingRow of existingRows) {
    const kind = scheduleKindFromRow(existingRow);

    if (kind && desiredKinds.has(kind)) {
      continue;
    }

    const pauseResult = await supabase
      .from("dos_accountability_schedules")
      .update({ status: "paused" })
      .eq("id", String(existingRow.id))
      .eq("workspace_id", workspaceId);

    if (pauseResult.error) {
      return { error: pauseResult.error };
    }
  }

  return { error: null };
}

export async function pauseResourceAssignmentFollowUpSchedules({
  assignmentId,
  checkInDate,
  includeFuture = false,
  personId,
  supabase,
  workspaceId,
}: {
  assignmentId: string;
  checkInDate: string;
  includeFuture?: boolean;
  personId: string;
  supabase: ResourceAssignmentSupabase;
  workspaceId: string;
}) {
  let query = supabase
    .from("dos_accountability_schedules")
    .update({ status: "paused" })
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .eq("status", "active")
    .like("title", resourceAssignmentFollowUpScheduleLike(assignmentId));

  if (!includeFuture) {
    query = query.lte("next_check_in", checkInDate);
  }

  return query;
}

export function resourceAssignmentStatusPatch(status: DosResourceAssignmentStatus) {
  if (status === "completed") {
    return {
      completed_at: new Date().toISOString(),
      paused_at: null,
      status,
    };
  }

  if (status === "paused") {
    return {
      paused_at: new Date().toISOString(),
      status,
    };
  }

  return {
    completed_at: null,
    paused_at: null,
    status,
  };
}

export function resourceAssignmentCommitmentStatusPatch(status: DosResourceAssignmentStatus) {
  if (status === "completed") {
    return {
      completed_date: todayResourceAssignmentDateKey(),
      status: "completed",
    };
  }

  if (status === "paused") {
    return {
      completed_date: null,
      status: "paused",
    };
  }

  return {
    completed_date: null,
    status: "active",
  };
}

export function resourceAssignmentErrorResponse(error: SupabaseQueryError) {
  if (isMissingResourceAssignmentsSchema(error)) {
    return resourceAssignmentsSetupResponse();
  }

  return NextResponse.json({ error: error?.message ?? "Unable to save resource assignment." }, { status: 500 });
}

export function firstAssignmentPayloadValue(payload: Record<string, unknown>, ...keys: string[]) {
  return firstDefined(...keys.map((key) => payload[key]));
}
