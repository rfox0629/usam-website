import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
import { resolveSupportMissionaryProfile } from "@/src/lib/missionaries/support-profile-resolution";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupportCommitmentPayload = {
  allocationPreference?: unknown;
  defaultAllocation?: unknown;
  email?: unknown;
  firstName?: unknown;
  giftType?: unknown;
  householdId?: unknown;
  householdName?: unknown;
  lastName?: unknown;
  message?: unknown;
  missionaryName?: unknown;
  otherAmount?: unknown;
  phone?: unknown;
  profileSlug?: unknown;
  redirectGivingUrl?: unknown;
  resolvedMonthlyGivingUrl?: unknown;
  resolvedOneTimeGivingUrl?: unknown;
  selectedAmount?: unknown;
  source?: unknown;
  supportMode?: unknown;
};

const giftTypes = ["monthly", "one_time"] as const;
const sources = ["missionary_profile", "general_support_page"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const valueString = asString(value);

  return valueString ? valueString : null;
}

function asNullableNumber(value: unknown) {
  const valueString = typeof value === "number" ? String(value) : asString(value);

  if (!valueString) {
    return null;
  }

  const numberValue = Number(valueString.replace(/[^0-9.]/g, ""));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function asNullableUuid(value: unknown) {
  const valueString = asString(value);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valueString)
    ? valueString
    : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toGiftType(value: unknown) {
  const valueString = asString(value);

  if (valueString === "onetime") {
    return "one_time";
  }

  return giftTypes.includes(valueString as typeof giftTypes[number])
    ? valueString as typeof giftTypes[number]
    : null;
}

function toSource(value: unknown) {
  const valueString = asString(value);

  return sources.includes(valueString as typeof sources[number])
    ? valueString as typeof sources[number]
    : "missionary_profile";
}

function isMissingSupportCommitmentsTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("support_commitments"));
}

function isSupportCommitmentsSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("submitted_at")
    || message.includes("completed_at")
    || message.includes("admin_notes")
    || message.includes("missionary_profile_id")
    || message.includes("profile_match_status")
    || message.includes("support_commitments_status_check")
    || message.includes("pending_giving_setup");
}

export async function POST(request: Request) {
  let payload: SupportCommitmentPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const email = asString(payload.email).toLowerCase();
  const giftType = toGiftType(payload.giftType);
  const householdId = asNullableUuid(payload.householdId);

  if (!firstName || !lastName || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include your first name, last name, and a valid email." }, { status: 400 });
  }

  if (!giftType) {
    return NextResponse.json({ error: "Please choose a valid gift type." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      error: "Support commitment database is not configured yet. Please contact USA Missionaries before continuing to the giving page.",
    }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const profileResolution = await resolveSupportMissionaryProfile(supabase, {
    householdId,
    missionaryName: asNullableString(payload.missionaryName) ?? asNullableString(payload.householdName),
    profileSlug: asNullableString(payload.profileSlug),
  });
  const resolvedHouseholdName = profileResolution.householdName
    ?? asNullableString(payload.householdName);
  const resolvedProfileSlug = profileResolution.slug
    ?? asNullableString(payload.profileSlug);

  // TODO: Future Church Center webhook can reconcile completed donations against
  // support_commitments by donor email, amount, timing, and profile_slug.
    // TODO: Future accounting view in Command Center can show donor intent vs completed giving.
  const timestamp = new Date().toISOString();
  const commitmentPayload = {
    allocation_preference: asNullableString(payload.allocationPreference),
    default_allocation: asNullableString(payload.defaultAllocation),
    email,
    first_name: firstName,
    gift_type: giftType,
    household_id: profileResolution.id,
    household_name: resolvedHouseholdName,
    last_name: lastName,
    message: asNullableString(payload.message),
    missionary_profile_id: profileResolution.id,
    other_amount: asNullableNumber(payload.otherAmount),
    phone: asNullableString(payload.phone),
    profile_match_query: profileResolution.matchQuery,
    profile_match_source: profileResolution.matchSource,
    profile_match_status: profileResolution.matchStatus,
    profile_slug: resolvedProfileSlug,
    redirect_giving_url: asNullableString(payload.redirectGivingUrl),
    resolved_monthly_giving_url: asNullableString(payload.resolvedMonthlyGivingUrl),
    resolved_one_time_giving_url: asNullableString(payload.resolvedOneTimeGivingUrl),
    selected_amount: asNullableString(payload.selectedAmount),
    source: toSource(payload.source),
    status: "pending_giving_setup",
    submitted_at: timestamp,
    support_mode: asNullableString(payload.supportMode),
  };
  const existingResult = profileResolution.id
    ? await supabase
      .from("support_commitments")
      .select("id")
      .eq("email", email)
      .eq("gift_type", giftType)
      .eq("missionary_profile_id", profileResolution.id)
      .in("status", ["pending_giving_setup", "needs_follow_up"])
      .order("submitted_at", { ascending: false })
      .limit(1)
    : { data: null, error: null };
  const existingCommitmentId = !existingResult.error && existingResult.data?.[0]?.id
    ? String(existingResult.data[0].id)
    : null;
  const saveResult = existingCommitmentId
    ? await supabase
      .from("support_commitments")
      .update({
        ...commitmentPayload,
        updated_at: timestamp,
      })
      .eq("id", existingCommitmentId)
      .select("id")
      .single()
    : await supabase
      .from("support_commitments")
      .insert(commitmentPayload)
      .select("id")
      .single();

  if (saveResult.error) {
    if (isMissingSupportCommitmentsTable(saveResult.error)) {
      return NextResponse.json({
        error: "Support commitment table is not ready yet. Please contact USA Missionaries before continuing to the giving page.",
      }, { status: 503 });
    }

    if (isSupportCommitmentsSchemaError(saveResult.error)) {
      return NextResponse.json({
        error: "Support commitment workflow migration is not applied yet. Please contact USA Missionaries before continuing to the giving page.",
      }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save this support commitment." }, { status: 500 });
  }

  const commitmentId = (saveResult.data as { id?: string } | null)?.id ?? null;
  const formSubmissionResult = await createFormSubmission({
    assignedTeam: "support_team",
    email,
    firstName,
    formType: "support_giving",
    lastName,
    message: asNullableString(payload.message),
    payload: {
      allocation_preference: asNullableString(payload.allocationPreference),
      amount: asNullableString(payload.selectedAmount) ?? asNullableNumber(payload.otherAmount),
      default_allocation: asNullableString(payload.defaultAllocation),
      gift_type: giftType,
      household_id: profileResolution.id,
      household_name: resolvedHouseholdName,
      missionary_name: resolvedHouseholdName ?? asNullableString(payload.missionaryName),
      missionary_profile_id: profileResolution.id,
      note: asNullableString(payload.message),
      other_amount: asNullableNumber(payload.otherAmount),
      profile_match_query: profileResolution.matchQuery,
      profile_match_source: profileResolution.matchSource,
      profile_match_status: profileResolution.matchStatus,
      profile_slug: resolvedProfileSlug,
      redirect_giving_url: asNullableString(payload.redirectGivingUrl),
      selected_amount: asNullableString(payload.selectedAmount),
      status: "pending_giving_setup",
      support_commitment_id: commitmentId,
      support_mode: asNullableString(payload.supportMode),
    },
    phone: asNullableString(payload.phone),
    sourcePage: resolvedProfileSlug
      ? `/missionaries/${resolvedProfileSlug}`
      : "/support",
  });

  if (formSubmissionResult.error) {
    console.error("Support commitment form_submissions mirror failed:", formSubmissionResult.error);
  }

  return NextResponse.json({
    commitmentId,
    diagnostics: formSubmissionResult.error
      ? { formSubmissionWarning: formSubmissionResult.error }
      : undefined,
    saved: true,
  });
}
