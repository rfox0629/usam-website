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

type SupabaseWriteError = {
  code?: string;
  message?: string;
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

function isMissingTable(error: SupabaseWriteError | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes("schema cache")
    || message.includes(tableName)
    || message.includes("does not exist");
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
  const prayerPartnerRecord = {
    assigned_coverage: {},
    email,
    email_alerts: true,
    first_name: firstName || null,
    last_name: lastName || null,
    name,
    permissions: {
      prayer_admin: false,
      receive_email_alerts: true,
      receive_sms_alerts: false,
      view_confidential_requests: false,
      view_general_requests: true,
      view_kitchen_table_alerts: true,
      view_missionary_couple_requests: true,
    },
    recruited_by: "Public Profile",
    recruited_by_household_id: household.id,
    recruited_by_household_name: household.display_name,
    recruited_by_household_number: missionaryNumber,
    recruited_by_profile_slug: household.slug,
    region: asNullableString(payload.region),
    source: "public_profile",
    state: asNullableString(payload.state),
    status: "pending",
  };
  const existingPartnerResult = await supabase
    .from("prayer_partners")
    .select("id, status")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPartnerResult.error) {
    console.error("[Prayer Team Join API] Failed to find existing prayer partner:", existingPartnerResult.error);

    if (isMissingTable(existingPartnerResult.error, "prayer_partners")) {
      return NextResponse.json({ error: "Prayer Team signup database table is not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save your prayer team signup." }, { status: 500 });
  }

  const existingPartner = existingPartnerResult.data as { id: string; status?: string | null } | null;
  const nextPrayerPartnerRecord = existingPartner?.status === "active"
    ? {
      ...prayerPartnerRecord,
      status: "active",
    }
    : prayerPartnerRecord;
  const partnerWriteResult = existingPartner
    ? await supabase
      .from("prayer_partners")
      .update(nextPrayerPartnerRecord)
      .eq("id", existingPartner.id)
    : await supabase
      .from("prayer_partners")
      .insert(nextPrayerPartnerRecord);

  if (partnerWriteResult.error) {
    console.error("[Prayer Team Join API] Failed to save prayer partner:", partnerWriteResult.error);

    if (isMissingTable(partnerWriteResult.error, "prayer_partners")) {
      return NextResponse.json({ error: "Prayer Team signup database table is not ready yet." }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to save your prayer team signup." }, { status: 500 });
  }

  const existingTeamMemberResult = await supabase
    .from("missionary_team_members")
    .select("id, role_title")
    .eq("household_id", household.id)
    .ilike("display_name", name)
    .limit(1)
    .maybeSingle();

  if (existingTeamMemberResult.error) {
    console.error("[Prayer Team Join API] team member mirror lookup failed:", existingTeamMemberResult.error);
  } else if (!existingTeamMemberResult.data) {
    const teamMemberResult = await supabase
      .from("missionary_team_members")
      .insert({
        display_name: name,
        household_id: household.id,
        is_public: false,
        role_title: "Prayer Partner",
        short_description: "Public Profile prayer team signup.",
        sort_order: 999,
        source: "public_form",
        status: "active",
      });

    if (teamMemberResult.error) {
      console.error("[Prayer Team Join API] team member mirror insert failed:", teamMemberResult.error);
    }
  } else if (!(existingTeamMemberResult.data as { role_title?: string | null }).role_title) {
    const teamMemberResult = await supabase
      .from("missionary_team_members")
      .update({
        role_title: "Prayer Partner",
        source: "public_form",
      })
      .eq("id", (existingTeamMemberResult.data as { id: string }).id);

    if (teamMemberResult.error) {
      console.error("[Prayer Team Join API] team member mirror update failed:", teamMemberResult.error);
    }
  }

  const submissionResult = await createFormSubmission({
    assignedTeam: "prayer_team",
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
    console.error("[Prayer Team Join API] form_submissions mirror failed:", submissionResult.error);
  }

  return NextResponse.json({
    applicationStatus: "submitted",
  });
}
