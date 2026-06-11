import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { recalculateCircleScores } from "@/src/lib/dos/circle-scoring";
import { isValidReviewToken } from "@/src/lib/dos/reviews";
import { inferFruitEventsFromTestimony } from "@/src/lib/dos/fruit-intelligence";
import type { DosReviewLinkState } from "@/src/lib/dos/review-types";

type ReviewLinkRow = {
  created_by_user_id: string | null;
  expires_at: string | null;
  id: string;
  meeting_id: string;
  reviewer_person_id: string | null;
  token: string;
  used_at: string | null;
  workspace_id: string;
};

type TestimonySubmission = {
  decisionMade: string | null;
  nextStep: string | null;
  permissionToShare: boolean;
  publicDisplayName: string | null;
  story: string;
  whatChanged: string | null;
};

function asString(value: unknown, maxLength = 2400) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeTestimonySubmission(value: unknown): TestimonySubmission | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const story = asString(payload.story, 4000);

  if (!story) {
    return null;
  }

  return {
    decisionMade: asString(payload.decisionMade) || null,
    nextStep: asString(payload.nextStep) || null,
    permissionToShare: payload.permissionToShare === true,
    publicDisplayName: asString(payload.publicDisplayName, 120) || null,
    story,
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
    .select("id, token, workspace_id, meeting_id, reviewer_person_id, expires_at, used_at")
    .eq("token", token)
    .eq("review_type", "testimony")
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
      .select("id, table_date, table_type")
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

  return {
    meetingDate: String(meeting.table_date ?? ""),
    meetingType: String(meeting.table_type ?? ""),
    reviewerPersonId: typedLink.reviewer_person_id,
    reviewerPersonName: reviewerPerson && "name" in reviewerPerson ? String(reviewerPerson.name ?? "") : null,
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
    .select("id, workspace_id, meeting_id, reviewer_person_id, created_by_user_id, expires_at, used_at")
    .eq("token", token)
    .eq("review_type", "testimony")
    .maybeSingle();

  if (linkError || !link) {
    return { error: "Story link not found.", status: 404 as const };
  }

  const typedLink = link as ReviewLinkRow;

  if (typedLink.used_at) {
    return { error: "This story link has already been used.", status: 409 as const };
  }

  if (typedLink.expires_at && new Date(typedLink.expires_at).getTime() < Date.now()) {
    return { error: "This story link has expired.", status: 410 as const };
  }

  const submittedAt = new Date().toISOString();
  const { data: testimony, error: testimonyError } = await supabase
    .from("participant_testimonies")
    .insert({
      decision_made: submission.decisionMade,
      leader_id: typedLink.created_by_user_id,
      meeting_id: typedLink.meeting_id,
      next_step: submission.nextStep,
      permission_to_share: submission.permissionToShare,
      person_id: typedLink.reviewer_person_id,
      public_display_name: submission.permissionToShare ? submission.publicDisplayName : null,
      story: submission.story,
      status: "submitted",
      submitted_at: submittedAt,
      what_changed: submission.whatChanged,
    })
    .select("id")
    .single();

  if (testimonyError || !testimony) {
    return { error: testimonyError?.message ?? "Unable to save story.", status: 500 as const };
  }

  await inferFruitEventsFromTestimony({
    decisionMade: submission.decisionMade,
    id: String(testimony.id),
    leaderId: typedLink.created_by_user_id,
    meetingId: typedLink.meeting_id,
    nextStep: submission.nextStep,
    personId: typedLink.reviewer_person_id,
    story: submission.story,
    submittedAt,
    whatChanged: submission.whatChanged,
  }, supabase);

  await supabase
    .from("dos_review_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", typedLink.id);

  await recalculateCircleScores(typedLink.workspace_id).catch((scoreError) => {
    console.warn("[DOS circles] Unable to recalculate after testimony submit", scoreError);
  });

  return { id: String(testimony.id), ok: true as const };
}
