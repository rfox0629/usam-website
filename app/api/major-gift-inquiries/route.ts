import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
import { sendMajorGiftNotification } from "@/src/lib/major-gifts/email";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type MajorGiftPayload = {
  bestTimeToContact?: unknown;
  consentToContact?: unknown;
  donationTypes?: unknown;
  email?: unknown;
  firstName?: unknown;
  householdId?: unknown;
  intendedFor?: unknown;
  lastName?: unknown;
  message?: unknown;
  phone?: unknown;
  profileSlug?: unknown;
  projectedAmountRange?: unknown;
};

type HouseholdRow = {
  display_name: string;
  id: string;
  show_household?: boolean | null;
  slug: string;
};

type SupportSettingsRow = {
  major_gift_notify_email: string | null;
};

const donationTypeValues = [
  "Cash",
  "Stock",
  "Crypto",
  "Business interest",
  "Real estate",
  "Vehicle or equipment",
  "Donor-advised fund",
  "Bequest or estate gift",
  "Other noncash asset",
] as const;

const projectedAmountValues = [
  "Under $1,000",
  "$1,000 to $5,000",
  "$5,000 to $25,000",
  "$25,000 to $100,000",
  "$100,000+",
  "Unsure",
] as const;

const intendedForValues = [
  "This missionary household",
  "USA Missionaries General Fund",
  "State or regional leadership",
  "National expansion",
  "I'm not sure",
] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const valueString = asString(value);

  return valueString ? valueString : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toAllowedArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is typeof donationTypeValues[number] => (
    typeof item === "string" && donationTypeValues.includes(item as typeof donationTypeValues[number])
  ));
}

function toAllowedValue<T extends readonly string[]>(value: unknown, allowedValues: T) {
  const valueString = asString(value);

  return allowedValues.includes(valueString) ? valueString : null;
}

function isMissingMajorGiftTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes("major_gift_inquiries"));
}

export async function POST(request: Request) {
  let payload: MajorGiftPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Major gift inquiries are not configured yet." }, { status: 503 });
  }

  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const email = asString(payload.email).toLowerCase();
  const householdId = asString(payload.householdId);
  const profileSlug = asString(payload.profileSlug);
  const donationTypes = toAllowedArray(payload.donationTypes);
  const projectedAmountRange = toAllowedValue(payload.projectedAmountRange, projectedAmountValues);
  const intendedFor = toAllowedValue(payload.intendedFor, intendedForValues);

  if (!firstName || !lastName || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include your first name, last name, and a valid email." }, { status: 400 });
  }

  if (payload.consentToContact !== true) {
    return NextResponse.json({ error: "Please agree to be contacted about this gift." }, { status: 400 });
  }

  if (donationTypes.length === 0 || !projectedAmountRange || !intendedFor) {
    return NextResponse.json({ error: "Please complete the gift details." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const householdQuery = supabase
    .from("missionary_households")
    .select("id, display_name, slug, show_household")
    .eq("public_visible", true)
    .limit(1);
  const householdResult = householdId
    ? await householdQuery.eq("id", householdId).maybeSingle()
    : profileSlug
      ? await householdQuery.eq("slug", profileSlug).maybeSingle()
      : { data: null, error: null };

  if (householdResult.error) {
    return NextResponse.json({ error: "Unable to load the missionary profile." }, { status: 500 });
  }

  const householdData = householdResult.data as HouseholdRow | null;
  const household = householdData?.show_household === false ? null : householdData;

  if ((householdId || profileSlug) && !household) {
    return NextResponse.json({ error: "This missionary profile is not available." }, { status: 404 });
  }

  const notifyResult = household
    ? await supabase
      .from("missionary_support_settings")
      .select("major_gift_notify_email")
      .eq("household_id", household.id)
      .maybeSingle()
    : { data: null, error: null };
  const notifyEmail = ((notifyResult.data as SupportSettingsRow | null)?.major_gift_notify_email || "ryan@usamissionaries.org").trim();
  const createdAt = new Date().toISOString();
  const insertResult = await supabase
    .from("major_gift_inquiries")
    .insert({
      best_time_to_contact: asNullableString(payload.bestTimeToContact),
      consent_to_contact: true,
      donation_types: donationTypes,
      email,
      first_name: firstName,
      household_id: household?.id ?? null,
      household_name: household?.display_name ?? null,
      intended_for: intendedFor,
      last_name: lastName,
      message: asNullableString(payload.message),
      phone: asNullableString(payload.phone),
      profile_slug: household?.slug ?? (profileSlug || null),
      projected_amount_range: projectedAmountRange,
      source: "missionary_profile",
      status: "new",
    })
    .select("id, created_at")
    .single();

  if (insertResult.error) {
    if (isMissingMajorGiftTable(insertResult.error)) {
      return NextResponse.json({ error: "Major gift inquiry database table is not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save this inquiry." }, { status: 500 });
  }

  const majorGiftInquiryId = (insertResult.data as { id?: string } | null)?.id ?? null;
  await createFormSubmission({
    email,
    firstName,
    formType: "major_gift",
    lastName,
    message: asNullableString(payload.message),
    payload: {
      donation_types: donationTypes,
      household_id: household?.id ?? null,
      household_name: household?.display_name ?? null,
      intended_for: intendedFor,
      major_gift_inquiry_id: majorGiftInquiryId,
      profile_slug: household?.slug ?? (profileSlug || null),
      projected_amount_range: projectedAmountRange,
    },
    phone: asNullableString(payload.phone),
    priority: projectedAmountRange === "$100,000+" ? "urgent" : "high",
    sourcePage: household?.slug ? `/missionaries/${household.slug}` : "/support",
  });

  let emailStatus = "skipped";

  try {
    const emailResult = await sendMajorGiftNotification({
      bestTimeToContact: asNullableString(payload.bestTimeToContact),
      createdAt: (insertResult.data as { created_at?: string } | null)?.created_at ?? createdAt,
      donationTypes,
      email,
      firstName,
      householdName: household?.display_name ?? null,
      intendedFor,
      lastName,
      message: asNullableString(payload.message),
      notifyEmail,
      phone: asNullableString(payload.phone),
      profileSlug: household?.slug ?? (profileSlug || null),
      projectedAmountRange,
    });
    emailStatus = emailResult.status;
  } catch (error) {
    console.error("Major gift inquiry notification failed:", error instanceof Error ? error.message : "Unknown email error");
    emailStatus = "failed";
  }

  return NextResponse.json({
    emailStatus,
    inquiryId: majorGiftInquiryId,
  });
}
