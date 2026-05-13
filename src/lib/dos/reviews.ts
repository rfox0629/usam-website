import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  dosQuickReviewType,
  dosReviewFollowUpAnswers,
  dosReviewSharePermissions,
  dosReviewStepAnswers,
  type DosQuickReviewSubmission,
  type DosReviewLinkState,
} from "@/src/lib/dos/review-types";

export { dosQuickReviewType };
export type { DosQuickReviewSubmission, DosReviewLinkState };

type ReviewLinkRow = {
  expires_at: string | null;
  id: string;
  meeting_id: string;
  reviewer_person_id: string | null;
  token: string;
  used_at: string | null;
  workspace_id: string;
};

type MeetingRow = {
  field_person_ids?: string[] | null;
  household_id?: string | null;
  id: string;
  participant_names?: string[] | null;
  table_date: string | null;
  table_type: string | null;
  workspace_id?: string | null;
};

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedChoice<T extends readonly string[]>(value: unknown, options: T, fallback: T[number] | null = null) {
  const nextValue = asString(value);

  return options.includes(nextValue) ? nextValue as T[number] : fallback;
}

export function normalizeQuickReviewSubmission(value: unknown): DosQuickReviewSubmission | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const sharePermission = normalizedChoice(payload.sharePermission, dosReviewSharePermissions) ?? "private";

  return {
    encouraged: asBoolean(payload.encouraged),
    feltHeard: asBoolean(payload.feltHeard),
    sharePermission,
    stepTowardJesus: normalizedChoice(payload.stepTowardJesus, dosReviewStepAnswers),
    stoodOut: asString(payload.stoodOut).slice(0, 1200) || null,
    submittedName: asString(payload.submittedName).slice(0, 120) || null,
    wantsFollowUp: normalizedChoice(payload.wantsFollowUp, dosReviewFollowUpAnswers),
  };
}

export function isValidReviewToken(token: string) {
  return /^[A-Za-z0-9_-]{16,96}$/.test(token);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Skipped";
}

function formatChoice(value: string | null | undefined) {
  if (!value) {
    return "Skipped";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function quickReviewInternalNotes(submission: DosQuickReviewSubmission) {
  return [
    "DOS Quick Review",
    `Encouraged: ${formatBoolean(submission.encouraged)}`,
    `Felt heard and cared for: ${formatBoolean(submission.feltHeard)}`,
    `Step toward Jesus: ${formatChoice(submission.stepTowardJesus)}`,
    `Wants another conversation: ${formatChoice(submission.wantsFollowUp)}`,
    `Share permission: ${submission.sharePermission}`,
    submission.submittedName ? `Submitted name: ${submission.submittedName}` : "",
  ].filter(Boolean).join("\n");
}

export function quickReviewFruitSummary(submission: DosQuickReviewSubmission) {
  const stoodOut = submission.stoodOut?.trim();

  return stoodOut
    ? `Review submitted: ${stoodOut}`
    : "Review submitted after a DOS meeting.";
}

export async function loadDosReviewLink(token: string): Promise<DosReviewLinkState> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "not_configured" };
  }

  if (!isValidReviewToken(token)) {
    return { status: "invalid" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("dos_review_links")
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) {
    return { status: "invalid" };
  }

  const typedLink = link as ReviewLinkRow;

  if (typedLink.used_at) {
    return { status: "already_submitted" };
  }

  if (typedLink.expires_at && new Date(typedLink.expires_at).getTime() < Date.now()) {
    return { status: "expired" };
  }

  const [{ data: workspace }, { data: meeting }, { data: reviewerPerson }] = await Promise.all([
    supabase
      .from("missionary_households")
      .select("display_name, id")
      .eq("id", typedLink.workspace_id)
      .maybeSingle(),
    supabase
      .from("missionary_tables")
      .select("id, table_date, table_type, participant_names, field_person_ids")
      .eq("id", typedLink.meeting_id)
      .maybeSingle(),
    typedLink.reviewer_person_id
      ? supabase
        .from("missionary_field_people")
        .select("id, name")
        .eq("id", typedLink.reviewer_person_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!workspace || !meeting) {
    return { status: "invalid" };
  }

  const typedMeeting = meeting as MeetingRow;

  return {
    meetingDate: typedMeeting.table_date,
    meetingType: typedMeeting.table_type,
    reviewerPersonId: typedLink.reviewer_person_id,
    reviewerPersonName: reviewerPerson && "name" in reviewerPerson ? String(reviewerPerson.name ?? "") : null,
    status: "ready",
    token: typedLink.token,
    workspaceDisplayName: String(workspace.display_name ?? "DOS"),
    workspaceId: typedLink.workspace_id,
  };
}

export async function submitDosQuickReview(token: string, submission: DosQuickReviewSubmission) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Reviews are not configured.", status: 500 as const };
  }

  if (!isValidReviewToken(token)) {
    return { error: "Review link not found.", status: 404 as const };
  }

  const supabase = createSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("dos_review_links")
    .select("id, workspace_id, meeting_id, reviewer_person_id, created_by_user_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) {
    return { error: "Review link not found.", status: 404 as const };
  }

  const typedLink = link as ReviewLinkRow & { created_by_user_id: string | null };

  if (typedLink.used_at) {
    return { error: "This review link has already been used.", status: 409 as const };
  }

  if (typedLink.expires_at && new Date(typedLink.expires_at).getTime() < Date.now()) {
    return { error: "This review link has expired.", status: 410 as const };
  }

  const reviewInsert = {
    encouraged: submission.encouraged,
    felt_heard: submission.feltHeard,
    meeting_id: typedLink.meeting_id,
    missionary_user_id: typedLink.created_by_user_id,
    review_link_id: typedLink.id,
    review_type: dosQuickReviewType,
    reviewer_person_id: typedLink.reviewer_person_id,
    share_permission: submission.sharePermission,
    status: "pending_review",
    step_toward_jesus: submission.stepTowardJesus,
    stood_out: submission.stoodOut,
    submitted_name: submission.submittedName,
    wants_follow_up: submission.wantsFollowUp,
    workspace_id: typedLink.workspace_id,
  };
  const { data: review, error: reviewError } = await supabase
    .from("dos_meeting_reviews")
    .insert(reviewInsert)
    .select("id")
    .single();

  if (reviewError || !review) {
    return { error: reviewError?.message ?? "Unable to save review.", status: 500 as const };
  }

  const fruitInsert = {
    body: quickReviewFruitSummary(submission),
    cc_status: "draft",
    field_person_id: typedLink.reviewer_person_id,
    household_id: typedLink.workspace_id,
    internal_notes: quickReviewInternalNotes(submission),
    missionary_public_approved: false,
    outcome_tags: ["Other"],
    permission_to_share: submission.sharePermission !== "private",
    source: "dos",
    source_app: "dos_quick_review",
    source_external_id: String(review.id),
    status: "draft",
    table_id: typedLink.meeting_id,
    testimony_date: new Date().toISOString().slice(0, 10),
    visibility: "private",
    workspace_id: typedLink.workspace_id,
  };
  const { data: fruit, error: fruitError } = await supabase
    .from("missionary_fruit_items")
    .insert(fruitInsert)
    .select("id")
    .single();

  if (fruitError || !fruit) {
    return { error: fruitError?.message ?? "Unable to queue review fruit.", status: 500 as const };
  }

  await Promise.all([
    supabase
      .from("dos_meeting_reviews")
      .update({ fruit_item_id: fruit.id })
      .eq("id", review.id),
    supabase
      .from("dos_review_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", typedLink.id),
  ]);

  return { id: String(review.id), ok: true as const };
}
