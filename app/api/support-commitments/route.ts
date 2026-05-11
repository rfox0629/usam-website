import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
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

  if (!firstName || !lastName || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include your first name, last name, and a valid email." }, { status: 400 });
  }

  if (!giftType) {
    return NextResponse.json({ error: "Please choose a valid gift type." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      saved: false,
      warning: "Support commitment database is not configured yet.",
    });
  }

  const supabase = createSupabaseAdminClient();

  // TODO: Future Church Center webhook can reconcile completed donations against
  // support_commitments by donor email, amount, timing, and profile_slug.
    // TODO: Future accounting view in Command Center can show donor intent vs completed giving.
  const insertResult = await supabase
    .from("support_commitments")
    .insert({
      allocation_preference: asNullableString(payload.allocationPreference),
      default_allocation: asNullableString(payload.defaultAllocation),
      email,
      first_name: firstName,
      gift_type: giftType,
      household_id: asNullableString(payload.householdId),
      household_name: asNullableString(payload.householdName),
      last_name: lastName,
      message: asNullableString(payload.message),
      other_amount: asNullableNumber(payload.otherAmount),
      phone: asNullableString(payload.phone),
      profile_slug: asNullableString(payload.profileSlug),
      redirect_giving_url: asNullableString(payload.redirectGivingUrl),
      resolved_monthly_giving_url: asNullableString(payload.resolvedMonthlyGivingUrl),
      resolved_one_time_giving_url: asNullableString(payload.resolvedOneTimeGivingUrl),
      selected_amount: asNullableString(payload.selectedAmount),
      source: toSource(payload.source),
      status: "pending_giving_setup",
      submitted_at: new Date().toISOString(),
      support_mode: asNullableString(payload.supportMode),
    })
    .select("id")
    .single();

  if (insertResult.error) {
    if (isMissingSupportCommitmentsTable(insertResult.error)) {
      return NextResponse.json({
        saved: false,
        warning: "Support commitment table is not ready yet.",
      });
    }

    return NextResponse.json({ error: "Unable to save this support commitment." }, { status: 500 });
  }

  const commitmentId = (insertResult.data as { id?: string } | null)?.id ?? null;
  await createFormSubmission({
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
      household_id: asNullableString(payload.householdId),
      household_name: asNullableString(payload.householdName),
      missionary_name: asNullableString(payload.householdName),
      missionary_profile_id: asNullableString(payload.householdId),
      note: asNullableString(payload.message),
      other_amount: asNullableNumber(payload.otherAmount),
      profile_slug: asNullableString(payload.profileSlug),
      redirect_giving_url: asNullableString(payload.redirectGivingUrl),
      selected_amount: asNullableString(payload.selectedAmount),
      status: "pending_giving_setup",
      support_commitment_id: commitmentId,
      support_mode: asNullableString(payload.supportMode),
    },
    phone: asNullableString(payload.phone),
    sourcePage: asNullableString(payload.profileSlug)
      ? `/missionaries/${asString(payload.profileSlug)}`
      : "/support",
  });

  return NextResponse.json({
    commitmentId,
    saved: true,
  });
}
