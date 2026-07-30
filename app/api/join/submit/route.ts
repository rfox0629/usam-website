import { NextResponse } from "next/server";
import { slugify } from "@/src/lib/admin/organization-shared";
import { submitUsamApplicationForSetup, type UsamApplicationSubmitPayload } from "@/src/lib/dos/usam-application";
import { sendAdminNewApplicationNotificationEmail, sendApplicantApplicationSubmittedEmail } from "@/src/lib/email/resend";
import { cleanupJoinCreatedResources } from "@/src/lib/join/rollback-cleanup";
import {
  createEmptyJoinRollbackResources,
  selectResumableIncompleteJoinProfile,
  type JoinExistingCollectiveCandidate,
  type JoinExistingProfileCandidate,
  type JoinResumableProfile,
} from "@/src/lib/join/rollback-policy";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type JoinSubmitPayload = {
  accountEmail?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  callingFocus?: unknown;
  cellPhone?: unknown;
  city?: unknown;
  contactEmail?: unknown;
  country?: unknown;
  donationLinkPreference?: unknown;
  familyMembers?: unknown;
  familyPhotoName?: unknown;
  familyPhotoUpload?: unknown;
  firstName?: unknown;
  fullAddress?: unknown;
  lastName?: unknown;
  password?: unknown;
  polishedStoryDraft?: unknown;
  prayerPartners?: unknown;
  prayerRequests?: unknown;
  profilePhotoName?: unknown;
  profilePhotoUpload?: unknown;
  references?: unknown;
  selectedPath?: unknown;
  spouseEmail?: unknown;
  spouseFirstName?: unknown;
  spouseLastName?: unknown;
  spouseName?: unknown;
  spousePhone?: unknown;
  state?: unknown;
  storyCallingToward?: unknown;
  storyDraftAccepted?: unknown;
  storyImpact?: unknown;
  storyJesus?: unknown;
  storyRecentTeaching?: unknown;
  storyTestimony?: unknown;
  storyWhyUsam?: unknown;
  supportBudget?: unknown;
  supportCommittedAmount?: unknown;
  supportGoal?: unknown;
  supportMonthlyNeed?: unknown;
  supportNeed?: unknown;
  supportOtherMonthlyIncome?: unknown;
  workspaceName?: unknown;
  zip?: unknown;
};

type PhotoUploadMetadata = {
  bucket: string;
  contentType: string;
  fileName: string;
  kind: "family" | "profile";
  path: string;
  size: number;
  uploadedAt?: string;
};

type ExistingJoinProfileRow = {
  id: string;
  owner_organization_id: string | null;
  primary_collective_id: string | null;
  user_id: string | null;
};

type ExistingJoinCollectiveRow = {
  id: string;
  owner_organization_id: string | null;
  type: string | null;
};

const applicationPhotoBucket = "usam-application-photos";
const allowedPhotoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoSize = 5 * 1024 * 1024;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function photoUploadMetadata(value: unknown, expectedKind: "family" | "profile"): PhotoUploadMetadata | null {
  const record = asRecord(value);
  const bucket = asString(record.bucket);
  const contentType = asString(record.contentType);
  const fileName = asString(record.fileName);
  const kind = asString(record.kind);
  const path = asString(record.path);
  const size = typeof record.size === "number" && Number.isFinite(record.size) ? record.size : 0;
  const uploadedAt = asString(record.uploadedAt);

  if (
    bucket !== applicationPhotoBucket
    || kind !== expectedKind
    || !fileName
    || !path.startsWith(`pending/${expectedKind}/`)
    || !allowedPhotoMimeTypes.has(contentType)
    || size <= 0
    || size > maxPhotoSize
  ) {
    return null;
  }

  return {
    bucket,
    contentType,
    fileName,
    kind: expectedKind,
    path,
    size,
    uploadedAt: uploadedAt || undefined,
  };
}

function nullableString(value: unknown) {
  const text = asString(value);

  return text ? text : null;
}

function moneyNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = asString(value).replace(/[$,]/g, "");
  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableMoney(value: unknown) {
  const amount = moneyNumber(value);

  return amount > 0 ? amount : null;
}

function passwordIsStrongEnough(password: string) {
  return password.length >= 8
    && /\d/.test(password)
    && (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password));
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase();
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 7 ? digits : "";
}

function normalizeHouseholdRelationship(value: unknown, dependentStatus: unknown) {
  const relationship = asString(value).toLowerCase();
  const dependency = asString(dependentStatus).toLowerCase();

  if (
    dependency === "dependent"
    || relationship === "child"
    || relationship === "son"
    || relationship === "daughter"
    || relationship === "dependent"
  ) {
    return "child";
  }

  if (dependency === "independent" || relationship === "adult child" || relationship === "household member") {
    return "household_member";
  }

  return "other";
}

function locationText(city: string, state: string) {
  return [city, state].filter(Boolean).join(", ");
}

function firstNameFromFullName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

function lastNameFromFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function householdWorkspaceName({
  applicantName,
  requestedWorkspaceName,
  spouseName,
}: {
  applicantName: string;
  requestedWorkspaceName: string;
  spouseName: string;
}) {
  if (requestedWorkspaceName) {
    return requestedWorkspaceName;
  }

  if (!spouseName) {
    return applicantName || "DOS Workspace";
  }

  const applicantFirstName = firstNameFromFullName(applicantName);
  const applicantLastName = lastNameFromFullName(applicantName);
  const spouseFirstName = firstNameFromFullName(spouseName);
  const spouseLastName = lastNameFromFullName(spouseName);
  const sharedLastName = applicantLastName && spouseLastName && applicantLastName.toLowerCase() === spouseLastName.toLowerCase()
    ? applicantLastName
    : "";

  if (applicantFirstName && spouseFirstName && sharedLastName) {
    return `${applicantFirstName} & ${spouseFirstName} ${sharedLastName}`;
  }

  return [applicantName, spouseName].filter(Boolean).join(" & ") || "DOS Workspace";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as JoinSubmitPayload;
  } catch {
    return null;
  }
}

async function uniqueSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tableName: "collectives" | "missionary_households" | "organizations",
  baseValue: string,
  columnName = "slug",
) {
  const base = slugify(baseValue);

  for (let index = 0; index < 24; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data, error } = await supabase
      .from(tableName)
      .select("id")
      .eq(columnName, candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${base}-${Date.now()}`;
}

async function loadUsamOrganization(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const existingResult = await supabase
    .from("organizations")
    .select("id, name, slug")
    .or("branding_mode.eq.usam,slug.eq.usa-missionaries")
    .limit(1)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  if (existingResult.data?.id) {
    return existingResult.data;
  }

  return null;
}

async function findOrCreateUsamOrganization(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const existingOrganization = await loadUsamOrganization(supabase);

  if (existingOrganization) {
    return { organization: existingOrganization, wasCreated: false };
  }

  const slug = await uniqueSlug(supabase, "organizations", "USA Missionaries");
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      branding_mode: "usam",
      name: "USA Missionaries",
      slug,
      type: "ministry",
    })
    .select("id, name, slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create USA Missionaries organization.");
  }

  return { organization: data, wasCreated: true };
}

function teamMemberRecordCandidates(record: JsonRecord) {
  const withoutInviteMetadata = Object.fromEntries(
    Object.entries(record).filter(([key]) => !["account_linked_at", "invite_email", "invite_phone", "invite_phone_normalized", "relationship_to_workspace"].includes(key)),
  );

  return [record, withoutInviteMetadata];
}

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("schema cache") || message.includes("could not find");
}

async function insertTeamMember(supabase: ReturnType<typeof createSupabaseAdminClient>, record: JsonRecord) {
  let result: { data: { id?: string } | null; error: { message: string } | null } | null = null;

  for (const candidate of teamMemberRecordCandidates(record)) {
    result = await supabase
      .from("missionary_team_members")
      .insert(candidate)
      .select("id")
      .single();

    if (!result.error || !isMissingColumnError(result.error)) {
      break;
    }
  }

  if (result?.error) {
    throw new Error(result.error.message);
  }

  if (!result?.data?.id) {
    throw new Error("Unable to confirm created team member for rollback.");
  }

  return result.data.id;
}

async function findExistingTeamMemberForEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  if (!email) {
    return null;
  }

  const activeStatuses = ["active", "pending", "hidden"];
  const inviteResult = await supabase
    .from("missionary_team_members")
    .select("id, household_id, status")
    .ilike("invite_email", email)
    .in("status", activeStatuses)
    .limit(1);

  if (inviteResult.error && !isMissingColumnError(inviteResult.error)) {
    throw new Error(inviteResult.error.message);
  }

  const inviteMatch = inviteResult.data?.[0] ?? null;

  if (inviteMatch) {
    return inviteMatch;
  }

  const userResult = await supabase
    .from("missionary_team_members")
    .select("id, household_id, status")
    .ilike("dos_user_id", email)
    .in("status", activeStatuses)
    .limit(1);

  if (userResult.error) {
    throw new Error(userResult.error.message);
  }

  return userResult.data?.[0] ?? null;
}

function toJoinProfileCandidate(profile: ExistingJoinProfileRow): JoinExistingProfileCandidate {
  return {
    id: profile.id,
    ownerOrganizationId: profile.owner_organization_id,
    primaryCollectiveId: profile.primary_collective_id,
    userId: profile.user_id,
  };
}

function toJoinCollectiveCandidate(collective: ExistingJoinCollectiveRow | null): JoinExistingCollectiveCandidate | null {
  if (!collective) {
    return null;
  }

  return {
    id: collective.id,
    ownerOrganizationId: collective.owner_organization_id,
    type: collective.type,
  };
}

async function loadCollectiveForJoinResume(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  collectiveId: string,
) {
  const { data, error } = await supabase
    .from("collectives")
    .select("id, owner_organization_id, type")
    .eq("id", collectiveId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ExistingJoinCollectiveRow | null;
}

async function findResumableJoinProfile({
  existingApplication,
  existingTeamMember,
  profiles,
  supabase,
}: {
  existingApplication: unknown;
  existingTeamMember: unknown;
  profiles: ExistingJoinProfileRow[];
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}): Promise<JoinResumableProfile | null> {
  if (profiles.length !== 1 || existingApplication || existingTeamMember) {
    return null;
  }

  const profile = profiles[0];

  if (!profile.primary_collective_id) {
    return null;
  }

  const [organization, collective] = await Promise.all([
    loadUsamOrganization(supabase),
    loadCollectiveForJoinResume(supabase, profile.primary_collective_id),
  ]);

  return selectResumableIncompleteJoinProfile({
    collective: toJoinCollectiveCandidate(collective),
    existingApplication,
    hasExistingTeamMember: Boolean(existingTeamMember),
    profiles: [toJoinProfileCandidate(profile)],
    usamOrganizationId: organization?.id ?? null,
  });
}

async function ensureCollectiveMembership(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  collectiveId: string,
  profileId: string,
) {
  const existingMembershipResult = await supabase
    .from("collective_memberships")
    .select("collective_id")
    .match({ collective_id: collectiveId, profile_id: profileId })
    .limit(1);

  if (existingMembershipResult.error) {
    throw new Error(existingMembershipResult.error.message);
  }

  if (existingMembershipResult.data?.length) {
    return false;
  }

  const collectiveMembershipResult = await supabase
    .from("collective_memberships")
    .insert({
      collective_id: collectiveId,
      profile_id: profileId,
      role: "owner",
      status: "pending",
    });

  if (collectiveMembershipResult.error) {
    throw new Error(collectiveMembershipResult.error.message);
  }

  return true;
}

function validatePayload(payload: JoinSubmitPayload) {
  const selectedPath = asString(payload.selectedPath);
  const email = normalizeEmail(payload.accountEmail || payload.contactEmail);
  const password = asString(payload.password);
  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const city = asString(payload.city);
  const state = asString(payload.state).toUpperCase().slice(0, 2);
  const storyAnswers = [
    payload.storyJesus,
    payload.storyRecentTeaching,
    payload.storyWhyUsam,
    payload.storyImpact,
    payload.storyCallingToward,
  ].map(asString);
  const acceptedStoryDraft = asBoolean(payload.storyDraftAccepted) && (asString(payload.storyTestimony) || asString(payload.polishedStoryDraft));
  const profilePhotoName = asString(payload.profilePhotoName);
  const familyPhotoName = asString(payload.familyPhotoName);
  const profilePhotoUpload = photoUploadMetadata(payload.profilePhotoUpload, "profile");
  const familyPhotoUpload = photoUploadMetadata(payload.familyPhotoUpload, "family");
  const references = asArray(payload.references);
  const validReferences = references.filter((reference) => (
    asString(reference.firstName)
    && asString(reference.lastName)
    && normalizeEmail(reference.email)
  ));

  if (selectedPath !== "usam") {
    return "Only USA Missionaries setup can be submitted from this form right now.";
  }

  if (!email || !email.includes("@")) {
    return "Add a valid email address.";
  }

  if (!passwordIsStrongEnough(password)) {
    return "Create a password with at least 8 characters, a number, and uppercase or a symbol.";
  }

  if (!firstName || !lastName) {
    return "Add your first and last name.";
  }

  if (!city || !state) {
    return "Add your city and state.";
  }

  if (!acceptedStoryDraft && !storyAnswers.some(Boolean)) {
    return "Answer the story questions or accept your missionary story draft.";
  }

  if (!profilePhotoName || !familyPhotoName || !profilePhotoUpload || !familyPhotoUpload) {
    return "Upload both a profile photo and family / public photo.";
  }

  if (!validReferences.length) {
    return "Add at least one reference with name and email.";
  }

  return "";
}

function referenceSummary(references: JsonRecord[]) {
  return references
    .map((reference) => {
      const name = [asString(reference.firstName), asString(reference.lastName)].filter(Boolean).join(" ");
      const details = [
        normalizeEmail(reference.email),
        asString(reference.phone),
        asString(reference.relationship),
        asString(reference.churchOrganization),
      ].filter(Boolean).join(" · ");
      const description = asString(reference.description);

      return [name, details, description].filter(Boolean).join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

function prayerNeedsSummary(prayerRequests: JsonRecord[]) {
  return prayerRequests
    .map((request) => asString(request.text))
    .filter(Boolean)
    .join("\n");
}

function storyFromPayload(payload: JoinSubmitPayload) {
  const acceptedStory = asBoolean(payload.storyDraftAccepted)
    ? asString(payload.storyTestimony) || asString(payload.polishedStoryDraft)
    : "";

  if (acceptedStory) {
    return acceptedStory;
  }

  return [
    ["How I came to know Jesus", asString(payload.storyJesus)],
    ["What God has been teaching me", asString(payload.storyRecentTeaching)],
    ["Why I want to join USA Missionaries", asString(payload.storyWhyUsam)],
    ["Who I hope to impact", asString(payload.storyImpact)],
    ["What I believe God is calling me toward", asString(payload.storyCallingToward)],
  ]
    .filter(([, answer]) => answer)
    .map(([label, answer]) => `${label}: ${answer}`)
    .join("\n\n");
}

function supportMonthlyNeed(payload: JoinSubmitPayload) {
  const supportBudget = asRecord(payload.supportBudget);
  const budgetTotal = Object.values(supportBudget).reduce<number>((total, value) => total + moneyNumber(value), 0);
  const statedMonthlyNeed = moneyNumber(payload.supportMonthlyNeed);

  return statedMonthlyNeed || budgetTotal || null;
}

function supportGoal(payload: JoinSubmitPayload) {
  if (asString(payload.supportNeed) === "no") {
    return null;
  }

  return nullableMoney(payload.supportGoal) ?? supportMonthlyNeed(payload);
}

function onboardingContactPayload(payload: JoinSubmitPayload) {
  const prayerRequests = asArray(payload.prayerRequests).map((request) => ({
    id: asString(request.id),
    text: asString(request.text),
    visibility: "prayer_team",
  })).filter((request) => request.text);
  const profilePhotoUpload = photoUploadMetadata(payload.profilePhotoUpload, "profile");
  const familyPhotoUpload = photoUploadMetadata(payload.familyPhotoUpload, "family");

  return {
    household_json: {
      addressLine1: asString(payload.addressLine1),
      addressLine2: asString(payload.addressLine2),
      city: asString(payload.city),
      country: asString(payload.country),
      familyMembers: asArray(payload.familyMembers),
      fullAddress: asString(payload.fullAddress),
      spouseEmail: normalizeEmail(payload.spouseEmail),
      spouseFirstName: asString(payload.spouseFirstName),
      spouseLastName: asString(payload.spouseLastName),
      spouseName: asString(payload.spouseName),
      spousePhone: asString(payload.spousePhone),
      state: asString(payload.state),
      zip: asString(payload.zip),
    },
    onboarding_json: {
      schemaVersion: 1,
      selectedPath: "usam",
      submittedFrom: "/join",
    },
    photos_json: {
      familyPhotoName: asString(payload.familyPhotoName),
      familyPhotoUpload,
      profilePhotoName: asString(payload.profilePhotoName),
      profilePhotoUpload,
      storage: "supabase_storage",
    },
    prayer_json: {
      partners: asArray(payload.prayerPartners),
      requests: prayerRequests,
    },
    references_json: asArray(payload.references),
    story_json: {
      acceptedDraft: asString(payload.storyTestimony) || asString(payload.polishedStoryDraft),
      answers: {
        callingToward: asString(payload.storyCallingToward),
        impact: asString(payload.storyImpact),
        jesus: asString(payload.storyJesus),
        recentTeaching: asString(payload.storyRecentTeaching),
        whyUsam: asString(payload.storyWhyUsam),
      },
    },
    support_json: {
      budget: asRecord(payload.supportBudget),
      committedSupport: moneyNumber(payload.supportCommittedAmount),
      donationLinkPreference: asString(payload.donationLinkPreference),
      otherMonthlyIncome: moneyNumber(payload.supportOtherMonthlyIncome),
      supportGoal: supportGoal(payload),
      supportNeed: asString(payload.supportNeed) === "no" ? "no" : "yes",
    },
  };
}

function friendlyAuthError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("already") || lowerMessage.includes("registered") || lowerMessage.includes("exists")) {
    return "An account already exists for this email. Use a different email or contact USA Missionaries for help.";
  }

  if (lowerMessage.includes("password")) {
    return "That password does not meet the account requirements.";
  }

  return "Unable to create the account right now. Please try again.";
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const email = normalizeEmail(payload.accountEmail || payload.contactEmail);
  const phone = asString(payload.cellPhone);
  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const applicantName = [firstName, lastName].filter(Boolean).join(" ");
  const spouseName = [asString(payload.spouseFirstName), asString(payload.spouseLastName)].filter(Boolean).join(" ") || asString(payload.spouseName);
  const state = asString(payload.state).toUpperCase().slice(0, 2);
  const city = asString(payload.city);
  const location = locationText(city, state);
  const workspaceName = householdWorkspaceName({
    applicantName,
    requestedWorkspaceName: asString(payload.workspaceName),
    spouseName,
  });
  const createdResources = createEmptyJoinRollbackResources();

  try {
    const [existingProfileResult, existingApplicationResult, existingTeamMember] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, owner_organization_id, primary_collective_id, user_id")
        .ilike("email", email)
        .limit(2),
      supabase
        .from("usam_missionary_applications")
        .select("id, profile_id, status, workspace_id")
        .ilike("applicant_email", email)
        .not("status", "in", "(rejected,declined,archived)")
        .limit(1),
      findExistingTeamMemberForEmail(supabase, email),
    ]);

    if (existingProfileResult.error) {
      throw new Error(existingProfileResult.error.message);
    }

    if (existingApplicationResult.error && !isMissingColumnError(existingApplicationResult.error)) {
      throw new Error(existingApplicationResult.error.message);
    }

    const existingProfiles = (existingProfileResult.data ?? []) as ExistingJoinProfileRow[];
    const existingApplication = existingApplicationResult.data?.[0] ?? null;
    const resumableProfile = await findResumableJoinProfile({
      existingApplication,
      existingTeamMember,
      profiles: existingProfiles,
      supabase,
    });

    if ((existingProfiles.length && !resumableProfile) || existingApplication || existingTeamMember) {
      return NextResponse.json({
        error: "An account, household invitation, or application already exists for this email. Use a different email or contact USA Missionaries for help.",
      }, { status: 409 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: asString(payload.password),
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        source: "dos_join",
      },
    });

    if (authError || !authData.user?.id) {
      const authMessage = authError?.message ?? "Unable to create account.";

      return NextResponse.json({
        error: friendlyAuthError(authMessage),
      }, { status: authMessage.toLowerCase().includes("already") ? 409 : 400 });
    }

    createdResources.authUserIds.push(authData.user.id);

    const { organization, wasCreated } = await findOrCreateUsamOrganization(supabase);

    if (wasCreated) {
      createdResources.organizationIds.push(organization.id);
    }

    let collectiveId = resumableProfile?.collectiveId ?? "";

    if (!collectiveId) {
      const collectiveSlug = await uniqueSlug(supabase, "collectives", workspaceName);
      const { data: collective, error: collectiveError } = await supabase
        .from("collectives")
        .insert({
          name: workspaceName,
          owner_organization_id: organization.id,
          slug: collectiveSlug,
          type: "family",
        })
        .select("id")
        .single();

      if (collectiveError || !collective?.id) {
        throw new Error(collectiveError?.message ?? "Unable to create workspace collection.");
      }

      collectiveId = collective.id;
      createdResources.collectiveIds.push(collectiveId);
    }

    let profileId = resumableProfile?.profileId ?? "";

    if (profileId) {
      // USA-111: this resumes only the profile-only residue left by this route's
      // own failed attempt. Legitimate existing profiles still return the 409 above.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: nullableString(phone),
          user_id: authData.user.id,
        })
        .eq("id", profileId)
        .is("user_id", null)
        .select("id")
        .single();

      if (profileError || !profile?.id) {
        throw new Error(profileError?.message ?? "Unable to resume applicant profile.");
      }

      profileId = profile.id;
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          owner_organization_id: organization.id,
          phone: nullableString(phone),
          primary_collective_id: collectiveId,
          user_id: authData.user.id,
        })
        .select("id")
        .single();

      if (profileError || !profile?.id) {
        throw new Error(profileError?.message ?? "Unable to create applicant profile.");
      }

      profileId = profile.id;
    }

    createdResources.retainedProfileIds.push(profileId);

    if (await ensureCollectiveMembership(supabase, collectiveId, profileId)) {
      createdResources.collectiveMemberships.push({ collectiveId, profileId });
    }

    const workspaceSlug = await uniqueSlug(supabase, "missionary_households", workspaceName);
    const householdPayload = {
      display_name: workspaceName,
      enable_prayer_team: true,
      location: location || null,
      public_visible: false,
      short_mission: `${workspaceName} USA Missionaries application workspace.`,
      show_fruit: false,
      show_household: false,
      show_photos: false,
      show_prayer: true,
      show_story: false,
      show_support: false,
      show_team: false,
      slug: workspaceSlug,
    };
    const householdResult = await supabase
      .from("missionary_households")
      .insert(householdPayload)
      .select("id, slug")
      .single();
    const fallbackHouseholdResult = householdResult.error && isMissingColumnError(householdResult.error)
      ? await supabase
        .from("missionary_households")
        .insert({
          display_name: workspaceName,
          location: location || null,
          public_visible: false,
          short_mission: `${workspaceName} USA Missionaries application workspace.`,
          slug: workspaceSlug,
        })
        .select("id, slug")
        .single()
      : householdResult;

    if (fallbackHouseholdResult.error || !fallbackHouseholdResult.data?.id) {
      throw new Error(fallbackHouseholdResult.error?.message ?? "Unable to create DOS workspace.");
    }

    createdResources.householdIds.push(fallbackHouseholdResult.data.id);

    createdResources.teamMemberIds.push(await insertTeamMember(supabase, {
      account_linked_at: new Date().toISOString(),
      display_name: applicantName,
      dos_user_id: authData.user.id,
      household_id: fallbackHouseholdResult.data.id,
      invite_email: email,
      invite_phone: phone || null,
      invite_phone_normalized: normalizePhone(phone) || null,
      is_public: false,
      relationship_to_workspace: "owner",
      role_title: "USA Missionaries Applicant",
      source: "dos",
      status: "active",
    }));

    if (spouseName) {
      createdResources.teamMemberIds.push(await insertTeamMember(supabase, {
        display_name: spouseName,
        dos_user_id: null,
        household_id: fallbackHouseholdResult.data.id,
        invite_email: normalizeEmail(payload.spouseEmail) || null,
        invite_phone: asString(payload.spousePhone) || null,
        invite_phone_normalized: normalizePhone(asString(payload.spousePhone)) || null,
        is_public: false,
        relationship_to_workspace: "spouse",
        role_title: "Household Member",
        source: "dos",
        status: "pending",
      }));
    }

    for (const familyMember of asArray(payload.familyMembers)) {
      const familyMemberName = [asString(familyMember.firstName), asString(familyMember.lastName)].filter(Boolean).join(" ");

      if (!familyMemberName) {
        continue;
      }

      createdResources.teamMemberIds.push(await insertTeamMember(supabase, {
        display_name: familyMemberName,
        dos_user_id: null,
        household_id: fallbackHouseholdResult.data.id,
        is_public: false,
        relationship_to_workspace: normalizeHouseholdRelationship(familyMember.relationship, familyMember.dependentStatus),
        role_title: asString(familyMember.dependentStatus) === "independent" ? "Household Member" : "Dependent",
        source: "dos",
        status: "pending",
      }));
    }

    const references = asArray(payload.references);
    const prayerRequests = asArray(payload.prayerRequests);
    const applicationPayload: UsamApplicationSubmitPayload = {
      applicantEmail: email,
      applicantName,
      applicantPhone: phone,
      callingFocus: asString(payload.callingFocus) || asString(payload.storyWhyUsam) || asString(payload.storyCallingToward),
      contactPayload: onboardingContactPayload(payload),
      location,
      monthlyBudget: supportMonthlyNeed(payload),
      prayerNeeds: prayerNeedsSummary(prayerRequests),
      profilePhotoUrl: "",
      referencesText: referenceSummary(references),
      storyTestimony: storyFromPayload(payload),
      supportGoal: supportGoal(payload),
      workspaceId: fallbackHouseholdResult.data.id,
    };
    const applicationResult = await submitUsamApplicationForSetup({
      applicantUserId: authData.user.id,
      payload: applicationPayload,
      profileId,
      supabase,
    });
    const submittedAt = new Date().toISOString();
    const emailInput = {
      adminUrl: `${getConfiguredSiteUrl()}/admin/organizations/usam`,
      applicantEmail: email,
      applicantName,
      applicationId: applicationResult.applicationId,
      location,
      status: "pending_review",
      submittedAt,
    };
    const [applicantEmailResult, adminEmailResult] = await Promise.all([
      sendApplicantApplicationSubmittedEmail(emailInput),
      sendAdminNewApplicationNotificationEmail(emailInput),
    ]);

    return NextResponse.json({
      applicationId: applicationResult.applicationId,
      emailSent: applicantEmailResult.sent && adminEmailResult.sent,
      emails: {
        admin: adminEmailResult.sent,
        applicant: applicantEmailResult.sent,
      },
      photoStorage: "supabase_storage",
      status: "pending_review",
      workspaceHref: `/dos/${encodeURIComponent(fallbackHouseholdResult.data.slug)}?walkthrough=usam`,
      workspaceId: fallbackHouseholdResult.data.id,
      workspaceSlug: fallbackHouseholdResult.data.slug,
    }, { status: 201 });
  } catch {
    await cleanupJoinCreatedResources(supabase, createdResources);

    return NextResponse.json({
      error: "Unable to submit the application right now. Please try again or contact USA Missionaries.",
    }, { status: 500 });
  }
}
