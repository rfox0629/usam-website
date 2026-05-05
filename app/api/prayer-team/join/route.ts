import { NextResponse } from "next/server";
import type { MissionaryPrayerRequest } from "@/src/data/missionaries";
import { sendPrayerTeamWelcomeEmail } from "@/src/lib/prayer/email";
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
  slug: string;
};

type PersonRow = {
  missionary_number: string | null;
};

type PrayerRequestRow = {
  category: string | null;
  created_at: string;
  description: string;
  id: string;
  title: string;
  visibility: "public" | "team" | "private";
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

function mapPrayerRequests(requests: readonly PrayerRequestRow[]): MissionaryPrayerRequest[] {
  return requests
    .filter((request) => request.visibility === "public" || request.visibility === "team")
    .map((request) => ({
      category: request.category,
      date: request.created_at,
      description: request.description,
      id: request.id,
      title: request.title,
      visibility: request.visibility as "public" | "team",
    }));
}

function isMissingPrayerTeamTable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("prayer_partners") || message.includes("prayer_requests");
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
    .select("id, display_name, slug")
    .eq("public_visible", true)
    .limit(1);
  const householdResult = householdId
    ? await householdQuery.eq("id", householdId).maybeSingle()
    : await householdQuery.eq("slug", profileSlug).maybeSingle();

  if (householdResult.error) {
    return NextResponse.json({ error: "Unable to load this missionary household." }, { status: 500 });
  }

  const household = householdResult.data as HouseholdRow | null;

  if (!household) {
    return NextResponse.json({ error: "This missionary household is not available." }, { status: 404 });
  }

  const [peopleResult, requestResult] = await Promise.all([
    supabase
      .from("missionary_people")
      .select("missionary_number")
      .eq("household_id", household.id)
      .eq("is_public", true)
      .order("missionary_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prayer_requests")
      .select("id, title, description, category, visibility, created_at")
      .eq("household_id", household.id)
      .eq("status", "active")
      .in("visibility", ["public", "team"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (requestResult.error && isMissingPrayerTeamTable(requestResult.error)) {
    return NextResponse.json({ error: "Prayer Team database tables are not ready yet." }, { status: 503 });
  }

  if (requestResult.error) {
    return NextResponse.json({ error: "Unable to load current prayer requests." }, { status: 500 });
  }

  const missionaryNumber = peopleResult.error
    ? null
    : ((peopleResult.data as PersonRow | null)?.missionary_number ?? null);
  const timestamp = new Date().toISOString();
  const partnerResult = await supabase
    .from("prayer_partners")
    .upsert(
      {
        email,
        name,
        recruited_by_household_id: household.id,
        recruited_by_household_name: household.display_name,
        recruited_by_household_number: missionaryNumber,
        recruited_by_profile_slug: household.slug,
        region: asNullableString(payload.region),
        source,
        state: asNullableString(payload.state),
        status: "active",
        updated_at: timestamp,
      },
      {
        onConflict: "email,recruited_by_household_id",
      },
    )
    .select("id")
    .single();

  if (partnerResult.error) {
    if (isMissingPrayerTeamTable(partnerResult.error)) {
      return NextResponse.json({ error: "Prayer Team database tables are not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save your prayer team signup." }, { status: 500 });
  }

  const prayerRequests = mapPrayerRequests((requestResult.data ?? []) as PrayerRequestRow[]);
  let emailStatus = "skipped";

  try {
    const emailResult = await sendPrayerTeamWelcomeEmail({
      householdName: household.display_name,
      name,
      prayerRequests,
      profileSlug: household.slug,
      to: email,
    });
    emailStatus = emailResult.status;
  } catch (error) {
    console.error("Prayer team welcome email failed:", error instanceof Error ? error.message : "Unknown email error");
    emailStatus = "failed";
  }

  return NextResponse.json({
    emailStatus,
    prayerRequests,
  });
}
