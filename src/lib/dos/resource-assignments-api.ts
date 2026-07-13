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
  resourceAssignmentCommitmentTitle,
  todayResourceAssignmentDateKey,
  type DosResourceAssignmentFollowUpCadence,
  type DosResourceAssignmentStatus,
} from "@/src/lib/dos/resource-assignments";

type SupabaseQueryError = { message?: string } | null | undefined;

export const resourceAssignmentSelect = "id, workspace_id, resource_slug, person_id, assigned_by_user_id, status, start_date, due_date, completed_at, paused_at, personal_message, follow_up_cadence, linked_commitment_id, created_at, updated_at";

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
