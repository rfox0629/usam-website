import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { normalizeDosQuickReviewOutcomeTags } from "@/src/lib/dos/review-form-config";
import {
  dosQuickReviewAnswers,
  dosQuickReviewType,
  dosExperienceReviewTypes,
  dosReviewOptionsType,
  dosReviewFollowUpAnswers,
  dosReviewSharePermissions,
  dosReviewStepAnswers,
  type DosQuickReviewAnswer,
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

function normalizedQuickReviewAnswer(value: unknown): DosQuickReviewAnswer | null {
  const nextValue = asString(value).toLowerCase();

  if (dosQuickReviewAnswers.includes(nextValue as DosQuickReviewAnswer)) {
    return nextValue as DosQuickReviewAnswer;
  }

  if (nextValue === "maybe" || nextValue === "unsure") {
    return "somewhat";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return null;
}

function answerToBoolean(value: DosQuickReviewAnswer | null | undefined) {
  if (value === "yes") {
    return true;
  }

  if (value === "no") {
    return false;
  }

  return null;
}

function answerToLegacyMaybe(value: DosQuickReviewAnswer | null | undefined) {
  if (value === "yes" || value === "no") {
    return value;
  }

  return value === "somewhat" ? "maybe" : null;
}

function answerToLegacyUnsure(value: DosQuickReviewAnswer | null | undefined) {
  if (value === "yes" || value === "no") {
    return value;
  }

  return value === "somewhat" ? "unsure" : null;
}

function answerForParticipantReview(value: DosQuickReviewAnswer | null | undefined) {
  return value ?? "skipped";
}

export function normalizeQuickReviewSubmission(value: unknown): DosQuickReviewSubmission | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const sharePermission = normalizedChoice(payload.sharePermission, dosReviewSharePermissions) ?? "private";
  const conversationHelpful = normalizedQuickReviewAnswer(payload.conversationHelpful)
    ?? normalizedQuickReviewAnswer(payload.stepTowardJesus)
    ?? normalizedQuickReviewAnswer(payload.encouraged);
  const wouldMeetAgain = normalizedQuickReviewAnswer(payload.wouldMeetAgain)
    ?? normalizedQuickReviewAnswer(payload.wantsFollowUp);

  return {
    conversationHelpful,
    encouraged: answerToBoolean(conversationHelpful) ?? asBoolean(payload.encouraged),
    feltCaredFor: normalizedQuickReviewAnswer(payload.feltCaredFor),
    feltHeard: normalizedQuickReviewAnswer(payload.feltHeard),
    outcomeTags: normalizeDosQuickReviewOutcomeTags(payload.outcomeTags),
    sharePermission,
    stepTowardJesus: normalizedChoice(payload.stepTowardJesus, dosReviewStepAnswers) ?? answerToLegacyUnsure(conversationHelpful),
    submittedEmail: asString(payload.submittedEmail).slice(0, 160) || null,
    stoodOut: asString(payload.stoodOut).slice(0, 1200) || null,
    submittedName: asString(payload.submittedName).slice(0, 120) || null,
    wantsFollowUp: normalizedChoice(payload.wantsFollowUp, dosReviewFollowUpAnswers) ?? answerToLegacyMaybe(wouldMeetAgain),
    wouldMeetAgain,
  };
}

export function isValidReviewToken(token: string) {
  return /^[A-Za-z0-9_-]{16,96}$/.test(token);
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
        .select("id, name, email")
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
    reviewerPersonEmail: reviewerPerson && "email" in reviewerPerson ? String(reviewerPerson.email ?? "") || null : null,
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
        .select("id, name, email")
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
    reviewerPersonEmail: reviewerPerson && "email" in reviewerPerson ? String(reviewerPerson.email ?? "") || null : null,
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

  const submittedAt = new Date().toISOString();
  const responseDetails = {
    answers: {
      conversationHelpful: submission.conversationHelpful ?? null,
      feltCaredFor: submission.feltCaredFor ?? null,
      feltHeard: submission.feltHeard ?? null,
      wouldMeetAgain: submission.wouldMeetAgain ?? null,
    },
    comments: submission.stoodOut ?? null,
    outcomeTags: submission.outcomeTags ?? [],
    submittedEmail: submission.submittedEmail ?? null,
    submittedName: submission.submittedName ?? null,
  };
  const reviewInsert = {
    conversation_helpful: answerForParticipantReview(submission.conversationHelpful),
    encouraged: answerToBoolean(submission.conversationHelpful),
    felt_cared_for: answerForParticipantReview(submission.feltCaredFor),
    felt_heard: answerToBoolean(submission.feltHeard),
    felt_heard_response: answerForParticipantReview(submission.feltHeard),
    meeting_id: typedLink.meeting_id,
    missionary_user_id: typedLink.created_by_user_id,
    outcome_tags: submission.outcomeTags ?? [],
    response_details: responseDetails,
    review_link_id: typedLink.id,
    review_type: dosQuickReviewType,
    reviewer_person_id: recipientPersonId,
    share_permission: "private",
    status: "submitted",
    step_toward_jesus: answerToLegacyUnsure(submission.conversationHelpful),
    submitted_email: submission.submittedEmail,
    stood_out: submission.stoodOut,
    submitted_name: submission.submittedName,
    wants_follow_up: submission.outcomeTags?.includes("Follow Up Requested") ? "yes" : answerToLegacyMaybe(submission.wouldMeetAgain),
    would_meet_again_response: answerForParticipantReview(submission.wouldMeetAgain),
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

  const { error: participantReviewError } = await supabase
    .from("participant_reviews")
    .insert({
      comments: submission.stoodOut,
      conversation_helpful: answerForParticipantReview(submission.conversationHelpful),
      felt_cared_for: answerForParticipantReview(submission.feltCaredFor),
      felt_heard: answerForParticipantReview(submission.feltHeard),
      leader_id: typedLink.created_by_user_id,
      meeting_id: typedLink.meeting_id,
      outcome_tags: submission.outcomeTags ?? [],
      person_id: recipientPersonId,
      status: "submitted",
      submitted_email: submission.submittedEmail,
      submitted_name: submission.submittedName,
      submitted_at: submittedAt,
      would_meet_again: answerToBoolean(submission.wouldMeetAgain),
      would_meet_again_response: answerForParticipantReview(submission.wouldMeetAgain),
    })
    .select("id")
    .maybeSingle();

  if (participantReviewError) {
    return { error: participantReviewError.message ?? "Unable to save contact review.", status: 500 as const };
  }

  await Promise.all([
    supabase
      .from("missionary_field_people")
      .update({ last_activity_at: submittedAt })
      .eq("id", recipientPersonId)
      .or(`workspace_id.eq.${typedLink.workspace_id},household_id.eq.${typedLink.workspace_id}`),
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
