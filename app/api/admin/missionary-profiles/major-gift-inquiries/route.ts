import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MajorGiftInquiryStatus =
  | "archived"
  | "closed"
  | "contacted"
  | "needs_follow_up"
  | "new";

type UpdateMajorGiftInquiryPayload = {
  householdId?: unknown;
  inquiryId?: unknown;
  status?: unknown;
};

const majorGiftInquiryStatuses = [
  "new",
  "needs_follow_up",
  "contacted",
  "closed",
  "archived",
] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMajorGiftInquiryStatus(value: string): value is MajorGiftInquiryStatus {
  return majorGiftInquiryStatuses.includes(value as MajorGiftInquiryStatus);
}

function isExistingUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isStatusConstraintError(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("major_gift_inquiries_status_check"));
}

export async function PATCH(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  let payload: UpdateMajorGiftInquiryPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const householdId = asString(payload.householdId);
  const inquiryId = asString(payload.inquiryId);
  const status = asString(payload.status);

  if (!isExistingUuid(householdId) || !isExistingUuid(inquiryId) || !isMajorGiftInquiryStatus(status)) {
    return NextResponse.json({ error: "Inquiry, household, and valid status are required." }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("major_gift_inquiries")
    .update({
      status,
      updated_at: timestamp,
    })
    .eq("id", inquiryId)
    .eq("household_id", householdId)
    .select("id, household_id, status, updated_at")
    .single();

  if (error) {
    if (isStatusConstraintError(error)) {
      return NextResponse.json({
        error: "Major gift statuses need the latest migration before Needs Follow Up can be saved.",
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inquiry: data,
    ok: true,
  });
}
