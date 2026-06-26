import "server-only";

import { randomBytes } from "node:crypto";
import type { DosAuthorizedUser } from "@/src/lib/dos/auth";
import { isMissingWorkspaceScopeColumn } from "@/src/lib/dos/missionary-app";
import { dosQuickReviewType, dosReviewOptionsType, dosTestimonyReviewType } from "@/src/lib/dos/review-types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type MeetingLookupRow = {
  field_person_ids: string[] | null;
  household_id?: string | null;
  id: string;
  ministry_event_id?: string | null;
  workspace_id?: string | null;
};

type CreateReviewRequestLinkInput = {
  authorization: DosAuthorizedUser;
  formType: typeof dosQuickReviewType | typeof dosTestimonyReviewType | typeof dosReviewOptionsType;
  meetingId: string;
  recipientPersonId?: string | null;
  requestUrl: string;
  workspaceId: string;
};

type ReviewRequestLinkResult =
  | {
      ok: true;
      token: string;
      url: string;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

const formTypeRoutes: Record<typeof dosQuickReviewType | typeof dosTestimonyReviewType | typeof dosReviewOptionsType, string> = {
  [dosQuickReviewType]: "/dos/review",
  [dosTestimonyReviewType]: "/dos/testimony",
  [dosReviewOptionsType]: "/dos/review-options",
};

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function isUuid(value: string) {
  return new RegExp(`^${uuidPattern}$`, "i").test(value);
}

function extractUuid(value: string) {
  const match = value.match(new RegExp(uuidPattern, "i"));

  return match?.[0] ?? null;
}

function normalizeMeetingId(value: string) {
  return isUuid(value) ? value : extractUuid(value);
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function reviewToken() {
  return randomBytes(24).toString("base64url");
}

function isMissingMeetingMinistryEventColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("ministry_event_id")
    && (message.includes("column") || message.includes("schema cache") || message.includes("could not find"));
}

function tokenUrl(requestUrl: string, formType: keyof typeof formTypeRoutes, token: string) {
  return new URL(`${formTypeRoutes[formType]}/${token}`, requestUrl).toString();
}

async function loadMeeting(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  meetingId: string,
) {
  const scopedMeetingResult = await supabase
    .from("missionary_tables")
    .select("id, workspace_id, household_id, field_person_ids")
    .eq("id", meetingId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  const baseMeetingResult = scopedMeetingResult.error && isMissingWorkspaceScopeColumn(scopedMeetingResult.error)
    ? await supabase
      .from("missionary_tables")
      .select("id, household_id, field_person_ids")
      .eq("id", meetingId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedMeetingResult;

  if (baseMeetingResult.error || !baseMeetingResult.data) {
    return baseMeetingResult;
  }

  const ministryEventResult = await supabase
    .from("missionary_tables")
    .select("ministry_event_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (ministryEventResult.error && !isMissingMeetingMinistryEventColumn(ministryEventResult.error)) {
    return ministryEventResult;
  }

  return {
    data: {
      ...baseMeetingResult.data,
      ministry_event_id: ministryEventResult.error ? null : ministryEventResult.data?.ministry_event_id ?? null,
    } as MeetingLookupRow,
    error: null,
  };
}

async function loadMinistryEventParticipantIds(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  ministryEventId: string | null | undefined,
) {
  if (!ministryEventId) {
    return [];
  }

  const { data, error } = await supabase
    .from("ministry_event_people")
    .select("field_person_id")
    .eq("workspace_id", workspaceId)
    .eq("ministry_event_id", ministryEventId)
    .eq("role", "participant");

  if (error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("ministry_event_people")
      || message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("does not exist")
    ) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.field_person_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function resolveSenderPersonId(
  supabase: SupabaseAdminClient,
  workspaceId: string,
  authorization: DosAuthorizedUser,
) {
  const directResult = await supabase
    .from("missionary_team_members")
    .select("id")
    .eq("household_id", workspaceId)
    .in("dos_user_id", [authorization.userId, authorization.email])
    .limit(1);

  if (!directResult.error && directResult.data?.[0]?.id) {
    return String(directResult.data[0].id);
  }

  const inviteResult = await supabase
    .from("missionary_team_members")
    .select("id")
    .eq("household_id", workspaceId)
    .ilike("invite_email", authorization.email)
    .limit(1);

  if (!inviteResult.error && inviteResult.data?.[0]?.id) {
    return String(inviteResult.data[0].id);
  }

  return null;
}

function requestedRecipientId(recipientPersonId: string | null | undefined, participantIds: string[]) {
  if (recipientPersonId && isUuid(recipientPersonId)) {
    return recipientPersonId;
  }

  return participantIds.length === 1 ? participantIds[0] : null;
}

export async function createDosReviewRequestLink(input: CreateReviewRequestLinkInput): Promise<ReviewRequestLinkResult> {
  const meetingId = normalizeMeetingId(input.meetingId);

  if (!meetingId) {
    return { error: "Meeting not found.", ok: false, status: 404 };
  }

  const supabase = createSupabaseAdminClient();
  const { data: meeting, error: meetingError } = await loadMeeting(supabase, input.workspaceId, meetingId);

  if (meetingError) {
    return { error: meetingError.message, ok: false, status: 500 };
  }

  if (!meeting) {
    return { error: "Meeting not found.", ok: false, status: 404 };
  }

  const typedMeeting = meeting as MeetingLookupRow;
  const fieldPersonIds = Array.isArray(typedMeeting.field_person_ids)
    ? typedMeeting.field_person_ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const ministryEventParticipantIds = await loadMinistryEventParticipantIds(supabase, input.workspaceId, typedMeeting.ministry_event_id);
  const participantIds = Array.from(new Set([...fieldPersonIds, ...ministryEventParticipantIds]));
  const recipientPersonId = requestedRecipientId(input.recipientPersonId, participantIds);

  if (!recipientPersonId || !participantIds.includes(recipientPersonId)) {
    return { error: "Select a recipient from this Table before sending a review link.", ok: false, status: 400 };
  }

  const existingResult = await supabase
    .from("dos_review_links")
    .select("token")
    .eq("workspace_id", input.workspaceId)
    .eq("meeting_id", meetingId)
    .eq("review_type", input.formType)
    .eq("recipient_person_id", recipientPersonId)
    .in("status", ["pending", "opened"])
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingResult.error) {
    return { error: existingResult.error.message, ok: false, status: 500 };
  }

  if (existingResult.data?.token) {
    return {
      ok: true,
      token: existingResult.data.token,
      url: tokenUrl(input.requestUrl, input.formType, existingResult.data.token),
    };
  }

  const senderPersonId = await resolveSenderPersonId(supabase, input.workspaceId, input.authorization);
  const token = reviewToken();
  const insertRecord = {
    created_by_user_id: input.authorization.userId,
    meeting_id: meetingId,
    recipient_person_id: recipientPersonId,
    reviewer_person_id: recipientPersonId,
    review_type: input.formType,
    sender_person_id: senderPersonId,
    status: "pending",
    token,
    workspace_id: input.workspaceId,
  };
  const { data: insertedLink, error: insertError } = await supabase
    .from("dos_review_links")
    .insert(insertRecord)
    .select("token")
    .single();

  if (insertError || !insertedLink?.token) {
    return { error: insertError?.message ?? "Unable to create review link.", ok: false, status: 500 };
  }

  return {
    ok: true,
    token: insertedLink.token,
    url: tokenUrl(input.requestUrl, input.formType, insertedLink.token),
  };
}
