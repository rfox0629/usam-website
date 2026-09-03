import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { normalizeDosQuickReviewOutcomeTags } from "@/src/lib/dos/review-form-config";
import { submitCanonicalReview } from "@/src/lib/dos/review-submission-policy";
import {
  dosQuickReviewAnswers,
  dosQuickReviewType,
  dosExperienceReviewTypes,
  dosReviewOptionsType,
  dosReviewFollowUpAnswers,
  dosQuickReviewOverallRatings,
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

function splitSubmittedName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function normalizeQuickReviewSubmission(value: unknown): DosQuickReviewSubmission | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const sharePermission = normalizedChoice(payload.sharePermission, dosReviewSharePermissions) ?? "private";
  const submittedNameInput = asString(payload.submittedName).slice(0, 120);
  const submittedFirstNameInput = (
    asString(payload.submittedFirstName)
    || asString(payload.firstName)
    || asString(payload.first_name)
  ).slice(0, 80);
  const submittedLastNameInput = (
    asString(payload.submittedLastName)
    || asString(payload.lastName)
    || asString(payload.last_name)
  ).slice(0, 80);
  const splitName = !submittedFirstNameInput && !submittedLastNameInput && submittedNameInput
    ? splitSubmittedName(submittedNameInput)
    : { firstName: submittedFirstNameInput, lastName: submittedLastNameInput };
  const submittedFirstName = splitName.firstName.slice(0, 80);
  const submittedLastName = splitName.lastName.slice(0, 80);
  const submittedName = submittedNameInput || [submittedFirstName, submittedLastName].filter(Boolean).join(" ");
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
    overallRating: normalizedChoice(payload.overallRating, dosQuickReviewOverallRatings),
    outcomeTags: normalizeDosQuickReviewOutcomeTags(payload.outcomeTags),
    sharePermission,
    /* NOT derived from how helpful the conversation was. "Very meaningful" is
       not the same claim as "I took a step toward Jesus", and recording it as
       one put words in the recipient's mouth. Only an explicit answer counts;
       otherwise it stays unknown. */
    stepTowardJesus: normalizedChoice(payload.stepTowardJesus, dosReviewStepAnswers),
    submittedEmail: asString(payload.submittedEmail).slice(0, 160) || null,
    submittedFirstName: submittedFirstName || null,
    submittedLastName: submittedLastName || null,
    stoodOut: asString(payload.stoodOut).slice(0, 1200) || null,
    submittedName: submittedName.slice(0, 120) || null,
    /* NOT derived from "I would be happy to meet again". Being glad to meet
       again is not asking to be contacted. Only the explicit request counts. */
    wantsFollowUp: normalizedChoice(payload.wantsFollowUp, dosReviewFollowUpAnswers),
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
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, sender_person_id, review_type, status, expires_at, opened_at, submitted_at, used_at")
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
  const senderPersonId = (typedLink as { sender_person_id?: string | null }).sender_person_id ?? null;
  const [{ data: workspace }, { data: meeting }, { data: reviewerPerson }, { data: sender }] = await Promise.all([
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
    /* Who is asking. Only their display name crosses the token boundary --
       never their email, their notes, or anything else about the workspace. */
    senderPersonId
      ? supabase
        .from("missionary_team_members")
        .select("id, display_name")
        .eq("id", senderPersonId)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!workspace || !meeting) {
    return { status: "invalid" };
  }

  const typedMeeting = meeting as MeetingRow;

  return {
    /* Who is asking and when. The minimum a recipient needs to recognise the
       conversation; nothing private about the meeting travels with it. */
    leaderName: (sender && "display_name" in sender ? String(sender.display_name ?? "").trim() : "")
      || String(workspace.display_name ?? "").trim()
      || null,
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
    leaderName: null,
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

  /* A review that answers nothing is not feedback. The rating is the one
     question worth insisting on -- everything else is optional -- and a
     single-use link must not be burned on an empty submission. */
  if (!submission.overallRating) {
    return { error: "Choose how the conversation was before submitting.", status: 400 as const };
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
    overallRating: submission.overallRating ?? null,
    outcomeTags: submission.outcomeTags ?? [],
    submittedEmail: submission.submittedEmail ?? null,
    submittedFirstName: submission.submittedFirstName ?? null,
    submittedLastName: submission.submittedLastName ?? null,
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
    overall_rating: submission.overallRating,
    outcome_tags: submission.outcomeTags ?? [],
    response_details: responseDetails,
    review_link_id: typedLink.id,
    review_type: dosQuickReviewType,
    reviewer_person_id: recipientPersonId,
    share_permission: "private",
    status: "submitted",
    /* Written only when the recipient actually says so. "I decided to follow
       Jesus" is a stronger claim than "a step toward Jesus", so it supports
       this field rather than overstating it -- but its absence means unknown,
       never "no". */
    step_toward_jesus: submission.stepTowardJesus
      ?? (submission.outcomeTags?.includes("New Believers") ? "yes" : null),
    submitted_email: submission.submittedEmail,
    submitted_first_name: submission.submittedFirstName,
    submitted_last_name: submission.submittedLastName,
    stood_out: submission.stoodOut,
    submitted_name: submission.submittedName,
    /* One source: the explicit "I'd like someone to follow up with me"
       control. The legacy tag still counts, because older links wrote the
       same request that way. */
    wants_follow_up: submission.wantsFollowUp
      ?? (submission.outcomeTags?.includes("Follow Up Requested") ? "yes" : null),
    would_meet_again_response: answerForParticipantReview(submission.wouldMeetAgain),
    workspace_id: typedLink.workspace_id,
  };
  let submissionResult;

  try {
    submissionResult = await submitCanonicalReview<{ id: string }>({
      claimLink: async () => {
        const previousClaimAt = typedLink.used_at ?? typedLink.submitted_at;
        const staleClaim = typedLink.status === "submitted"
          && (!previousClaimAt || new Date(previousClaimAt).getTime() < Date.now() - 120_000);

        if (staleClaim) {
          let recoveryQuery = supabase
            .from("dos_review_links")
            .update({ status: "opened", submitted_at: null, used_at: null })
            .eq("id", typedLink.id)
            .eq("status", "submitted");
          recoveryQuery = previousClaimAt
            ? recoveryQuery.eq("submitted_at", previousClaimAt).eq("used_at", previousClaimAt)
            : recoveryQuery.is("submitted_at", null).is("used_at", null);
          const recoveryResult = await recoveryQuery;

          if (recoveryResult.error) {
            throw new Error(recoveryResult.error.message);
          }
        }

        const claimResult = await supabase
          .from("dos_review_links")
          .update({ status: "submitted", submitted_at: submittedAt, used_at: submittedAt })
          .eq("id", typedLink.id)
          .in("status", ["pending", "opened"])
          .is("submitted_at", null)
          .is("used_at", null)
          .select("id")
          .maybeSingle();

        if (claimResult.error) {
          throw new Error(claimResult.error.message);
        }

        return Boolean(claimResult.data?.id);
      },
      findExisting: async () => {
        const existingResult = await supabase
          .from("dos_meeting_reviews")
          .select("id")
          .eq("review_link_id", typedLink.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingResult.error) {
          throw new Error(existingResult.error.message);
        }

        return existingResult.data?.id ? { id: String(existingResult.data.id) } : null;
      },
      insertCanonical: async () => {
        const insertResult = await supabase
          .from("dos_meeting_reviews")
          .insert(reviewInsert)
          .select("id")
          .single();

        if (insertResult.error || !insertResult.data?.id) {
          throw new Error(insertResult.error?.message ?? "Unable to save review.");
        }

        return { id: String(insertResult.data.id) };
      },
      releaseClaim: async () => {
        const releaseResult = await supabase
          .from("dos_review_links")
          .update({
            status: typedLink.status === "opened" ? "opened" : "pending",
            submitted_at: null,
            used_at: null,
          })
          .eq("id", typedLink.id)
          .eq("status", "submitted")
          .eq("submitted_at", submittedAt)
          .eq("used_at", submittedAt);

        if (releaseResult.error) {
          console.error("[DOS reviews] Unable to release failed review submission claim", releaseResult.error);
        }
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save review.", status: 500 as const };
  }

  if (submissionResult.status === "in_progress") {
    return { error: "This review is already being saved. Try again.", status: 409 as const };
  }

  const review = submissionResult.record;

  await Promise.all([
    supabase
      .from("missionary_field_people")
      .update({ last_activity_at: submittedAt })
      .eq("id", recipientPersonId)
      .or(`workspace_id.eq.${typedLink.workspace_id},household_id.eq.${typedLink.workspace_id}`),
    supabase
      .from("dos_review_links")
      .update({ status: "submitted", submitted_at: submittedAt, used_at: submittedAt })
      .eq("id", typedLink.id)
      .eq("status", "submitted"),
  ]);

  /* Deliberately NOT recalculating circle scores here. A Quick Review is how
     the recipient felt about a conversation; it is not evidence about the
     depth of the relationship, and rating a conversation highly must not move
     any internal score. Circles are still recalculated by the activities that
     genuinely describe the relationship -- meetings, reflections, fruit,
     people changes. The Person's last_activity_at above is a plain timestamp
     of something that really happened, not a judgement. */

  return { id: String(review.id), ok: true as const };
}
