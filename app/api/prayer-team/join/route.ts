import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type JoinPrayerTeamPayload = {
  email?: unknown;
  householdId?: unknown;
  name?: unknown;
  profileSlug?: unknown;
  region?: unknown;
  source?: unknown;
  state?: unknown;
};

type HouseholdRow = {
  display_name: string;
  id: string;
  show_household?: boolean | null;
  slug: string;
};

type PersonRow = {
  missionary_number: string | null;
};

const sourceValues = [
  "invited_by_household",
  "friend",
  "church_ministry_partner",
  "social_media",
  "other",
] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const stringValue = asString(value);

  return stringValue ? stringValue : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isSourceValue(value: string): value is typeof sourceValues[number] {
  return sourceValues.includes(value as typeof sourceValues[number]);
}

function isMissingPrayerTeamTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("form_submissions");
}

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export async function POST(request: Request) {
  let payload: JoinPrayerTeamPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Prayer Team signup is not configured yet." }, { status: 503 });
  }

  const name = asString(payload.name);
  const email = asString(payload.email).toLowerCase();
  const householdId = asString(payload.householdId);
  const profileSlug = asString(payload.profileSlug);
  const source = asString(payload.source);

  if (!name || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include your name and a valid email address." }, { status: 400 });
  }

  if (!householdId && !profileSlug) {
    return NextResponse.json({ error: "Missionary household could not be identified." }, { status: 400 });
  }

  if (!isSourceValue(source)) {
    return NextResponse.json({ error: "Please choose how you heard about the prayer team." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const householdQuery = supabase
    .from("missionary_households")
    .select("id, display_name, slug, show_household")
    .eq("public_visible", true)
    .limit(1);
  const householdResult = householdId
    ? await householdQuery.eq("id", householdId).maybeSingle()
    : await householdQuery.eq("slug", profileSlug).maybeSingle();

  if (householdResult.error) {
    return NextResponse.json({ error: "Unable to load this missionary household." }, { status: 500 });
  }

  const householdData = householdResult.data as HouseholdRow | null;
  const household = householdData?.show_household === false ? null : householdData;

  if (!household) {
    return NextResponse.json({ error: "This missionary household is not available." }, { status: 404 });
  }

  const peopleResult = await supabase
    .from("missionary_people")
    .select("missionary_number")
    .eq("household_id", household.id)
    .eq("is_public", true)
    .order("missionary_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  const missionaryNumber = peopleResult.error
    ? null
    : ((peopleResult.data as PersonRow | null)?.missionary_number ?? null);
  const { firstName, lastName } = splitName(name);

  const submissionResult = await createFormSubmission({
    email,
    firstName,
    formType: "prayer_team_application",
    lastName,
    message: `Prayer team application for ${household.display_name}`,
    payload: {
      recruited_by_household_id: household.id,
      recruited_by_household_name: household.display_name,
      recruited_by_household_number: missionaryNumber,
      recruited_by_profile_slug: household.slug,
      region: asNullableString(payload.region),
      source,
      state: asNullableString(payload.state),
    },
    sourcePage: `/missionaries/${household.slug}`,
  });

  // TODO: Future email/SMS/DOS integration can notify admins when household
  // profile prayer team applications arrive and route alerts after approval.
  if (submissionResult.error) {
    if (isMissingPrayerTeamTable({ message: submissionResult.error })) {
      return NextResponse.json({ error: "Prayer Team application database table is not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save your prayer team application." }, { status: 500 });
  }

  return NextResponse.json({
    applicationStatus: "submitted",
  });
}
