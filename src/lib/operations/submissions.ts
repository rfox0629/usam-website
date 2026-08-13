import "server-only";

import { restorationSections } from "@/src/lib/restoration/intake";
import {
  canAccessOperationsWorkflow,
  canManageOperationsModule,
  type OperationsAuthorization,
  workflowForSubmissionType,
  type OperationsWorkflow,
} from "@/src/lib/operations/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const operationsSubmissionStatuses = [
  "new",
  "reviewed",
  "needs_follow_up",
  "follow_up",
  "contacted",
  "converted",
  "archived",
] as const;

export type OperationsSubmissionStatus = typeof operationsSubmissionStatuses[number];

type FormSubmissionRow = {
  assigned_team: string | null;
  assigned_to?: string | null;
  created_at: string;
  email?: string | null;
  first_name?: string | null;
  follow_up_state?: string | null;
  form_type: string;
  id: string;
  internal_notes?: string | null;
  last_name?: string | null;
  last_reviewed_at?: string | null;
  last_reviewed_by?: string | null;
  message?: string | null;
  name?: string | null;
  next_action?: string | null;
  organization_id?: string | null;
  payload?: unknown;
  person_profile_id?: string | null;
  phone?: string | null;
  priority?: string | null;
  review_summary?: string | null;
  source_page?: string | null;
  status: string | null;
  updated_at?: string | null;
};

export type OperationsSubmissionListItem = {
  assignedTo: string | null;
  canManage: boolean;
  detail: string;
  followUpState: string | null;
  href: string;
  id: string;
  isSensitive: boolean;
  nextAction: string | null;
  reviewSummary: string | null;
  sourceLabel: string;
  status: OperationsSubmissionStatus;
  submittedAt: string;
  submitter: string;
  type: string;
  workflow: OperationsWorkflow;
};

export type OperationsSubmissionDetail = OperationsSubmissionListItem & {
  email: string | null;
  fullResponse: Array<{ label: string; value: string }>;
  internalNotes: string | null;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  phone: string | null;
  priority: string | null;
  sourcePage: string | null;
};

const baseListColumns = [
  "id",
  "form_type",
  "assigned_team",
  "source_page",
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "status",
  "priority",
  "assigned_to",
  "created_at",
  "updated_at",
].join(", ");

const baseDetailColumns = [
  baseListColumns,
  "message",
  "payload",
  "internal_notes",
].join(", ");

const reviewColumns = [
  "review_summary",
  "next_action",
  "follow_up_state",
  "person_profile_id",
  "organization_id",
  "last_reviewed_at",
  "last_reviewed_by",
].join(", ");

const listColumns = `${baseListColumns}, ${reviewColumns}`;
const detailColumns = `${baseDetailColumns}, ${reviewColumns}`;

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("review_summary")
    || message.includes("next_action")
    || message.includes("follow_up_state")
    || message.includes("person_profile_id")
    || message.includes("organization_id")
    || message.includes("last_reviewed_at")
    || message.includes("last_reviewed_by")
    || message.includes("schema cache")
    || message.includes("could not find");
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined, table: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes(table)
    || message.includes("does not exist")
    || message.includes("schema cache");
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function statusFor(value: string | null | undefined): OperationsSubmissionStatus {
  if (value === "needs_follow_up") {
    return "needs_follow_up";
  }

  if (value === "follow_up") {
    return "follow_up";
  }

  if (operationsSubmissionStatuses.includes(value as OperationsSubmissionStatus)) {
    return value as OperationsSubmissionStatus;
  }

  return "new";
}

export function operationsSubmissionStatusLabel(status: string | null | undefined) {
  return statusFor(status)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function titleFromFormType(formType: string) {
  if (formType === "restoration") {
    return "Restoration";
  }

  if (formType === "missionary_application") {
    return "Missionary Application";
  }

  if (formType === "join_mission_interest") {
    return "Mission Interest";
  }

  return formType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function submitterName(row: FormSubmissionRow) {
  const explicitName = cleanText(row.name);
  const joinedName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();

  return explicitName
    ?? cleanText(joinedName)
    ?? cleanText(row.email)
    ?? cleanText(row.phone)
    ?? (row.form_type === "restoration" ? "Private restoration referral" : "Unknown submitter");
}

function sensitiveSubmission(row: FormSubmissionRow) {
  return row.form_type === "restoration";
}

function reviewMetadata(payload: Record<string, unknown>) {
  const metadata = payload.operations_review;

  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
}

function reviewValue(row: FormSubmissionRow, key: "followUpState" | "nextAction" | "reviewSummary") {
  const metadata = reviewMetadata(asPayload(row.payload));
  const columnKey = {
    followUpState: "follow_up_state",
    nextAction: "next_action",
    reviewSummary: "review_summary",
  }[key] as keyof FormSubmissionRow;

  return cleanText(row[columnKey]) ?? cleanText(metadata[key]);
}

function listItemFromRow(row: FormSubmissionRow, authorization: OperationsAuthorization): OperationsSubmissionListItem {
  const workflow = workflowForSubmissionType(row.form_type);
  const isSensitive = sensitiveSubmission(row);
  const reviewSummary = reviewValue(row, "reviewSummary");

  return {
    assignedTo: cleanText(row.assigned_to),
    canManage: canAccessOperationsWorkflow(authorization, workflow, "manage"),
    detail: isSensitive
      ? "Full response restricted to the case detail view"
      : cleanText(row.source_page) ?? cleanText(row.email) ?? "Form submission",
    followUpState: reviewValue(row, "followUpState"),
    href: `/operations/submissions/${row.id}`,
    id: row.id,
    isSensitive,
    nextAction: reviewValue(row, "nextAction"),
    reviewSummary,
    sourceLabel: titleFromFormType(row.form_type),
    status: statusFor(row.status),
    submittedAt: row.created_at,
    submitter: submitterName(row),
    type: row.form_type,
    workflow,
  };
}

function visibleFormTypes(authorization: OperationsAuthorization) {
  const formTypes: string[] = [];

  if (canAccessOperationsWorkflow(authorization, "restoration")) {
    formTypes.push("restoration");
  }

  if (canAccessOperationsWorkflow(authorization, "missionary_applications")) {
    formTypes.push("missionary_application", "join_mission_interest");
  }

  if (canAccessOperationsWorkflow(authorization, "ministry_forms")) {
    formTypes.push(
      "contact",
      "dos_walkthrough_request",
      "field_report_access",
      "financial_freedom",
      "general",
      "major_gift",
      "missionary_profile_review",
      "prayer_request",
      "prayer_team_application",
      "support_giving",
      "system_waitlist",
    );
  }

  return Array.from(new Set(formTypes));
}

export async function loadOperationsSubmissions({
  authorization,
  limit = 50,
}: {
  authorization: OperationsAuthorization;
  limit?: number;
}): Promise<{ error?: string; submissions: OperationsSubmissionListItem[] }> {
  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "submissions") && !canAccessOperationsWorkflow(authorization, "restoration")) {
    return { submissions: [] };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      submissions: [],
    };
  }

  const formTypes = visibleFormTypes(authorization);

  if (formTypes.length === 0) {
    return { submissions: [] };
  }

  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("form_submissions")
    .select(listColumns)
    .in("form_type", formTypes)
    .order("created_at", { ascending: false })
    .limit(limit);
  let { data, error } = await query;

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("form_submissions")
      .select(baseListColumns)
      .in("form_type", formTypes)
      .order("created_at", { ascending: false })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      error: isMissingTableError(error, "form_submissions")
        ? "Operations submissions table is not available yet."
        : error.message,
      submissions: [],
    };
  }

  return {
    submissions: ((data ?? []) as unknown as FormSubmissionRow[])
      .filter((row) => canAccessOperationsWorkflow(authorization, workflowForSubmissionType(row.form_type)))
      .map((row) => listItemFromRow(row, authorization)),
  };
}

function stringifyValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function responsePayloadFor(row: FormSubmissionRow) {
  const payload = asPayload(row.payload);
  const values = payload.values;

  return values && typeof values === "object" && !Array.isArray(values)
    ? values as Record<string, unknown>
    : payload;
}

function restorationResponseFields(payload: Record<string, unknown>) {
  return restorationSections.flatMap((section) => (
    section.fields.flatMap((field) => {
      const value = stringifyValue(payload[field.id]);

      return value ? [{ label: field.label, value }] : [];
    })
  ));
}

function genericResponseFields(payload: Record<string, unknown>) {
  const hiddenKeys = new Set(["operations_review"]);

  return Object.entries(payload)
    .filter(([key]) => !hiddenKeys.has(key))
    .map(([key, value]) => ({
      label: key
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase()),
      value: stringifyValue(value),
    }))
    .filter((field): field is { label: string; value: string } => Boolean(field.value));
}

function detailFromRow(row: FormSubmissionRow, authorization: OperationsAuthorization): OperationsSubmissionDetail {
  const payload = asPayload(row.payload);
  const responsePayload = responsePayloadFor(row);
  const fullResponse = row.form_type === "restoration"
    ? restorationResponseFields(responsePayload)
    : genericResponseFields(responsePayload);

  return {
    ...listItemFromRow(row, authorization),
    email: cleanText(row.email),
    fullResponse,
    internalNotes: cleanText(row.internal_notes) ?? cleanText(reviewMetadata(payload).internalNotes),
    lastReviewedAt: cleanText(row.last_reviewed_at) ?? cleanText(reviewMetadata(payload).lastReviewedAt),
    lastReviewedBy: cleanText(row.last_reviewed_by) ?? cleanText(reviewMetadata(payload).lastReviewedBy),
    message: sensitiveSubmission(row) ? null : cleanText(row.message),
    payload,
    phone: cleanText(row.phone),
    priority: cleanText(row.priority),
    sourcePage: cleanText(row.source_page),
  };
}

export async function loadOperationsSubmissionDetail({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}): Promise<{ error?: string; submission: OperationsSubmissionDetail | null; unauthorized?: boolean }> {
  if (authorization.status !== "authorized") {
    return { submission: null, unauthorized: true };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      submission: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  let { data, error } = await supabase
    .from("form_submissions")
    .select(detailColumns)
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("form_submissions")
      .select(baseDetailColumns)
      .eq("id", id)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      error: isMissingTableError(error, "form_submissions")
        ? "Operations submissions table is not available yet."
        : error.message,
      submission: null,
    };
  }

  if (!data) {
    return { submission: null };
  }

  const row = data as unknown as FormSubmissionRow;
  const workflow = workflowForSubmissionType(row.form_type);

  if (!canAccessOperationsWorkflow(authorization, workflow)) {
    return { submission: null, unauthorized: true };
  }

  return {
    submission: detailFromRow(row, authorization),
  };
}

export async function updateOperationsSubmissionReview({
  assignedTo,
  authorization,
  followUpState,
  id,
  internalNotes,
  nextAction,
  reviewSummary,
  status,
}: {
  assignedTo?: string | null;
  authorization: OperationsAuthorization;
  followUpState?: string | null;
  id: string;
  internalNotes?: string | null;
  nextAction?: string | null;
  reviewSummary?: string | null;
  status: OperationsSubmissionStatus;
}) {
  const detail = await loadOperationsSubmissionDetail({ authorization, id });

  if (detail.unauthorized || authorization.status !== "authorized" || !detail.submission) {
    return { error: "You are not authorized to update this submission." };
  }

  if (!detail.submission.canManage || !canAccessOperationsWorkflow(authorization, detail.submission.workflow, "manage")) {
    return { error: "You are not authorized to manage this submission." };
  }

  if (!operationsSubmissionStatuses.includes(status)) {
    return { error: "Invalid submission status." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const now = new Date().toISOString();
  const payload = {
    ...detail.submission.payload,
    operations_review: {
      ...reviewMetadata(detail.submission.payload),
      assignedTo: cleanText(assignedTo),
      followUpState: cleanText(followUpState),
      internalNotes: cleanText(internalNotes),
      lastReviewedAt: now,
      lastReviewedBy: authorization.email,
      nextAction: cleanText(nextAction),
      reviewSummary: cleanText(reviewSummary),
      status,
    },
  };
  const fullUpdate = {
    assigned_to: cleanText(assignedTo),
    follow_up_state: cleanText(followUpState),
    internal_notes: cleanText(internalNotes),
    last_reviewed_at: now,
    last_reviewed_by: authorization.email,
    next_action: cleanText(nextAction),
    payload,
    review_summary: cleanText(reviewSummary),
    status,
  };
  const fallbackUpdate = {
    assigned_to: cleanText(assignedTo),
    internal_notes: cleanText(internalNotes),
    payload,
    status,
  };
  const supabase = createSupabaseAdminClient();
  let { error } = await supabase
    .from("form_submissions")
    .update(fullUpdate)
    .eq("id", id);

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("form_submissions")
      .update(fallbackUpdate)
      .eq("id", id);
    error = fallback.error;
  }

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
