import { NextResponse } from "next/server";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";
import { resolveOrCreateWorkspacePersonForRole, upsertWorkspacePersonRole, type WorkspacePersonRoleStatus } from "@/src/lib/dos/person-roles";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type JoinPrayerTeamPayload = {
  emailOptIn?: unknown;
  email_opt_in?: unknown;
  email?: unknown;
  firstName?: unknown;
  first_name?: unknown;
  householdId?: unknown;
  howDidYouHear?: unknown;
  how_did_you_hear?: unknown;
  lastName?: unknown;
  last_name?: unknown;
  name?: unknown;
  phone?: unknown;
  profileSlug?: unknown;
  region?: unknown;
  recruitmentSource?: unknown;
  recruitment_source?: unknown;
  smsOptIn?: unknown;
  sms_opt_in?: unknown;
  source?: unknown;
  sourceLabel?: unknown;
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

type PrayerPartnerWriteRow = {
  id: string;
  status?: string | null;
};

const howJoinedValues = [
  "invited_by_me",
  "public_profile",
  "friend_referral",
  "church_ministry",
  "social_media",
  "website",
  "other",
] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const stringValue = asString(value);

  return stringValue ? stringValue : null;
}

function asBoolean(value: unknown, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalizedValue)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalizedValue)) {
      return false;
    }
  }

  return defaultValue;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeHowJoined(value: string | null | undefined, fallback: typeof howJoinedValues[number] = "other"): typeof howJoinedValues[number] {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (howJoinedValues.includes(normalized as typeof howJoinedValues[number])) {
    return normalized as typeof howJoinedValues[number];
  }

  if (["invited_by_household", "invited_by_this_household", "invited_by_us"].includes(normalized)) {
    return "invited_by_me";
  }

  if (["friend", "from_a_friend"].includes(normalized)) {
    return "friend_referral";
  }

  if (["church_ministry_partner", "church_or_ministry_partner", "church_/_ministry", "church_/_ministry_partner", "church/ministry"].includes(normalized)) {
    return "church_ministry";
  }

  if (["public_profile", "joined_from_public_profile"].includes(normalized)) {
    return "public_profile";
  }

  return fallback;
}

function isMissingTable(error: SupabaseWriteError | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes("schema cache")
    || message.includes(`relation "public.${tableName}" does not exist`)
    || message.includes(`relation "${tableName}" does not exist`)
    || message.includes("does not exist");
}

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function displayNameFromParts(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function personRoleStatusForPrayerPartner(status: string | null | undefined): WorkspacePersonRoleStatus {
  if (status === "inactive") {
    return "paused";
  }

  return status === "active"
    || status === "archived"
    || status === "declined"
    || status === "paused"
    || status === "pending"
    ? status
    : "pending";
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

  const legacyName = asString(payload.name);
  const legacyNameParts = splitName(legacyName);
  const firstName = asString(payload.firstName) || asString(payload.first_name) || legacyNameParts.firstName;
  const lastName = asString(payload.lastName) || asString(payload.last_name) || legacyNameParts.lastName;
  const name = displayNameFromParts(firstName, lastName) || legacyName;
  const email = asString(payload.email).toLowerCase();
  const phone = asNullableString(payload.phone);
  const householdId = asString(payload.householdId);
  const profileSlug = asString(payload.profileSlug);
  const source = normalizeHowJoined(asString(payload.source)
    || asString(payload.recruitmentSource)
    || asString(payload.recruitment_source)
    || asString(payload.howDidYouHear)
    || asString(payload.how_did_you_hear), "public_profile");
  const sourceLabel = asString(payload.sourceLabel);
  const emailOptIn = asBoolean(payload.emailOptIn ?? payload.email_opt_in, true);
  const smsOptIn = Boolean(phone) && asBoolean(payload.smsOptIn ?? payload.sms_opt_in, false);

  if (!name || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include your name and a valid email address." }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Please include your first and last name." }, { status: 400 });
  }

  if (!householdId && !profileSlug) {
    return NextResponse.json({ error: "Missionary household could not be identified." }, { status: 400 });
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
  let linkedPersonId: string;

  try {
    const linkedPerson = await resolveOrCreateWorkspacePersonForRole(supabase, {
      email,
      name,
      phone,
      relationshipContext: "other",
      role: "prayer_partner",
      roleSource: "public_profile",
      workspaceId: household.id,
    });

    linkedPersonId = linkedPerson.personId;
  } catch (error) {
    console.error("[Prayer Team Join API] Failed to link prayer partner to a person:", error);

    return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 500 });
  }

  const prayerPartnerRecord = {
    assigned_coverage: {},
    email,
    email_alerts: emailOptIn,
    field_person_id: linkedPersonId,
    first_name: firstName || null,
    how_heard: source,
    last_name: lastName || null,
    missionary_profile_id: household.id,
    missionary_profile_slug: household.slug,
    name,
    phone,
    prayer_team: "household_family",
    permissions: {
      prayer_admin: false,
      receive_email_alerts: emailOptIn,
      receive_sms_alerts: smsOptIn,
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
    sms_alerts: smsOptIn,
    source: "public_profile",
    state: asNullableString(payload.state),
    status: "pending",
    workspace_id: household.id,
  };
  const existingPartnerResult = await supabase
    .from("prayer_partners")
    .select("id, status")
    .eq("email", email)
    .eq("recruited_by_household_id", household.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPartnerResult.error) {
    console.error("[Prayer Team Join API] Failed to find existing prayer partner:", existingPartnerResult.error);

    if (isMissingTable(existingPartnerResult.error, "prayer_partners")) {
      return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 500 });
  }

  const existingPartner = existingPartnerResult.data as { id: string; status?: string | null } | null;
  const existingStatus = existingPartner?.status;
  const preservedStatus = existingStatus === "inactive" ? "paused" : existingStatus;
  const nextPrayerPartnerRecord = existingPartner
    ? {
      ...prayerPartnerRecord,
      status: preservedStatus === "active"
        || preservedStatus === "declined"
        || preservedStatus === "paused"
        || preservedStatus === "archived"
        ? preservedStatus
        : "pending",
    }
    : prayerPartnerRecord;
  const partnerWriteResult = existingPartner
    ? await supabase
      .from("prayer_partners")
      .update(nextPrayerPartnerRecord)
      .eq("id", existingPartner.id)
      .select("id, status")
      .single()
    : await supabase
      .from("prayer_partners")
      .insert(nextPrayerPartnerRecord)
      .select("id, status")
      .single();

  if (partnerWriteResult.error) {
    console.error("[Prayer Team Join API] Failed to save prayer partner:", partnerWriteResult.error);

    if (isMissingTable(partnerWriteResult.error, "prayer_partners")) {
      return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 500 });
  }

  const writtenPartner = partnerWriteResult.data as PrayerPartnerWriteRow | null;
  const normalizedWrittenStatus = writtenPartner?.status === "inactive"
    ? "paused"
    : writtenPartner?.status;
  const roleWriteResult = writtenPartner
    ? await upsertWorkspacePersonRole(supabase, {
      fieldPersonId: linkedPersonId,
      metadata: {
        display_name: name,
        email_opt_in: emailOptIn,
        how_joined: source,
        how_did_you_hear: source,
        phone,
        recruitment_source: source,
        recruitment_source_label: sourceLabel || null,
        region: asNullableString(payload.region),
        sms_opt_in: smsOptIn,
        source: "public_profile",
        state: asNullableString(payload.state),
      },
      role: "prayer_partner",
      roleRecordId: writtenPartner.id,
      roleRecordTable: "prayer_partners",
      source: "public_profile",
      status: personRoleStatusForPrayerPartner(normalizedWrittenStatus),
      workspaceId: household.id,
    })
    : null;

  if (roleWriteResult?.error) {
    console.error("[Prayer Team Join API] Failed to save prayer partner role:", roleWriteResult.error);
  }

  if (existingPartner) {
    return NextResponse.json({
      applicationStatus: "already_received",
    });
  }

  const submissionResult = await createFormSubmission({
    assignedTeam: "prayer_team",
    email,
    firstName,
    formType: "prayer_team_application",
    lastName,
    message: `Prayer team application for ${household.display_name}`,
    phone,
    payload: {
      display_name: name,
      email_opt_in: emailOptIn,
      how_joined: source,
      how_did_you_hear: source,
      phone,
      recruited_by_household_id: household.id,
      recruited_by_household_name: household.display_name,
      recruited_by_household_number: missionaryNumber,
      recruited_by_profile_slug: household.slug,
      recruitment_source: source,
      recruitment_source_label: sourceLabel || null,
      region: asNullableString(payload.region),
      sms_opt_in: smsOptIn,
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
