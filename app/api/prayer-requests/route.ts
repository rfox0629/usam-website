import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PublicPrayerRequestPayload = {
  category?: unknown;
  email?: unknown;
  householdId?: unknown;
  householdName?: unknown;
  name?: unknown;
  prayerRequest?: unknown;
  profileSlug?: unknown;
  urgency?: unknown;
};

type HouseholdRow = {
  display_name: string;
  id: string;
  public_visible: boolean | null;
  show_household?: boolean | null;
  show_prayer?: boolean | null;
  slug: string;
};

const categories = ["Healing", "Family", "Financial", "Salvation", "Guidance", "Other"] as const;
const urgencies = ["normal", "urgent"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeCategory(value: unknown) {
  const nextValue = asString(value);

  return categories.includes(nextValue as typeof categories[number]) ? nextValue : "Other";
}

function normalizeUrgency(value: unknown) {
  const nextValue = asString(value).toLowerCase();

  return urgencies.includes(nextValue as typeof urgencies[number]) ? nextValue as typeof urgencies[number] : "normal";
}

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function titleForPrayerRequest(name: string, category: string) {
  if (name) {
    return `Prayer request from ${name}`;
  }

  return `${category} prayer request`;
}

function isMissingPrayerRequestSchema(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes("schema cache")
    || message.includes("prayer_requests")
    || message.includes("does not exist");
}

export async function POST(request: Request) {
  let payload: PublicPrayerRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Prayer requests are not configured yet." }, { status: 503 });
  }

  const name = asString(payload.name);
  const email = asString(payload.email).toLowerCase();
  const householdId = asString(payload.householdId);
  const profileSlug = asString(payload.profileSlug);
  const requestText = asString(payload.prayerRequest);
  const category = normalizeCategory(payload.category);
  const urgency = normalizeUrgency(payload.urgency);

  if (!requestText) {
    return NextResponse.json({ error: "Please include a prayer request." }, { status: 400 });
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include a valid email address or leave it blank." }, { status: 400 });
  }

  if (!householdId && !profileSlug) {
    return NextResponse.json({ error: "Missionary household could not be identified." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const householdQuery = supabase
    .from("missionary_households")
    .select("id, display_name, slug, public_visible, show_household, show_prayer")
    .eq("public_visible", true)
    .limit(1);
  const householdResult = householdId
    ? await householdQuery.eq("id", householdId).maybeSingle()
    : await householdQuery.eq("slug", profileSlug).maybeSingle();

  if (householdResult.error) {
    return NextResponse.json({ error: "Unable to load this missionary household." }, { status: 500 });
  }

  const householdData = householdResult.data as HouseholdRow | null;
  const household = householdData?.show_household === false || householdData?.show_prayer === false
    ? null
    : householdData;

  if (!household) {
    return NextResponse.json({ error: "Prayer requests are not available for this missionary household." }, { status: 404 });
  }

  const title = titleForPrayerRequest(name, category);
  const submittedBy = name || email
    ? [
      name ? `Name: ${name}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean).join("\n")
    : "Submitted anonymously";

  const insertResult = await supabase
    .from("prayer_requests")
    .insert({
      category,
      confidentiality_level: "missionary_couple",
      description: requestText,
      household_id: household.id,
      prayer_notes: [
        "Public profile prayer request.",
        submittedBy,
      ].join("\n"),
      related_household_id: household.id,
      request: requestText,
      source: "public_form",
      status: "open",
      title,
      urgency,
      visibility: "private",
    })
    .select("id")
    .single();

  if (insertResult.error) {
    console.error("[Public Prayer Requests API] Failed to insert prayer request:", insertResult.error);

    if (isMissingPrayerRequestSchema(insertResult.error)) {
      return NextResponse.json({ error: "Prayer request workflow is not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save this prayer request." }, { status: 500 });
  }

  const { firstName, lastName } = splitName(name);
  const formSubmissionResult = await createFormSubmission({
    assignedTeam: "prayer_team",
    email: email || null,
    firstName: firstName || null,
    formType: "prayer_request",
    lastName: lastName || null,
    message: requestText,
    payload: {
      category,
      household_id: household.id,
      household_name: household.display_name,
      prayer_request_id: (insertResult.data as { id?: string } | null)?.id ?? null,
      profile_slug: household.slug,
      source: "missionary_profile",
      urgency,
      visibility: "private",
    },
    priority: urgency === "urgent" ? "urgent" : "normal",
    sourcePage: `/missionaries/${household.slug}`,
  });

  if (formSubmissionResult.error) {
    console.error("[Public Prayer Requests API] form_submissions mirror failed:", formSubmissionResult.error);
  }

  return NextResponse.json({
    prayerRequestId: (insertResult.data as { id?: string } | null)?.id ?? null,
    saved: true,
  });
}
