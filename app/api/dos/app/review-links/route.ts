import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { dosQuickReviewType } from "@/src/lib/dos/reviews";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ReviewLinkPayload = {
  meetingId?: unknown;
  workspaceId?: unknown;
};

type MeetingLookupRow = {
  field_person_ids: string[] | null;
  household_id?: string | null;
  id: string;
  workspace_id?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function reviewToken() {
  return randomBytes(24).toString("base64url");
}

async function authorizeWrite() {
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

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: ReviewLinkPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const meetingId = asString(payload.meetingId);

  if (!workspaceId || !isUuid(meetingId)) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const scopedMeetingResult = await supabase
    .from("missionary_tables")
    .select("id, workspace_id, household_id, field_person_ids")
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  // TODO: Remove the household_id-only fallback after all Supabase environments
  // have the Command Center workspace_id migration applied.
  const { data: meeting, error: meetingError } = scopedMeetingResult.error && isMissingWorkspaceScopeColumn(scopedMeetingResult.error)
    ? await supabase
      .from("missionary_tables")
      .select("id, household_id, field_person_ids")
      .eq("id", meetingId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedMeetingResult;

  if (meetingError) {
    return NextResponse.json({ error: meetingError.message }, { status: 500 });
  }

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  const typedMeeting = meeting as MeetingLookupRow;
  const fieldPersonIds = Array.isArray(typedMeeting.field_person_ids) ? typedMeeting.field_person_ids : [];
  const reviewerPersonId = fieldPersonIds.length === 1 ? fieldPersonIds[0] : null;
  const existingQuery = supabase
    .from("dos_review_links")
    .select("token")
    .eq("workspace_id", workspaceId)
    .eq("meeting_id", meetingId)
    .eq("review_type", dosQuickReviewType)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const existingResult = await (reviewerPersonId
    ? existingQuery.eq("reviewer_person_id", reviewerPersonId)
    : existingQuery.is("reviewer_person_id", null)).maybeSingle();

  if (existingResult.error) {
    return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
  }

  if (existingResult.data?.token) {
    const url = new URL(`/dos/review/${existingResult.data.token}`, request.url);

    return NextResponse.json({
      ok: true,
      token: existingResult.data.token,
      url: url.toString(),
    });
  }

  const { data: insertedLink, error: insertError } = await supabase
    .from("dos_review_links")
    .insert({
      created_by_user_id: authResult.authorization.userId,
      meeting_id: meetingId,
      reviewer_person_id: reviewerPersonId,
      review_type: dosQuickReviewType,
      token: reviewToken(),
      workspace_id: workspaceId,
    })
    .select("token")
    .single();

  if (insertError || !insertedLink?.token) {
    return NextResponse.json({ error: insertError?.message ?? "Unable to create review link." }, { status: 500 });
  }

  const url = new URL(`/dos/review/${insertedLink.token}`, request.url);

  return NextResponse.json({
    ok: true,
    token: insertedLink.token,
    url: url.toString(),
  });
}
