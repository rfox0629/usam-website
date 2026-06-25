import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { createFruitEvent, inferFruitEventsFromReview } from "@/src/lib/dos/fruit-intelligence";
import { normalizeDosReviewOutcomeTags } from "@/src/lib/dos/review-form-config";
import {
  dosQuickReviewType,
  dosExperienceReviewTypes,
  dosReviewOptionsType,
  dosReviewFollowUpAnswers,
  dosReviewSharePermissions,
  dosReviewStepAnswers,
  type DosQuickReviewSubmission,
  type DosReviewLinkState,
} from "@/src/lib/dos/review-types";

export { dosExperienceReviewTypes, dosQuickReviewType };
export type { DosQuickReviewSubmission, DosReviewLinkState };

type ReviewLinkRow = {
  created_by_user_id?: string | null;
  expires_at: string | null;
  id: string;
  meeting_id: string;
  opened_at?: string | null;
  recipient_person_id?: string | null;
  reviewer_person_id: string | null;
  review_type?: string | null;
  status?: string | null;
  submitted_at?: string | null;
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
    feltCaredFor: asBoolean(payload.feltCaredFor),
    feltHeard: asBoolean(payload.feltHeard),
    outcomeTags: normalizeDosReviewOutcomeTags(payload.outcomeTags),
    sharePermission,
    stepTowardJesus: normalizedChoice(payload.stepTowardJesus, dosReviewStepAnswers),
    submittedEmail: asString(payload.submittedEmail).slice(0, 160) || null,
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
    `Felt heard: ${formatBoolean(submission.feltHeard)}`,
    `Felt cared for: ${formatBoolean(submission.feltCaredFor)}`,
    `Step toward Jesus: ${formatChoice(submission.stepTowardJesus)}`,
    `Wants another conversation: ${formatChoice(submission.wantsFollowUp)}`,
    submission.outcomeTags?.length ? `Outcomes: ${submission.outcomeTags.join(", ")}` : "",
    `Share permission: ${submission.sharePermission}`,
    submission.submittedName ? `Submitted name: ${submission.submittedName}` : "",
    submission.submittedEmail ? `Submitted email: ${submission.submittedEmail}` : "",
  ].filter(Boolean).join("\n");
}

export function quickReviewFruitSummary(submission: DosQuickReviewSubmission) {
  const stoodOut = submission.stoodOut?.trim();

  return stoodOut
    ? `Review submitted: ${stoodOut}`
    : "Review submitted after a DOS meeting.";
}

function linkIsSubmitted(link: Pick<ReviewLinkRow, "status" | "submitted_at" | "used_at">) {
  return Boolean(link.used_at || link.submitted_at || link.status === "submitted");
}

function linkIsExpired(link: Pick<ReviewLinkRow, "expires_at" | "status">) {
  return link.status === "expired" || Boolean(link.expires_at && new Date(link.expires_at).getTime() < Date.now());
}

async function markReviewLinkOpened(link: ReviewLinkRow) {
  if (link.status && link.status !== "pending") {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("dos_review_links")
    .update({ opened_at: new Date().toISOString(), status: "opened" })
    .eq("id", link.id)
    .eq("status", "pending");
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
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, review_type, status, expires_at, opened_at, submitted_at, used_at")
    .eq("token", token)
    .in("review_type", [...dosExperienceReviewTypes])
    .maybeSingle();

  if (linkError || !link) {
    return { status: "invalid" };
  }

  const typedLink = link as ReviewLinkRow;

  if (linkIsSubmitted(typedLink)) {
    return { status: "already_submitted" };
  }

  if (linkIsExpired(typedLink)) {
    return { status: "expired" };
  }

  await markReviewLinkOpened(typedLink);

  const recipientPersonId = typedLink.recipient_person_id ?? typedLink.reviewer_person_id;
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
    recipientPersonId
      ? supabase
        .from("missionary_field_people")
        .select("id, name")
        .eq("id", recipientPersonId)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!workspace || !meeting) {
    return { status: "invalid" };
  }

  const typedMeeting = meeting as MeetingRow;

  return {
    meetingDate: typedMeeting.table_date,
    meetingId: typedLink.meeting_id,
    meetingType: typedMeeting.table_type,
    recipientPersonId,
    reviewerPersonId: recipientPersonId,
    reviewerPersonName: reviewerPerson && "name" in reviewerPerson ? String(reviewerPerson.name ?? "") : null,
    reviewRequestId: typedLink.id,
    reviewType: typedLink.review_type === "quick_check_in" ? "quick_check_in" : dosQuickReviewType,
    status: "ready",
    token: typedLink.token,
    workspaceDisplayName: String(workspace.display_name ?? "DOS"),
    workspaceId: typedLink.workspace_id,
  };
}

export async function loadDosReviewOptionsLink(token: string): Promise<DosReviewLinkState> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "not_configured" };
  }

  if (!isValidReviewToken(token)) {
    return { status: "invalid" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("dos_review_links")
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, review_type, status, expires_at, opened_at, submitted_at, used_at")
    .eq("token", token)
    .eq("review_type", dosReviewOptionsType)
    .maybeSingle();

  if (linkError || !link) {
    return { status: "invalid" };
  }

  const typedLink = link as ReviewLinkRow;

  if (linkIsSubmitted(typedLink)) {
    return { status: "already_submitted" };
  }

  if (linkIsExpired(typedLink)) {
    return { status: "expired" };
  }

  await markReviewLinkOpened(typedLink);

  const recipientPersonId = typedLink.recipient_person_id ?? typedLink.reviewer_person_id;
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
    recipientPersonId
      ? supabase
        .from("missionary_field_people")
        .select("id, name")
        .eq("id", recipientPersonId)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!workspace || !meeting) {
    return { status: "invalid" };
  }

  const typedMeeting = meeting as MeetingRow;

  return {
    meetingDate: typedMeeting.table_date,
    meetingId: typedLink.meeting_id,
    meetingType: typedMeeting.table_type,
    recipientPersonId,
    reviewerPersonId: recipientPersonId,
    reviewerPersonName: reviewerPerson && "name" in reviewerPerson ? String(reviewerPerson.name ?? "") : null,
    reviewRequestId: typedLink.id,
    reviewType: dosReviewOptionsType,
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
    .select("id, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, created_by_user_id, review_type, status, expires_at, submitted_at, used_at")
    .eq("token", token)
    .in("review_type", [...dosExperienceReviewTypes, dosReviewOptionsType])
    .maybeSingle();

  if (linkError || !link) {
    return { error: "Review link not found.", status: 404 as const };
  }

  const typedLink = link as ReviewLinkRow & { created_by_user_id: string | null };

  if (linkIsSubmitted(typedLink)) {
    return { error: "This review link has already been used.", status: 409 as const };
  }

  if (linkIsExpired(typedLink)) {
    return { error: "This review link has expired.", status: 410 as const };
  }

  const recipientPersonId = typedLink.recipient_person_id ?? typedLink.reviewer_person_id;

  if (!recipientPersonId) {
    return { error: "This review link is missing a Table recipient.", status: 409 as const };
  }

  const reviewInsert = {
    encouraged: submission.encouraged,
    felt_heard: submission.feltHeard,
    meeting_id: typedLink.meeting_id,
    missionary_user_id: typedLink.created_by_user_id,
    outcome_tags: submission.outcomeTags ?? [],
    review_link_id: typedLink.id,
    review_type: dosQuickReviewType,
    reviewer_person_id: recipientPersonId,
    share_permission: submission.sharePermission,
    status: "pending_review",
    step_toward_jesus: submission.stepTowardJesus,
    submitted_email: submission.submittedEmail,
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

  const submittedAt = new Date().toISOString();
  const { data: participantReview } = await supabase
    .from("participant_reviews")
    .insert({
      comments: submission.stoodOut,
      conversation_helpful: submission.stepTowardJesus ?? "skipped",
      felt_cared_for: submission.feltCaredFor === null || submission.feltCaredFor === undefined ? "skipped" : submission.feltCaredFor ? "yes" : "no",
      felt_heard: submission.feltHeard === null || submission.feltHeard === undefined ? "skipped" : submission.feltHeard ? "yes" : "no",
      leader_id: typedLink.created_by_user_id,
      meeting_id: typedLink.meeting_id,
      outcome_tags: submission.outcomeTags ?? [],
      person_id: recipientPersonId,
      status: "submitted",
      submitted_email: submission.submittedEmail,
      submitted_name: submission.submittedName,
      submitted_at: submittedAt,
      would_meet_again: submission.wantsFollowUp === "yes" ? true : submission.wantsFollowUp === "no" ? false : null,
    })
    .select("id")
    .maybeSingle();

  const fruitInsert = {
    body: quickReviewFruitSummary(submission),
    cc_status: "pending_review",
    field_person_id: recipientPersonId,
    household_id: typedLink.workspace_id,
    internal_notes: quickReviewInternalNotes(submission),
    missionary_public_approved: false,
    outcome_tags: submission.outcomeTags?.length ? submission.outcomeTags : ["Other"],
    permission_to_share: submission.sharePermission !== "private",
    source: "dos",
    source_app: "dos_quick_review",
    source_external_id: String(review.id),
    submitted_by_name: submission.sharePermission === "with_name" ? submission.submittedName : null,
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

  await inferFruitEventsFromReview({
    comments: submission.stoodOut,
    conversationHelpful: submission.stepTowardJesus,
    feltCaredFor: submission.feltCaredFor === null || submission.feltCaredFor === undefined ? "skipped" : submission.feltCaredFor ? "yes" : "no",
    feltHeard: submission.feltHeard === null || submission.feltHeard === undefined ? "skipped" : submission.feltHeard ? "yes" : "no",
    id: String(participantReview?.id ?? review.id),
    leaderId: typedLink.created_by_user_id,
    meetingId: typedLink.meeting_id,
    personId: recipientPersonId,
    submittedAt,
    wouldMeetAgain: submission.wantsFollowUp === "yes" ? true : submission.wantsFollowUp === "no" ? false : null,
  }, supabase);

  await Promise.all((submission.outcomeTags ?? []).map((fruitType) => createFruitEvent({
    confidenceLevel: "confirmed",
    debugContext: { selectedBy: "recipient", source: "Quick Review" },
    description: submission.stoodOut || "A participant selected this outcome in a DOS Quick Review.",
    fruitType,
    generatedBy: "quick_review",
    leaderId: typedLink.created_by_user_id,
    meetingId: typedLink.meeting_id,
    occurredAt: submittedAt,
    personId: recipientPersonId,
    sourceId: String(participantReview?.id ?? review.id),
    sourceType: "participant_review",
    title: fruitType,
    visibility: "private",
  }, supabase)));

  await Promise.all([
    supabase
      .from("dos_meeting_reviews")
      .update({ fruit_item_id: fruit.id })
      .eq("id", review.id),
    supabase
      .from("dos_review_links")
      .update({ status: "submitted", submitted_at: submittedAt, used_at: submittedAt })
      .eq("id", typedLink.id),
  ]);

  await recalculateCircleScores(typedLink.workspace_id).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after quick review submit", scoreError);
  });

  return { id: String(review.id), ok: true as const };
}
