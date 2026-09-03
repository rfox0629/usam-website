import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { isValidReviewToken } from "@/src/lib/dos/reviews";
import { normalizeDosReviewOutcomeTags } from "@/src/lib/dos/review-form-config";
import { dosReviewOptionsType, dosTestimonyReviewType, dosTestimonyReviewTypes, type DosReviewLinkState, type DosReviewSharePermission } from "@/src/lib/dos/review-types";

type ReviewLinkRow = {
  created_by_user_id: string | null;
  expires_at: string | null;
  id: string;
  meeting_id: string;
  recipient_person_id?: string | null;
  review_type?: string | null;
  reviewer_person_id: string | null;
  status?: string | null;
  submitted_at?: string | null;
  token: string;
  used_at: string | null;
  workspace_id: string;
};

type TestimonySubmission = {
  decisionMade: string | null;
  nextStep: string | null;
  outcomeTags: string[];
  permissionToShare: boolean;
  publicDisplayName: string | null;
  sharePermission: DosReviewSharePermission;
  story: string;
  submittedEmail: string | null;
  submittedName: string | null;
  whatChanged: string | null;
};

function asString(value: unknown, maxLength = 2400) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function linkIsSubmitted(link: Pick<ReviewLinkRow, "status" | "submitted_at" | "used_at">) {
  return Boolean(link.used_at || link.submitted_at || link.status === "submitted");
}

function linkIsExpired(link: Pick<ReviewLinkRow, "expires_at" | "status">) {
  return link.status === "expired" || Boolean(link.expires_at && new Date(link.expires_at).getTime() < Date.now());
}

async function markTestimonyLinkOpened(link: ReviewLinkRow) {
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

export function normalizeTestimonySubmission(value: unknown): TestimonySubmission | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const story = asString(payload.story, 4000);
  const sharePermission = asString(payload.sharePermission, 40);
  const normalizedSharePermission: DosReviewSharePermission =
    sharePermission === "anonymous" || sharePermission === "with_name" || sharePermission === "private"
      ? sharePermission
      : payload.permissionToShare === true
        ? "with_name"
        : "private";

  if (!story) {
    return null;
  }

  return {
    decisionMade: asString(payload.decisionMade) || null,
    nextStep: asString(payload.nextStep) || null,
    outcomeTags: normalizeDosReviewOutcomeTags(payload.outcomeTags),
    permissionToShare: normalizedSharePermission !== "private",
    publicDisplayName: asString(payload.publicDisplayName, 120) || null,
    sharePermission: normalizedSharePermission,
    story,
    submittedEmail: asString(payload.submittedEmail, 160) || null,
    submittedName: asString(payload.submittedName, 120) || null,
    whatChanged: asString(payload.whatChanged) || null,
  };
}

export async function loadDosTestimonyLink(token: string): Promise<DosReviewLinkState> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "not_configured" };
  }

  if (!isValidReviewToken(token)) {
    return { status: "invalid" };
  }

  const supabase = createSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("dos_review_links")
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, review_type, status, expires_at, submitted_at, used_at")
    .eq("token", token)
    .in("review_type", [...dosTestimonyReviewTypes])
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

  await markTestimonyLinkOpened(typedLink);

  const recipientPersonId = typedLink.recipient_person_id ?? typedLink.reviewer_person_id;
  const [{ data: workspace }, { data: meeting }, { data: reviewerPerson }] = await Promise.all([
    supabase
      .from("missionary_households")
      .select("display_name, id")
      .eq("id", typedLink.workspace_id)
      .maybeSingle(),
    supabase
      .from("missionary_tables")
      .select("id, table_date, table_type")
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

  return {
    leaderName: null,
    meetingDate: String(meeting.table_date ?? ""),
    meetingId: typedLink.meeting_id,
    meetingType: String(meeting.table_type ?? ""),
    recipientPersonId,
    reviewerPersonId: recipientPersonId,
    reviewerPersonEmail: reviewerPerson && "email" in reviewerPerson ? String(reviewerPerson.email ?? "") || null : null,
    reviewerPersonName: reviewerPerson && "name" in reviewerPerson ? String(reviewerPerson.name ?? "") : null,
    reviewRequestId: typedLink.id,
    reviewType: dosTestimonyReviewType,
    status: "ready",
    token: typedLink.token,
    workspaceDisplayName: String(workspace.display_name ?? "DOS"),
    workspaceId: typedLink.workspace_id,
  };
}

export async function submitDosTestimony(token: string, submission: TestimonySubmission) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Story sharing is not configured.", status: 500 as const };
  }

  if (!isValidReviewToken(token)) {
    return { error: "Story link not found.", status: 404 as const };
  }

  const supabase = createSupabaseAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("dos_review_links")
    .select("id, workspace_id, meeting_id, reviewer_person_id, recipient_person_id, created_by_user_id, review_type, status, expires_at, submitted_at, used_at")
    .eq("token", token)
    .in("review_type", [...dosTestimonyReviewTypes, dosReviewOptionsType])
    .maybeSingle();

  if (linkError || !link) {
    return { error: "Story link not found.", status: 404 as const };
  }

  const typedLink = link as ReviewLinkRow;

  if (linkIsSubmitted(typedLink)) {
    return { error: "This story link has already been used.", status: 409 as const };
  }

  if (linkIsExpired(typedLink)) {
    return { error: "This story link has expired.", status: 410 as const };
  }

  const recipientPersonId = typedLink.recipient_person_id ?? typedLink.reviewer_person_id;

  if (!recipientPersonId) {
    return { error: "This story link is missing a Table recipient.", status: 409 as const };
  }

  const submittedAt = new Date().toISOString();
  const { data: testimony, error: testimonyError } = await supabase
    .from("participant_testimonies")
    .insert({
      decision_made: submission.decisionMade,
      leader_id: typedLink.created_by_user_id,
      meeting_id: typedLink.meeting_id,
      next_step: submission.nextStep,
      outcome_tags: submission.outcomeTags,
      permission_to_share: submission.permissionToShare,
      person_id: recipientPersonId,
      public_display_name: submission.sharePermission === "with_name" ? submission.publicDisplayName || submission.submittedName : null,
      story: submission.story,
      status: "submitted",
      submitted_email: submission.submittedEmail,
      submitted_name: submission.submittedName,
      submitted_at: submittedAt,
      what_changed: submission.whatChanged,
    })
    .select("id")
    .single();

  if (testimonyError || !testimony) {
    return { error: testimonyError?.message ?? "Unable to save story.", status: 500 as const };
  }

  // Testimony outcome tags are stored on the testimony for leader review.
  // They should not become Fruit records until a missionary confirms them.

  await supabase
    .from("dos_review_links")
    .update({ status: "submitted", submitted_at: submittedAt, used_at: submittedAt })
    .eq("id", typedLink.id);

  await recalculateCircleScores(typedLink.workspace_id).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after testimony submit", scoreError);
  });

  return { id: String(testimony.id), ok: true as const };
}
