import "server-only";

import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorization } from "@/src/lib/dos/auth";
import {
  dosCommitmentsFeatureFlag,
  isDosAccountabilityFrequency,
  isDosAccountabilityScheduleStatus,
  isDosCommitmentCategory,
  isDosCommitmentProgressState,
  isDosCommitmentStatus,
  normalizeDateKey,
  todayDateKey,
  type DosAccountabilityFrequency,
  type DosAccountabilityScheduleStatus,
  type DosCommitmentStatus,
} from "@/src/lib/dos/commitments-accountability";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

export type DosCommitmentsRequestPayload = Record<string, unknown>;
export { todayDateKey };

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

export function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

export function asDateKey(value: unknown, fallback = todayDateKey()) {
  return normalizeDateKey(typeof value === "string" ? value : null, fallback);
}

export function asNullableDateKey(value: unknown) {
  const nextValue = asString(value);

  return nextValue && /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : null;
}

export function asNullableInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const parsed = Number.parseInt(asString(value), 10);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

export function asOptionalWeekday(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isMissingCommitmentsSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return [
    "dos_workspace_feature_flags",
    "dos_person_commitments",
    "dos_commitment_updates",
    "dos_accountability_schedules",
    "dos_accountability_check_ins",
    "dos_accountability_check_in_commitments",
  ].some((tableName) => message.includes(tableName))
    || (message.includes("schema cache") && (message.includes("commitment") || message.includes("accountability")));
}

export function commitmentsSetupResponse() {
  return NextResponse.json({ error: "Commitments and accountability are not ready yet." }, { status: 500 });
}

export function commitmentsFeatureDisabledResponse() {
  return NextResponse.json({ error: "Commitments and accountability are not enabled for this workspace." }, { status: 403 });
}

export async function readCommitmentsPayload(request: Request) {
  try {
    return await request.json() as DosCommitmentsRequestPayload;
  } catch {
    return null;
  }
}

export async function authorizeDosCommitmentsWrite() {
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

export async function resolveAuthorizedCommitmentsWorkspace(
  authorization: DosAuthorization,
  workspaceRef: unknown,
): Promise<{ response: NextResponse } | { workspaceId: string }> {
  const workspaceId = await resolveDosAppWorkspaceId(asString(workspaceRef));

  if (!workspaceId) {
    return { response: NextResponse.json({ error: "Workspace is required." }, { status: 400 }) };
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspaceId);

  if ("response" in workspaceAccess && workspaceAccess.response) {
    return { response: workspaceAccess.response };
  }

  return { workspaceId };
}

export async function workspaceHasCommitmentsFeature(supabase: SupabaseAdminClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("dos_workspace_feature_flags")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("flag_key", dosCommitmentsFeatureFlag)
    .maybeSingle();

  if (error && isMissingCommitmentsSchema(error)) {
    return { enabled: false, error: null };
  }

  return { enabled: data?.enabled === true, error };
}

export async function loadWorkspacePerson({
  personId,
  supabase,
  workspaceId,
}: {
  personId: string;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const scopedPersonResult = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .eq("id", personId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  const { data, error } = scopedPersonResult.error && isMissingWorkspaceScopeColumn(scopedPersonResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id, name")
      .eq("id", personId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedPersonResult;

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string; name: string } | null;
}

export async function requireCommitmentsFeature(supabase: SupabaseAdminClient, workspaceId: string) {
  const feature = await workspaceHasCommitmentsFeature(supabase, workspaceId);

  if (feature.error) {
    return { response: NextResponse.json({ error: feature.error.message }, { status: 500 }) };
  }

  if (!feature.enabled) {
    return { response: commitmentsFeatureDisabledResponse() };
  }

  return { enabled: true };
}

export function normalizeCommitmentCategory(value: unknown) {
  const nextValue = asString(value);

  return nextValue && isDosCommitmentCategory(nextValue) ? nextValue : null;
}

export function normalizeCommitmentStatus(value: unknown, fallback: DosCommitmentStatus = "active") {
  const nextValue = asString(value);

  return nextValue && isDosCommitmentStatus(nextValue) ? nextValue : fallback;
}

export function normalizeProgressState(value: unknown) {
  const nextValue = asString(value);

  return nextValue && isDosCommitmentProgressState(nextValue) ? nextValue : null;
}

export function normalizeAccountabilityFrequency(value: unknown): DosAccountabilityFrequency {
  const nextValue = asString(value);

  return nextValue && isDosAccountabilityFrequency(nextValue) ? nextValue : "weekly";
}

export function normalizeScheduleStatus(value: unknown, fallback: DosAccountabilityScheduleStatus = "active") {
  const nextValue = asString(value);

  return nextValue && isDosAccountabilityScheduleStatus(nextValue) ? nextValue : fallback;
}

export function mapCommitmentRow(row: Record<string, unknown>, updates: Array<Record<string, unknown>> = []) {
  return {
    assignedDate: String(row.assigned_date ?? todayDateKey()),
    category: row.category ? String(row.category) : null,
    completedDate: row.completed_date ? String(row.completed_date) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    description: row.description ? String(row.description) : null,
    id: String(row.id),
    personId: String(row.person_id),
    status: normalizeCommitmentStatus(row.status),
    targetDate: row.target_date ? String(row.target_date) : null,
    title: String(row.title ?? ""),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    updates: updates.map(mapCommitmentUpdateRow),
    workspaceId: String(row.workspace_id),
  };
}

export function mapCommitmentUpdateRow(row: Record<string, unknown>) {
  return {
    commitmentId: String(row.commitment_id),
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    id: String(row.id),
    personId: String(row.person_id),
    progressNote: String(row.progress_note ?? ""),
    progressState: normalizeProgressState(row.progress_state),
    updateDate: String(row.update_date ?? todayDateKey()),
    workspaceId: String(row.workspace_id),
  };
}

export function mapAccountabilityScheduleRow(row: Record<string, unknown>) {
  return {
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    dayOfWeek: typeof row.day_of_week === "number" ? row.day_of_week : null,
    frequency: normalizeAccountabilityFrequency(row.frequency),
    id: String(row.id),
    nextCheckIn: String(row.next_check_in ?? todayDateKey()),
    personId: String(row.person_id),
    scheduledTime: row.scheduled_time ? String(row.scheduled_time) : null,
    startDate: String(row.start_date ?? todayDateKey()),
    status: normalizeScheduleStatus(row.status),
    title: String(row.title ?? ""),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    workspaceId: String(row.workspace_id),
  };
}

export function mapAccountabilityCheckInRow(row: Record<string, unknown>) {
  return {
    checkInDate: String(row.check_in_date ?? todayDateKey()),
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    durationMinutes: typeof row.duration_minutes === "number" ? row.duration_minutes : null,
    followUp: row.follow_up ? String(row.follow_up) : null,
    generalUpdate: String(row.general_update ?? ""),
    id: String(row.id),
    personId: String(row.person_id),
    prayerNeeds: row.prayer_needs ? String(row.prayer_needs) : null,
    scheduleId: row.schedule_id ? String(row.schedule_id) : null,
    struggles: row.struggles ? String(row.struggles) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    wins: row.wins ? String(row.wins) : null,
    workspaceId: String(row.workspace_id),
  };
}
