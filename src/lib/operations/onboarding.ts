import "server-only";

import {
  canManageOperationsModule,
  type OperationsAuthorization,
} from "@/src/lib/operations/auth";
import {
  usamApplicationStatuses,
  type UsamApplicationStatus,
} from "@/src/lib/dos/usam-application";
import { hasOperationsTestMarker, payloadHasOperationsTestMarker } from "@/src/lib/operations/test-records";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { planningFundraisingTarget, planningOrganizationalSupport } from "@/src/lib/organizational-support";
import { supportBudgetCategories } from "@/src/lib/join/application-steps";

/** The private bucket /join uploads applicant photos into. */
export const JOIN_APPLICATION_PHOTO_BUCKET = "usam-application-photos";

type UsamApplicationRow = {
  admin_notes?: string | null;
  admin_approved_monthly_goal?: number | string | null;
  applicant_email: string | null;
  applicant_name: string | null;
  applicant_phone: string | null;
  applicant_user_id?: string | null;
  assigned_admin_email: string | null;
  calling_focus?: string | null;
  contact_payload?: unknown;
  created_at: string;
  excess_support_agreement_accepted?: boolean | null;
  excess_support_agreement_accepted_at?: string | null;
  excess_support_agreement_version?: string | null;
  id: string;
  location?: string | null;
  missionary_profile_id?: string | null;
  monthly_budget?: number | string | null;
  organization_id?: string | null;
  profile_id?: string | null;
  prayer_needs?: string | null;
  profile_photo_url?: string | null;
  proposed_monthly_need?: number | string | null;
  references_text?: string | null;
  reviewed_at: string | null;
  status: string | null;
  story_testimony?: string | null;
  submitted_at: string | null;
  support_goal?: number | string | null;
  updated_at?: string | null;
  workspace_id: string | null;
};

export type OperationsOnboardingItem = {
  assignedTo: string | null;
  candidate: string;
  completionLabel: string;
  decisionLabel: string;
  documentsLabel: string;
  dosSetupLabel: string;
  email: string | null;
  followUpLabel: string;
  fundraisingLabel: string;
  href: string;
  id: string;
  isTestRecord: boolean;
  missingRequirements: string[];
  profileLabel: string;
  referencesLabel: string;
  reviewLabel: string;
  status: string;
  statusKey: UsamApplicationStatus;
  submittedAt: string | null;
};

export type OperationsOnboardingDetailItem = {
  label: string;
  value: string;
};

export type OperationsOnboardingContactItem = {
  email: string | null;
  name: string;
  phone: string | null;
  relationship: string | null;
};

export type OperationsOnboardingHouseholdMember = {
  age: string | null;
  name: string;
  relationship: string | null;
  status: string | null;
};

export type OperationsOnboardingReferenceItem = OperationsOnboardingContactItem & {
  description: string | null;
  organization: string | null;
};

export type OperationsOnboardingDocumentItem = {
  fileName: string;
  kind: string;
  path: string | null;
  status: string;
  /**
   * An Operations-only route that streams the private file to an authorized
   * reviewer. Null when the file's location is not one that route can serve.
   */
  viewHref: string | null;
};

/** One Household or Ministry block of the private monthly worksheet. */
export type OperationsOnboardingBudgetGroup = {
  items: OperationsOnboardingDetailItem[];
  subtotal: string | null;
  title: string;
};

export type OperationsOnboardingAnswerGroup = {
  items: OperationsOnboardingDetailItem[];
  title: string;
};

export type OperationsOnboardingDetail = OperationsOnboardingItem & {
  adminNotes: string | null;
  adminApprovedMonthlyGoalLabel: string | null;
  applicantPhone: string | null;
  applicationAnswers: OperationsOnboardingAnswerGroup[];
  budgetGroups: OperationsOnboardingBudgetGroup[];
  canManage: boolean;
  callingFocus: string | null;
  createdAt: string | null;
  decisionState: string | null;
  documents: OperationsOnboardingDocumentItem[];
  dosSetupState: string | null;
  excessSupportAgreementAccepted: boolean;
  excessSupportAgreementAcceptedAt: string | null;
  excessSupportAgreementVersion: string | null;
  followUpState: string | null;
  householdDetails: OperationsOnboardingDetailItem[];
  householdMembers: OperationsOnboardingHouseholdMember[];
  interviewState: string | null;
  location: string | null;
  missionaryProfileId: string | null;
  monthlyBudgetLabel: string | null;
  onboardingStatus: string | null;
  prayerPartners: OperationsOnboardingContactItem[];
  prayerRequests: string[];
  profileReadiness: string | null;
  proposedMonthlyNeedLabel: string | null;
  references: OperationsOnboardingReferenceItem[];
  reviewedAt: string | null;
  storyAnswers: OperationsOnboardingDetailItem[];
  storyTestimony: string | null;
  supportDetails: OperationsOnboardingDetailItem[];
  supportGoalLabel: string | null;
  updatedAt: string | null;
  workspaceId: string | null;
};

export const operationsOnboardingStatuses = [
  "application_started",
  "application_submitted",
  "pending_review",
  "more_info_requested",
  "approved",
  "active",
  "declined",
  "rejected",
  "archived",
] as const satisfies readonly UsamApplicationStatus[];

const applicationColumns = [
  "id",
  "workspace_id",
  "organization_id",
  "missionary_profile_id",
  "profile_id",
  "applicant_user_id",
  "admin_approved_monthly_goal",
  "applicant_name",
  "applicant_email",
  "applicant_phone",
  "location",
  "calling_focus",
  "story_testimony",
  "monthly_budget",
  "support_goal",
  "proposed_monthly_need",
  "excess_support_agreement_accepted",
  "excess_support_agreement_accepted_at",
  "excess_support_agreement_version",
  "prayer_needs",
  "references_text",
  "profile_photo_url",
  "status",
  "assigned_admin_email",
  "admin_notes",
  "submitted_at",
  "reviewed_at",
  "created_at",
  "updated_at",
  "contact_payload",
].join(", ");

function isMissingTableError(error: { code?: string; message?: string } | null | undefined, table: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes(table)
    || message.includes("does not exist")
    || message.includes("schema cache");
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function moneyLabel(value: unknown) {
  const amount = typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(asString(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function moneyNumber(value: unknown) {
  const amount = typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(asString(value).replace(/[$,]/g, ""));

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function compactDetail(label: string, value: unknown): OperationsOnboardingDetailItem | null {
  const moneyValue = typeof value === "number" ? String(value) : asString(value);

  return moneyValue ? { label, value: moneyValue } : null;
}

function fullNameFromRecord(record: Record<string, unknown>, fallback = "") {
  return [
    asString(record.firstName),
    asString(record.lastName),
  ].filter(Boolean).join(" ").trim()
    || asString(record.name)
    || asString(record.displayName)
    || fallback;
}

/**
 * The /join application stores its repeating answers (household members,
 * references, prayer partners) as one line per person with cells separated by
 * a pipe; see app/join/field-list.ts. Older free-text answers have no pipes and
 * come back as a single cell.
 */
function joinListRows(value: unknown, columnCount: number) {
  return asString(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());

      return Array.from({ length: columnCount }, (_unused, index) => cells[index] ?? "");
    });
}

function joinPhotos(row: UsamApplicationRow) {
  return asArray(asRecord(row.contact_payload).photos)
    .filter((photo) => asString(photo.path) && (photo.kind === "profile" || photo.kind === "family"));
}

function testApplication(row: UsamApplicationRow) {
  return hasOperationsTestMarker(row.applicant_email)
    || hasOperationsTestMarker(row.applicant_name)
    || hasOperationsTestMarker(row.applicant_phone)
    || payloadHasOperationsTestMarker(row.contact_payload);
}

export function onboardingStatusLabel(status: string | null | undefined) {
  const normalized = cleanText(status) ?? "application_started";

  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function workflowPayload(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);

  return asRecord(contactPayload.workflow_json);
}

function workflowText(row: UsamApplicationRow, key: string) {
  return cleanText(workflowPayload(row)[key]);
}

function missingRequirements(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);
  const story = asRecord(contactPayload.story_json);
  const answers = asRecord(story.answers);
  const references = asArray(contactPayload.references_json);
  const missing: string[] = [];

  if (!cleanText(row.applicant_email)) {
    missing.push("Email");
  }

  if (!cleanText(row.applicant_phone)) {
    missing.push("Phone");
  }

  if (!cleanText(row.calling_focus)) {
    missing.push("Calling");
  }

  if (!cleanText(row.references_text) && references.length === 0) {
    missing.push("References");
  }

  if (!cleanText(row.story_testimony) && !cleanText(story.acceptedDraft) && !cleanText(answers.callingToward)) {
    missing.push("Story");
  }

  return missing;
}

function completionLabel(missing: string[]) {
  return missing.length === 0 ? "Ready for review" : `${missing.length} missing`;
}

function referencesLabel(row: UsamApplicationRow) {
  const references = asArray(asRecord(row.contact_payload).references_json);

  if (references.length > 0) {
    return `${references.length} references`;
  }

  return cleanText(row.references_text) ? "Captured" : "Missing";
}

function documentsLabel(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);
  const photos = asRecord(contactPayload.photos_json);
  const profileUpload = asRecord(photos.profilePhotoUpload);
  const familyUpload = asRecord(photos.familyPhotoUpload);
  const documents = asArray(contactPayload.documents_json);

  if (documents.length > 0) {
    return `${documents.length} documents`;
  }

  if (
    joinPhotos(row).length > 0
    || cleanText(row.profile_photo_url)
    || cleanText(photos.profilePhotoName)
    || cleanText(photos.familyPhotoName)
    || cleanText(profileUpload.path)
    || cleanText(familyUpload.path)
  ) {
    return "Photos captured";
  }

  return "Pending";
}

function decisionLabel(status: string | null | undefined) {
  if (status === "approved" || status === "active") {
    return "Accepted";
  }

  if (status === "declined" || status === "rejected") {
    return "Declined";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Pending";
}

/**
 * Profile and DOS setup, before a reviewer sets either.
 *
 * Submitting /join creates a private household record so a couple is one
 * application over two people. It is not published and nobody can log into
 * it. These used to read "Profile linked" and "Workspace linked", which sounded
 * like a public page and an account had been set up on submission. They now say
 * what exists: an unpublished record, and whether an actual login is attached.
 */
export const PROFILE_PRIVATE_DRAFT = "Private record (unpublished)";
export const DOS_NO_LOGIN = "Application record only (no login)";
export const DOS_LOGIN_ACTIVE = "Login active";

function profileDefault(row: UsamApplicationRow) {
  return row.missionary_profile_id ? PROFILE_PRIVATE_DRAFT : "Draft needed";
}

function dosSetupDefault(row: UsamApplicationRow) {
  if (cleanText(row.applicant_user_id)) {
    return DOS_LOGIN_ACTIVE;
  }

  return row.workspace_id ? DOS_NO_LOGIN : null;
}

function itemFromApplication(row: UsamApplicationRow): OperationsOnboardingItem {
  const workflow = workflowPayload(row);
  const missing = missingRequirements(row);
  const status = onboardingStatusLabel(row.status);
  const approvedGoalLabel = moneyLabel(row.admin_approved_monthly_goal);
  const proposedNeedLabel = moneyLabel(row.proposed_monthly_need) ?? moneyLabel(row.monthly_budget) ?? moneyLabel(row.support_goal);

  return {
    assignedTo: cleanText(row.assigned_admin_email),
    candidate: cleanText(row.applicant_name) ?? cleanText(row.applicant_email) ?? "Unnamed candidate",
    completionLabel: completionLabel(missing),
    decisionLabel: cleanText(workflow.decisionState) ?? decisionLabel(row.status),
    documentsLabel: documentsLabel(row),
    dosSetupLabel: dosSetupDefault(row) ?? "Not connected",
    email: cleanText(row.applicant_email),
    followUpLabel: cleanText(workflow.followUpState) ?? (row.reviewed_at ? "Review complete" : "Review needed"),
    fundraisingLabel: approvedGoalLabel
      ? `Approved ${approvedGoalLabel}/mo`
      : proposedNeedLabel
        ? `Proposed ${proposedNeedLabel}/mo`
        : cleanText(workflow.supportProfile) ?? "Pending",
    href: `/operations/missionaries/${row.id}`,
    id: row.id,
    isTestRecord: testApplication(row),
    missingRequirements: missing,
    profileLabel: cleanText(workflow.publicProfileDraft) ?? profileDefault(row),
    referencesLabel: referencesLabel(row),
    reviewLabel: row.reviewed_at ? "Reviewed" : "Needs review",
    status,
    statusKey: statusValue(row.status ?? ""),
    submittedAt: row.submitted_at ?? row.created_at ?? null,
  };
}

function householdDetails(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);
  // DOS onboarding wrote household_json; the /join application writes spouse
  // and address as their own objects. Either shape fills the same fields.
  const joinSpouse = asRecord(contactPayload.spouse);
  const joinAddress = asRecord(contactPayload.address);
  const household = {
    addressLine1: asString(joinAddress.line1),
    addressLine2: asString(joinAddress.line2),
    city: asString(joinAddress.city),
    maritalStatus: asString(contactPayload.maritalStatus),
    spouseEmail: asString(joinSpouse.email),
    spouseFirstName: asString(joinSpouse.firstName),
    spouseLastName: asString(joinSpouse.lastName),
    spousePhone: asString(joinSpouse.phone),
    state: asString(joinAddress.state),
    zip: asString(joinAddress.zip),
    ...Object.fromEntries(Object.entries(asRecord(contactPayload.household_json)).filter(([, value]) => asString(value))),
  } as Record<string, unknown>;
  const spouseName = [
    asString(household.spouseFirstName),
    asString(household.spouseLastName),
  ].filter(Boolean).join(" ") || asString(household.spouseName);

  return [
    compactDetail("Applicant", row.applicant_name),
    compactDetail("Applicant Email", row.applicant_email),
    compactDetail("Applicant Phone", row.applicant_phone),
    compactDetail("Spouse", spouseName),
    compactDetail("Spouse Email", household.spouseEmail),
    compactDetail("Spouse Phone", household.spousePhone),
    compactDetail("Street", household.addressLine1),
    compactDetail("Address 2", household.addressLine2),
    compactDetail("City", household.city),
    compactDetail("State", household.state),
    compactDetail("Zip", household.zip),
    compactDetail("Country", household.country),
    compactDetail("Marital Status", household.maritalStatus),
  ].filter((item): item is OperationsOnboardingDetailItem => Boolean(item));
}

function householdMembers(row: UsamApplicationRow): OperationsOnboardingHouseholdMember[] {
  const contactPayload = asRecord(row.contact_payload);
  const household = asRecord(contactPayload.household_json);

  if (asArray(household.familyMembers).length === 0 && asString(contactPayload.familyMembers)) {
    // /join: name | age | relationship, one person per line.
    return joinListRows(contactPayload.familyMembers, 3).map(([name, age, relationship]) => ({
      age: age || null,
      name: name || "Household member",
      relationship: relationship || null,
      status: null,
    }));
  }

  return asArray(household.familyMembers)
    .map((member) => ({
      age: asString(member.age) || null,
      name: fullNameFromRecord(member, "Household member"),
      relationship: asString(member.relationship) || null,
      status: asString(member.dependentStatus) || null,
    }))
    .filter((member) => member.name !== "Household member" || member.relationship || member.age || member.status);
}

/**
 * /join writes the story step into story_testimony as labelled paragraphs
 * ("Testimony: ...", "Walk with God: ..."), see storyText in
 * src/lib/join/submit-application.ts. Split back into its questions so the
 * record reads like the application did.
 */
const joinStoryLabels = ["Testimony", "Walk with God", "Shaping moments", "Marriage and family", "Formation for ministry"];

function joinStoryParts(testimony: string | null) {
  if (!testimony) {
    return [];
  }

  const pattern = new RegExp(`^(${joinStoryLabels.join("|")}): `);
  const paragraphs = testimony.split(/\n{2,}/);

  if (!paragraphs.every((paragraph) => pattern.test(paragraph.trim()))) {
    return [];
  }

  return paragraphs.map((paragraph) => {
    const trimmed = paragraph.trim();
    const label = (trimmed.match(pattern) as RegExpMatchArray)[1];

    return { label, value: trimmed.slice(label.length + 2).trim() };
  });
}

function storyAnswers(row: UsamApplicationRow) {
  const story = asRecord(asRecord(row.contact_payload).story_json);
  const answers = asRecord(story.answers);
  const joinParts = joinStoryParts(cleanText(row.story_testimony));

  if (Object.keys(answers).length === 0 && !cleanText(story.acceptedDraft) && joinParts.length > 0) {
    return joinParts;
  }

  return [
    compactDetail("How they came to know Jesus", answers.jesus),
    compactDetail("What God has been teaching them", answers.recentTeaching),
    compactDetail("Why USA Missionaries", answers.whyUsam),
    compactDetail("Who they hope to impact", answers.impact),
    compactDetail("What God is calling them toward", answers.callingToward),
    compactDetail("Accepted draft", story.acceptedDraft),
  ].filter((item): item is OperationsOnboardingDetailItem => Boolean(item));
}

function prayerPartners(row: UsamApplicationRow): OperationsOnboardingContactItem[] {
  const contactPayload = asRecord(row.contact_payload);
  const prayer = asRecord(contactPayload.prayer_json);
  const joinPartners = asRecord(contactPayload.profileDraft).prayerPartners;

  if (asArray(prayer.partners).length === 0 && asString(joinPartners)) {
    // /join: first name | last name, one person per line.
    return joinListRows(joinPartners, 2).map(([firstName, lastName]) => ({
      email: null,
      name: [firstName, lastName].filter(Boolean).join(" ") || "Prayer partner",
      phone: null,
      relationship: null,
    }));
  }

  return asArray(prayer.partners)
    .map((partner) => ({
      email: asString(partner.email) || null,
      name: fullNameFromRecord(partner, "Prayer partner"),
      phone: asString(partner.phone) || null,
      relationship: asString(partner.relationship) || null,
    }))
    .filter((partner) => partner.name !== "Prayer partner" || partner.email || partner.phone || partner.relationship);
}

function prayerRequests(row: UsamApplicationRow) {
  const prayer = asRecord(asRecord(row.contact_payload).prayer_json);
  const structuredRequests = asArray(prayer.requests).map((request) => asString(request.text)).filter(Boolean);
  const legacyRequests = asString(row.prayer_needs)
    .split(/\n+/)
    .map((request) => request.trim())
    .filter(Boolean);

  return structuredRequests.length ? structuredRequests : legacyRequests;
}

function references(row: UsamApplicationRow): OperationsOnboardingReferenceItem[] {
  const contactPayload = asRecord(row.contact_payload);
  const structuredReferences = asArray(contactPayload.references_json);

  if (structuredReferences.length === 0 && row.references_text?.includes("|")) {
    // /join: name | relationship | how to reach them, one person per line.
    // The contact cell is free text, so it is shown as an email when it looks
    // like one and as a phone number otherwise.
    return joinListRows(row.references_text, 3).map(([name, relationship, contact]) => ({
      description: null,
      email: contact.includes("@") ? contact : null,
      name: name || "Reference",
      organization: null,
      phone: contact && !contact.includes("@") ? contact : null,
      relationship: relationship || null,
    }));
  }

  if (structuredReferences.length === 0 && row.references_text?.trim()) {
    return row.references_text
      .split(/\n+/)
      .map((line) => ({
        description: line.trim(),
        email: null,
        name: "Reference",
        organization: null,
        phone: null,
        relationship: null,
      }))
      .filter((reference) => reference.description);
  }

  return structuredReferences
    .map((reference) => ({
      description: asString(reference.description) || null,
      email: asString(reference.email) || null,
      name: fullNameFromRecord(reference, "Reference"),
      organization: asString(reference.churchOrganization) || asString(reference.organization) || null,
      phone: asString(reference.phone) || null,
      relationship: asString(reference.relationship) || null,
    }))
    .filter((reference) => reference.name !== "Reference" || reference.email || reference.phone || reference.relationship || reference.description);
}

function applicationSupport(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);

  return {
    ...asRecord(contactPayload.support_json),
    ...asRecord(contactPayload.support),
  };
}

function supportDetails(row: UsamApplicationRow) {
  const support = applicationSupport(row);
  const budget = asRecord(support.budget);
  const budgetCategories = Object.keys(asRecord(budget.categories)).length > 0
    ? asRecord(budget.categories)
    : budget;
  const proposedNeed = moneyLabel(row.proposed_monthly_need) ?? moneyLabel(support.proposedMonthlyNeed) ?? moneyLabel(row.monthly_budget);
  const approvedGoal = moneyLabel(row.admin_approved_monthly_goal);
  const agreementAccepted = row.excess_support_agreement_accepted === true || support.excessSupportAgreementAccepted === true;

  return [
    compactDetail("Support Path", support.path ?? support.supportNeed),
    compactDetail("Giving Preference", support.donationLinkPreference),
    compactDetail("Work and Income Context", support.employmentContext),
    moneyLabel(budget.total) ? { label: "Worksheet Total", value: moneyLabel(budget.total) as string } : null,
    proposedNeed ? { label: "Proposed Monthly Need", value: proposedNeed } : null,
    moneyLabel(support.requestedGoal) || moneyLabel(row.support_goal)
      ? { label: "Applicant Requested Goal", value: (moneyLabel(support.requestedGoal) ?? moneyLabel(row.support_goal)) as string }
      : null,
    approvedGoal ? { label: "Approved Ministry Budget", value: approvedGoal } : null,
    /* Derived, never stored: the approved ministry budget grossed up so the 10%
       organizational allocation still leaves the budget intact. */
    moneyLabel(row.admin_approved_monthly_goal)
      ? {
          label: "Fundraising Target",
          value: moneyLabel(planningFundraisingTarget(Number(row.admin_approved_monthly_goal))) as string,
        }
      : null,
    moneyLabel(row.admin_approved_monthly_goal)
      ? {
          label: "Organizational Support At Target",
          value: moneyLabel(planningOrganizationalSupport(Number(row.admin_approved_monthly_goal))) as string,
        }
      : null,
    moneyLabel(support.committedAmount ?? support.committedSupport)
      ? { label: "Committed Support", value: moneyLabel(support.committedAmount ?? support.committedSupport) as string }
      : null,
    moneyLabel(support.otherMonthlyIncome) ? { label: "Other Monthly Income", value: moneyLabel(support.otherMonthlyIncome) as string } : null,
    compactDetail("Budget Context", support.budgetNarrative),
    compactDetail("Fundraising Approach", support.fundraisingApproachPlan),
    compactDetail("Fundraising Readiness", support.fundraisingReadiness),
    compactDetail("Immediate Needs", support.immediateNeeds),
    { label: "Excess Support Agreement", value: agreementAccepted ? "Accepted" : "Not accepted" },
    compactDetail("Agreement Accepted At", row.excess_support_agreement_accepted_at ?? support.excessSupportAgreementAcceptedAt),
    compactDetail("Agreement Version", row.excess_support_agreement_version ?? support.excessSupportAgreementVersion),
  ].filter((item): item is OperationsOnboardingDetailItem => Boolean(item));
}

function humanizeBudgetKey(key: string) {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The private worksheet in the order and wording the applicant filled it in:
 * Household, then Ministry, each category with its application label. Keys an
 * older onboarding payload used that the /join worksheet does not know are kept
 * under "Other" with readable labels, so nothing an applicant entered is lost.
 */
function budgetGroups(row: UsamApplicationRow): OperationsOnboardingBudgetGroup[] {
  const budget = asRecord(applicationSupport(row).budget);
  const categories = Object.keys(asRecord(budget.categories)).length > 0 ? asRecord(budget.categories) : budget;
  const totalsKeys = new Set(["householdTotal", "ministryTotal", "total", "categories"]);
  const known = new Set<string>(supportBudgetCategories.map((category) => category.key));
  const group = (title: string, keys: { key: string; label: string }[], subtotal: unknown) => {
    const items = keys
      .map(({ key, label }) => {
        const value = moneyLabel(categories[key]);

        return value ? { label, value } : null;
      })
      .filter((item): item is OperationsOnboardingDetailItem => Boolean(item));

    return items.length > 0 ? { items, subtotal: moneyLabel(subtotal), title } : null;
  };

  return [
    group(
      "Household",
      supportBudgetCategories.filter((category) => category.group === "household"),
      budget.householdTotal,
    ),
    group(
      "Ministry",
      supportBudgetCategories.filter((category) => category.group === "ministry"),
      budget.ministryTotal,
    ),
    group(
      "Other",
      Object.keys(categories)
        .filter((key) => !known.has(key) && !totalsKeys.has(key))
        .map((key) => ({ key, label: humanizeBudgetKey(key) })),
      null,
    ),
  ].filter((item): item is OperationsOnboardingBudgetGroup => Boolean(item));
}

function joinPhotoViewHref(row: UsamApplicationRow, kind: unknown) {
  return kind === "profile" || kind === "family" ? `/operations/missionaries/${row.id}/photos/${kind}` : null;
}

function documentItems(row: UsamApplicationRow): OperationsOnboardingDocumentItem[] {
  const contactPayload = asRecord(row.contact_payload);
  const photos = asRecord(contactPayload.photos_json);
  const profileUpload = asRecord(photos.profilePhotoUpload);
  const familyUpload = asRecord(photos.familyPhotoUpload);
  const documents = asArray(contactPayload.documents_json).map((document, index) => ({
    fileName: asString(document.fileName) || asString(document.name) || `Document ${index + 1}`,
    kind: asString(document.kind) || "Document",
    path: asString(document.path) || null,
    status: asString(document.status) || "Submitted",
    viewHref: null,
  }));
  // /join keeps both photos in contact_payload.photos. profile_photo_url
  // repeats the profile one, so it is only listed when there is no such array.
  const submittedPhotos = joinPhotos(row).map((photo) => ({
    fileName: asString(photo.fileName) || (photo.kind === "family" ? "Family photo" : "Profile photo"),
    kind: photo.kind === "family" ? "Family" : "Profile",
    path: asString(photo.path),
    status: "Submitted",
    viewHref: joinPhotoViewHref(row, photo.kind),
  }));
  const candidates: (OperationsOnboardingDocumentItem | null)[] = [
    ...submittedPhotos,
    asString(row.profile_photo_url) && submittedPhotos.length === 0
      ? { fileName: "Profile photo", kind: "Profile", path: row.profile_photo_url as string, status: "Submitted", viewHref: null }
      : null,
    asString(photos.profilePhotoName) || asString(profileUpload.path)
      ? {
        fileName: asString(photos.profilePhotoName) || asString(profileUpload.fileName) || "Profile photo",
        kind: "Profile",
        path: asString(profileUpload.path) || null,
        status: "Submitted",
        viewHref: null,
      }
      : null,
    asString(photos.familyPhotoName) || asString(familyUpload.path)
      ? {
        fileName: asString(photos.familyPhotoName) || asString(familyUpload.fileName) || "Family photo",
        kind: "Family",
        path: asString(familyUpload.path) || null,
        status: "Submitted",
        viewHref: null,
      }
      : null,
  ];
  const uploads = candidates.filter((item): item is OperationsOnboardingDocumentItem => Boolean(item));

  return [...uploads, ...documents];
}

/**
 * The /join answers that have no home in the DOS onboarding panels above:
 * church, each calling question, experience, the mission, and the draft
 * public profile. Grouped the way the applicant was asked them. Empty groups
 * are left out, so a DOS onboarding record shows nothing here.
 */
function applicationAnswers(row: UsamApplicationRow): OperationsOnboardingAnswerGroup[] {
  const contactPayload = asRecord(row.contact_payload);
  const church = asRecord(contactPayload.church);
  const calling = asRecord(contactPayload.calling);
  const experience = asRecord(contactPayload.experience);
  const mission = asRecord(contactPayload.mission);
  const profileDraft = asRecord(contactPayload.profileDraft);
  const details = (items: (OperationsOnboardingDetailItem | null)[]) =>
    items.filter((item): item is OperationsOnboardingDetailItem => Boolean(item));

  return [
    {
      items: details([
        compactDetail("Church", church.name),
        compactDetail("Church City", church.city),
        compactDetail("Church State", church.state),
        compactDetail("Time There", church.years),
        compactDetail("Role And Relationship", church.role),
        compactDetail("Pastor Or Leader", church.leaderName),
        compactDetail("Leader Email", church.leaderEmail),
        compactDetail("Leader Phone", church.leaderPhone),
      ]),
      title: "Church",
    },
    {
      items: details([
        compactDetail("Why Ministry", calling.whyMinistry),
        compactDetail("Why USA Missionaries", calling.whyUsam),
        compactDetail("Called To Reach", calling.whoCalledTo),
        compactDetail("Community Or Area", calling.geography),
        compactDetail("This Season", calling.thisSeason),
        compactDetail("Vision Or Burden", calling.burden),
      ]),
      title: "Calling",
    },
    {
      items: details([
        compactDetail("Church And Ministry Background", experience.background),
        compactDetail("Ministry Or Leadership Experience", experience.leadership),
        compactDetail("Current Ministry", experience.currentInvolvement),
        compactDetail("Training Or Education", experience.training),
        compactDetail("Gifts And Strengths", experience.gifts),
      ]),
      title: "Experience",
    },
    {
      items: details([
        compactDetail("Ministry Envisioned", mission.focus),
        compactDetail("Who They Would Serve", mission.people),
        compactDetail("Week To Week", mission.rhythm),
        compactDetail("First Goals", mission.goals),
        compactDetail("Churches Or Partners", mission.partners),
        compactDetail("Service Area", mission.area),
        compactDetail("Needs To Begin", mission.needs),
      ]),
      title: "Mission",
    },
    {
      items: details([
        compactDetail("Public Name", profileDraft.publicName),
        compactDetail("Public Location", profileDraft.publicLocation),
        compactDetail("Short Bio", profileDraft.shortBio),
        compactDetail("Story For Supporters", profileDraft.longNarrative),
        compactDetail("Ministry Description", profileDraft.ministryDescription),
      ]),
      title: "Profile Draft (Unpublished)",
    },
  ].filter((group) => group.items.length > 0);
}

function detailFromApplication(
  row: UsamApplicationRow,
  authorization: OperationsAuthorization,
): OperationsOnboardingDetail {
  const support = supportDetails(row);

  return {
    ...itemFromApplication(row),
    adminNotes: cleanText(row.admin_notes),
    adminApprovedMonthlyGoalLabel: moneyLabel(row.admin_approved_monthly_goal),
    applicantPhone: cleanText(row.applicant_phone),
    applicationAnswers: applicationAnswers(row),
    budgetGroups: budgetGroups(row),
    canManage: canManageOperationsModule(authorization, "missionaries"),
    callingFocus: cleanText(row.calling_focus),
    createdAt: row.created_at ?? null,
    decisionState: workflowText(row, "decisionState"),
    documents: documentItems(row),
    dosSetupState: workflowText(row, "dosSetupState") ?? dosSetupDefault(row),
    excessSupportAgreementAccepted: row.excess_support_agreement_accepted === true || applicationSupport(row).excessSupportAgreementAccepted === true,
    excessSupportAgreementAcceptedAt: cleanText(row.excess_support_agreement_accepted_at) ?? cleanText(applicationSupport(row).excessSupportAgreementAcceptedAt),
    excessSupportAgreementVersion: cleanText(row.excess_support_agreement_version) ?? cleanText(applicationSupport(row).excessSupportAgreementVersion),
    followUpState: workflowText(row, "followUpState"),
    householdDetails: householdDetails(row),
    householdMembers: householdMembers(row),
    interviewState: workflowText(row, "interviewState"),
    location: cleanText(row.location),
    missionaryProfileId: cleanText(row.missionary_profile_id),
    monthlyBudgetLabel: moneyLabel(row.monthly_budget),
    onboardingStatus: workflowText(row, "onboardingStatus"),
    prayerPartners: prayerPartners(row),
    prayerRequests: prayerRequests(row),
    profileReadiness: workflowText(row, "publicProfileDraft"),
    proposedMonthlyNeedLabel: moneyLabel(row.proposed_monthly_need) ?? moneyLabel(applicationSupport(row).proposedMonthlyNeed) ?? moneyLabel(row.monthly_budget),
    references: references(row),
    reviewedAt: row.reviewed_at,
    storyAnswers: storyAnswers(row),
    // A /join testimony is shown split into its questions (storyAnswers), so
    // the same text is not repeated underneath as one block.
    storyTestimony: joinStoryParts(cleanText(row.story_testimony)).length > 0 ? null : cleanText(row.story_testimony),
    supportDetails: support,
    supportGoalLabel: moneyLabel(row.admin_approved_monthly_goal) ?? moneyLabel(row.support_goal),
    updatedAt: row.updated_at ?? null,
    workspaceId: row.workspace_id,
  };
}

export async function loadOperationsOnboarding({
  limit = 50,
}: {
  limit?: number;
} = {}): Promise<{ error?: string; items: OperationsOnboardingItem[] }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      items: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select(applicationColumns)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return {
      error: isMissingTableError(error, "usam_missionary_applications")
        ? "USA Missionary applications are not connected yet."
        : error.message,
      items: [],
    };
  }

  return {
    items: ((data ?? []) as unknown as UsamApplicationRow[]).map(itemFromApplication),
  };
}

export async function loadOperationsOnboardingDetail({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}): Promise<{ error?: string; item: OperationsOnboardingDetail | null; unauthorized?: boolean }> {
  if (authorization.status !== "authorized") {
    return { item: null, unauthorized: true };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      item: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select(applicationColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      error: isMissingTableError(error, "usam_missionary_applications")
        ? "USA Missionary applications are not connected yet."
        : error.message,
      item: null,
    };
  }

  if (!data) {
    return { item: null };
  }

  return {
    item: detailFromApplication(data as unknown as UsamApplicationRow, authorization),
  };
}

function statusValue(value: string): UsamApplicationStatus {
  return usamApplicationStatuses.includes(value as UsamApplicationStatus)
    ? value as UsamApplicationStatus
    : "pending_review";
}

function profileStatusFor(status: UsamApplicationStatus) {
  if (status === "active") {
    return "published";
  }

  if (status === "approved") {
    return "approved";
  }

  if (status === "archived") {
    return "archived";
  }

  if (status === "declined" || status === "rejected") {
    return "hidden";
  }

  return "under_review";
}

export async function updateOperationsOnboardingReview({
  adminNotes,
  adminApprovedMonthlyGoal,
  assignedTo,
  authorization,
  decisionState,
  dosSetupState,
  followUpState,
  id,
  interviewState,
  onboardingStatus,
  profileReadiness,
  status,
  supportReadiness,
}: {
  adminNotes?: string | null;
  adminApprovedMonthlyGoal?: string | null;
  assignedTo?: string | null;
  authorization: OperationsAuthorization;
  decisionState?: string | null;
  dosSetupState?: string | null;
  followUpState?: string | null;
  id: string;
  interviewState?: string | null;
  onboardingStatus?: string | null;
  profileReadiness?: string | null;
  status: string;
  supportReadiness?: string | null;
}) {
  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "missionaries")) {
    return { error: "You are not authorized to manage missionary applications." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const detail = await loadOperationsOnboardingDetail({ authorization, id });

  if (detail.unauthorized || !detail.item) {
    return { error: "USA Missionaries application not found." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: currentData, error: currentError } = await supabase
    .from("usam_missionary_applications")
    .select(applicationColumns)
    .eq("id", id)
    .single();

  if (currentError || !currentData) {
    return { error: currentError?.message ?? "USA Missionaries application not found." };
  }

  const row = currentData as unknown as UsamApplicationRow;
  const now = new Date().toISOString();
  const nextStatus = statusValue(status);
  const approvedMonthlyGoal = moneyNumber(adminApprovedMonthlyGoal);
  const existingPayload = asRecord(row.contact_payload);
  const existingWorkflow = asRecord(existingPayload.workflow_json);
  const assignedAdmin = cleanText(assignedTo) ?? row.assigned_admin_email ?? authorization.email;
  const workflowJson = Object.fromEntries(Object.entries({
    ...existingWorkflow,
    decisionState: cleanText(decisionState),
    dosSetupState: cleanText(dosSetupState),
    followUpState: cleanText(followUpState),
    interviewState: cleanText(interviewState),
    lastOperationsReviewAt: now,
    lastOperationsReviewBy: authorization.email,
    onboardingStatus: cleanText(onboardingStatus),
    publicProfileDraft: cleanText(profileReadiness),
    supportProfile: cleanText(supportReadiness),
  }).filter(([, value]) => value !== undefined));
  const applicationUpdate = {
    admin_approved_monthly_goal: approvedMonthlyGoal,
    admin_notes: cleanText(adminNotes),
    assigned_admin_email: assignedAdmin,
    contact_payload: {
      ...existingPayload,
      workflow_json: workflowJson,
    },
    reviewed_at: now,
    status: nextStatus,
  };
  const updateResult = await supabase
    .from("usam_missionary_applications")
    .update(applicationUpdate)
    .eq("id", id);

  if (updateResult.error) {
    return { error: updateResult.error.message };
  }

  if (row.workspace_id) {
    const householdResult = await supabase
      .from("missionary_households")
      .update({
        usam_application_reviewed_at: now,
        usam_application_status: nextStatus,
        usam_assigned_admin_email: assignedAdmin,
        usam_profile_status: profileStatusFor(nextStatus),
      })
      .eq("id", row.workspace_id);

    if (householdResult.error) {
      return { error: householdResult.error.message };
    }

    if (approvedMonthlyGoal !== null) {
      const supportResult = await supabase
        .from("missionary_support_settings")
        .upsert({
          annual_goal: Math.round(approvedMonthlyGoal * 12),
          household_id: row.workspace_id,
          monthly_goal: Math.round(approvedMonthlyGoal),
          show_support: false,
        }, { onConflict: "household_id" });

      if (supportResult.error) {
        return { error: supportResult.error.message };
      }
    }
  }

  return { error: null };
}

async function loadApplicationRow(supabase: ReturnType<typeof createSupabaseAdminClient>, id: string) {
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select(applicationColumns)
    .eq("id", id)
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? "USA Missionaries application not found.",
      row: null,
    };
  }

  return {
    error: null,
    row: data as unknown as UsamApplicationRow,
  };
}

function restoredApplicationStatus(row: UsamApplicationRow): UsamApplicationStatus {
  const previousStatus = cleanText(workflowPayload(row).preArchiveStatus);

  if (previousStatus && previousStatus !== "archived" && usamApplicationStatuses.includes(previousStatus as UsamApplicationStatus)) {
    return previousStatus as UsamApplicationStatus;
  }

  return "pending_review";
}

function applicationPayloadWithWorkflow(
  row: UsamApplicationRow,
  workflowPatch: Record<string, unknown>,
) {
  const existingPayload = asRecord(row.contact_payload);
  const existingWorkflow = workflowPayload(row);

  return {
    ...existingPayload,
    workflow_json: Object.fromEntries(Object.entries({
      ...existingWorkflow,
      ...workflowPatch,
    }).filter(([, value]) => value !== undefined)),
  };
}

export async function archiveOperationsOnboardingApplication({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}) {
  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "missionaries")) {
    return { error: "You are not authorized to manage missionary applications." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  const { error, row } = await loadApplicationRow(supabase, id);

  if (error || !row) {
    return { error };
  }

  if (row.status === "archived") {
    return { error: null };
  }

  const now = new Date().toISOString();
  const currentStatus = statusValue(row.status ?? "");
  const assignedAdmin = row.assigned_admin_email ?? authorization.email;
  const applicationResult = await supabase
    .from("usam_missionary_applications")
    .update({
      assigned_admin_email: assignedAdmin,
      contact_payload: applicationPayloadWithWorkflow(row, {
        archivedAt: now,
        archivedBy: authorization.email,
        lastOperationsReviewAt: now,
        lastOperationsReviewBy: authorization.email,
        preArchiveStatus: currentStatus,
      }),
      reviewed_at: now,
      status: "archived",
    })
    .eq("id", id);

  if (applicationResult.error) {
    return { error: applicationResult.error.message };
  }

  if (row.workspace_id) {
    const householdResult = await supabase
      .from("missionary_households")
      .update({
        public_visible: false,
        show_household: false,
        usam_application_reviewed_at: now,
        usam_application_status: "archived",
        usam_assigned_admin_email: assignedAdmin,
        usam_profile_status: "archived",
      })
      .eq("id", row.workspace_id);

    if (householdResult.error) {
      return { error: householdResult.error.message };
    }
  }

  return { error: null };
}

export async function restoreOperationsOnboardingApplication({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}) {
  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "missionaries")) {
    return { error: "You are not authorized to manage missionary applications." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  const { error, row } = await loadApplicationRow(supabase, id);

  if (error || !row) {
    return { error };
  }

  if (row.status !== "archived") {
    return { error: null };
  }

  const now = new Date().toISOString();
  const nextStatus = restoredApplicationStatus(row);
  const assignedAdmin = row.assigned_admin_email ?? authorization.email;
  const publicVisible = nextStatus === "active";
  const applicationResult = await supabase
    .from("usam_missionary_applications")
    .update({
      assigned_admin_email: assignedAdmin,
      contact_payload: applicationPayloadWithWorkflow(row, {
        lastOperationsReviewAt: now,
        lastOperationsReviewBy: authorization.email,
        restoredAt: now,
        restoredBy: authorization.email,
      }),
      reviewed_at: now,
      status: nextStatus,
    })
    .eq("id", id);

  if (applicationResult.error) {
    return { error: applicationResult.error.message };
  }

  if (row.workspace_id) {
    const householdResult = await supabase
      .from("missionary_households")
      .update({
        public_visible: publicVisible,
        show_household: publicVisible,
        usam_application_reviewed_at: now,
        usam_application_status: nextStatus,
        usam_assigned_admin_email: assignedAdmin,
        usam_profile_status: profileStatusFor(nextStatus),
      })
      .eq("id", row.workspace_id);

    if (householdResult.error) {
      return { error: householdResult.error.message };
    }
  }

  return { error: null };
}

function applicationPhotoPaths(row: UsamApplicationRow) {
  const photos = asRecord(asRecord(row.contact_payload).photos_json);
  const profileUpload = asRecord(photos.profilePhotoUpload);
  const familyUpload = asRecord(photos.familyPhotoUpload);

  return [
    cleanText(profileUpload.path),
    cleanText(familyUpload.path),
  ].filter((path): path is string => Boolean(path));
}

export async function deleteTestOperationsOnboardingApplication({
  authorization,
  id,
}: {
  authorization: OperationsAuthorization;
  id: string;
}) {
  if (authorization.status !== "authorized" || !canManageOperationsModule(authorization, "missionaries")) {
    return { error: "You are not authorized to manage missionary applications." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  const { error, row } = await loadApplicationRow(supabase, id);

  if (error || !row) {
    return { error };
  }

  if (!testApplication(row)) {
    return { error: "Only test missionary applications can be deleted from Operations." };
  }

  const profileResult = row.profile_id
    ? await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, primary_collective_id, user_id")
      .eq("id", row.profile_id)
      .maybeSingle()
    : { data: null, error: null };
  const householdResult = row.workspace_id
    ? await supabase
      .from("missionary_households")
      .select("id, display_name, slug, usam_application_id")
      .eq("id", row.workspace_id)
      .maybeSingle()
    : { data: null, error: null };

  if (profileResult.error) {
    return { error: profileResult.error.message };
  }

  if (householdResult.error) {
    return { error: householdResult.error.message };
  }

  const profile = profileResult.data as {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    primary_collective_id: string | null;
    user_id: string | null;
  } | null;
  const household = householdResult.data as {
    display_name: string | null;
    slug: string | null;
    usam_application_id: string | null;
  } | null;
  const collectiveResult = profile?.primary_collective_id
    ? await supabase
      .from("collectives")
      .select("id, name, slug")
      .eq("id", profile.primary_collective_id)
      .maybeSingle()
    : { data: null, error: null };

  if (collectiveResult.error) {
    return { error: collectiveResult.error.message };
  }

  const collective = collectiveResult.data as { name: string | null; slug: string | null } | null;
  const deleteProfile = Boolean(profile)
    && (
      hasOperationsTestMarker(profile?.email)
      || hasOperationsTestMarker(profile?.first_name)
      || hasOperationsTestMarker(profile?.last_name)
    );
  const deleteHousehold = Boolean(household)
    && (
      hasOperationsTestMarker(household?.display_name)
      || hasOperationsTestMarker(household?.slug)
    );
  const deleteCollective = Boolean(collective)
    && (
      hasOperationsTestMarker(collective?.name)
      || hasOperationsTestMarker(collective?.slug)
    );
  const deleteAuthUserId = deleteProfile && hasOperationsTestMarker(profile?.email)
    ? row.applicant_user_id ?? profile?.user_id ?? null
    : null;

  const photoPaths = applicationPhotoPaths(row);
  if (photoPaths.length > 0) {
    await supabase.storage.from("usam-application-photos").remove(photoPaths);
  }

  if (row.workspace_id && deleteHousehold) {
    const unlinkResult = await supabase
      .from("missionary_households")
      .update({ usam_application_id: null })
      .eq("id", row.workspace_id);

    if (unlinkResult.error) {
      return { error: unlinkResult.error.message };
    }
  }

  const applicationDeleteResult = await supabase
    .from("usam_missionary_applications")
    .delete()
    .eq("id", id);

  if (applicationDeleteResult.error) {
    return { error: applicationDeleteResult.error.message };
  }

  if (row.workspace_id && deleteHousehold) {
    const supportDeleteResult = await supabase
      .from("missionary_support_settings")
      .delete()
      .eq("household_id", row.workspace_id);

    if (supportDeleteResult.error) {
      return { error: supportDeleteResult.error.message };
    }

    const teamDeleteResult = await supabase
      .from("missionary_team_members")
      .delete()
      .eq("household_id", row.workspace_id);

    if (teamDeleteResult.error) {
      return { error: teamDeleteResult.error.message };
    }

    const householdDeleteResult = await supabase
      .from("missionary_households")
      .delete()
      .eq("id", row.workspace_id);

    if (householdDeleteResult.error) {
      return { error: householdDeleteResult.error.message };
    }
  }

  if (row.profile_id && deleteProfile) {
    if (row.organization_id) {
      const membershipDeleteResult = await supabase
        .from("organization_memberships")
        .delete()
        .eq("organization_id", row.organization_id)
        .eq("profile_id", row.profile_id);

      if (membershipDeleteResult.error) {
        return { error: membershipDeleteResult.error.message };
      }
    }

    const collectiveMembershipDeleteResult = await supabase
      .from("collective_memberships")
      .delete()
      .eq("profile_id", row.profile_id);

    if (collectiveMembershipDeleteResult.error) {
      return { error: collectiveMembershipDeleteResult.error.message };
    }

    const profileDeleteResult = await supabase
      .from("profiles")
      .delete()
      .eq("id", row.profile_id);

    if (profileDeleteResult.error) {
      return { error: profileDeleteResult.error.message };
    }
  }

  if (profile?.primary_collective_id && deleteCollective) {
    const collectiveMembershipDeleteResult = await supabase
      .from("collective_memberships")
      .delete()
      .eq("collective_id", profile.primary_collective_id);

    if (collectiveMembershipDeleteResult.error) {
      return { error: collectiveMembershipDeleteResult.error.message };
    }

    const collectiveDeleteResult = await supabase
      .from("collectives")
      .delete()
      .eq("id", profile.primary_collective_id);

    if (collectiveDeleteResult.error) {
      return { error: collectiveDeleteResult.error.message };
    }
  }

  if (deleteAuthUserId) {
    const authResult = await supabase.auth.admin.deleteUser(deleteAuthUserId);

    if (authResult.error && !authResult.error.message.toLowerCase().includes("not found")) {
      return { error: authResult.error.message };
    }
  }

  return { error: null };
}

/**
 * A /join applicant photo for an Operations reviewer.
 *
 * The bucket stays private: nothing here mints a URL that could be shared. The
 * caller streams the bytes back through an Operations route, behind the same
 * missionaries-module check the record itself uses, and only paths /join's
 * own upload route wrote (pending/...) are ever read.
 */
export async function loadOperationsApplicationPhoto({
  authorization,
  id,
  kind,
}: {
  authorization: OperationsAuthorization;
  id: string;
  kind: string;
}): Promise<{ body: Blob; contentType: string; fileName: string } | null> {
  if (authorization.status !== "authorized" || !isSupabaseAdminConfigured()) {
    return null;
  }

  if (kind !== "profile" && kind !== "family") {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select("id, contact_payload")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const photo = joinPhotos(data as unknown as UsamApplicationRow).find((candidate) => candidate.kind === kind);
  const path = asString(photo?.path);
  const bucket = asString(photo?.bucket) || JOIN_APPLICATION_PHOTO_BUCKET;

  if (!photo || !path.startsWith("pending/") || path.includes("..") || bucket !== JOIN_APPLICATION_PHOTO_BUCKET) {
    return null;
  }

  const download = await supabase.storage.from(bucket).download(path);

  if (download.error || !download.data) {
    return null;
  }

  return {
    body: download.data,
    contentType: asString(photo.contentType) || download.data.type || "application/octet-stream",
    fileName: asString(photo.fileName) || `${kind}-photo`,
  };
}
