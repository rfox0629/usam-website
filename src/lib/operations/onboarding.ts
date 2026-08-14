import "server-only";

import {
  canManageOperationsModule,
  type OperationsAuthorization,
} from "@/src/lib/operations/auth";
import {
  usamApplicationStatuses,
  type UsamApplicationStatus,
} from "@/src/lib/dos/usam-application";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type UsamApplicationRow = {
  admin_notes?: string | null;
  applicant_email: string | null;
  applicant_name: string | null;
  applicant_phone: string | null;
  applicant_user_id?: string | null;
  assigned_admin_email: string | null;
  calling_focus?: string | null;
  contact_payload?: unknown;
  created_at: string;
  id: string;
  location?: string | null;
  missionary_profile_id?: string | null;
  monthly_budget?: number | string | null;
  organization_id?: string | null;
  profile_id?: string | null;
  prayer_needs?: string | null;
  profile_photo_url?: string | null;
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
};

export type OperationsOnboardingDetail = OperationsOnboardingItem & {
  adminNotes: string | null;
  applicantPhone: string | null;
  canManage: boolean;
  callingFocus: string | null;
  createdAt: string | null;
  decisionState: string | null;
  documents: OperationsOnboardingDocumentItem[];
  dosSetupState: string | null;
  followUpState: string | null;
  householdDetails: OperationsOnboardingDetailItem[];
  householdMembers: OperationsOnboardingHouseholdMember[];
  interviewState: string | null;
  location: string | null;
  monthlyBudgetLabel: string | null;
  onboardingStatus: string | null;
  prayerPartners: OperationsOnboardingContactItem[];
  prayerRequests: string[];
  profileReadiness: string | null;
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
  "applicant_name",
  "applicant_email",
  "applicant_phone",
  "location",
  "calling_focus",
  "story_testimony",
  "monthly_budget",
  "support_goal",
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
    cleanText(row.profile_photo_url)
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

function itemFromApplication(row: UsamApplicationRow): OperationsOnboardingItem {
  const workflow = workflowPayload(row);
  const missing = missingRequirements(row);
  const status = onboardingStatusLabel(row.status);

  return {
    assignedTo: cleanText(row.assigned_admin_email),
    candidate: cleanText(row.applicant_name) ?? cleanText(row.applicant_email) ?? "Unnamed candidate",
    completionLabel: completionLabel(missing),
    decisionLabel: cleanText(workflow.decisionState) ?? decisionLabel(row.status),
    documentsLabel: documentsLabel(row),
    dosSetupLabel: row.workspace_id ? "Workspace linked" : "Not connected",
    email: cleanText(row.applicant_email),
    followUpLabel: cleanText(workflow.followUpState) ?? (row.reviewed_at ? "Review complete" : "Review needed"),
    fundraisingLabel: cleanText(workflow.supportProfile) ?? (row.support_goal ? "Goal captured" : "Pending"),
    href: `/operations/missionaries/${row.id}`,
    id: row.id,
    missingRequirements: missing,
    profileLabel: cleanText(workflow.publicProfileDraft) ?? (row.missionary_profile_id ? "Profile linked" : "Draft needed"),
    referencesLabel: referencesLabel(row),
    reviewLabel: row.reviewed_at ? "Reviewed" : "Needs review",
    status,
    statusKey: statusValue(row.status ?? ""),
    submittedAt: row.submitted_at ?? row.created_at ?? null,
  };
}

function householdDetails(row: UsamApplicationRow) {
  const household = asRecord(asRecord(row.contact_payload).household_json);
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
  ].filter((item): item is OperationsOnboardingDetailItem => Boolean(item));
}

function householdMembers(row: UsamApplicationRow): OperationsOnboardingHouseholdMember[] {
  const household = asRecord(asRecord(row.contact_payload).household_json);

  return asArray(household.familyMembers)
    .map((member) => ({
      age: asString(member.age) || null,
      name: fullNameFromRecord(member, "Household member"),
      relationship: asString(member.relationship) || null,
      status: asString(member.dependentStatus) || null,
    }))
    .filter((member) => member.name !== "Household member" || member.relationship || member.age || member.status);
}

function storyAnswers(row: UsamApplicationRow) {
  const story = asRecord(asRecord(row.contact_payload).story_json);
  const answers = asRecord(story.answers);

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
  const prayer = asRecord(asRecord(row.contact_payload).prayer_json);

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

function supportDetails(row: UsamApplicationRow) {
  const support = asRecord(asRecord(row.contact_payload).support_json);
  const budget = asRecord(support.budget);
  const budgetDetails = Object.entries(budget)
    .map(([key, value]) => {
      const label = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      const formatted = moneyLabel(value);

      return formatted ? { label, value: formatted } : null;
    })
    .filter((item): item is OperationsOnboardingDetailItem => Boolean(item));

  return [
    compactDetail("Support Needed", support.supportNeed),
    compactDetail("Giving Preference", support.donationLinkPreference),
    moneyLabel(row.monthly_budget) ? { label: "Monthly Budget", value: moneyLabel(row.monthly_budget) as string } : null,
    moneyLabel(row.support_goal) ? { label: "Support Goal", value: moneyLabel(row.support_goal) as string } : null,
    moneyLabel(support.committedSupport) ? { label: "Committed Support", value: moneyLabel(support.committedSupport) as string } : null,
    moneyLabel(support.otherMonthlyIncome) ? { label: "Other Monthly Income", value: moneyLabel(support.otherMonthlyIncome) as string } : null,
    ...budgetDetails,
  ].filter((item): item is OperationsOnboardingDetailItem => Boolean(item));
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
  }));
  const uploads = [
    asString(row.profile_photo_url)
      ? { fileName: "Profile photo", kind: "Profile", path: row.profile_photo_url as string, status: "Submitted" }
      : null,
    asString(photos.profilePhotoName) || asString(profileUpload.path)
      ? {
        fileName: asString(photos.profilePhotoName) || asString(profileUpload.fileName) || "Profile photo",
        kind: "Profile",
        path: asString(profileUpload.path) || null,
        status: "Submitted",
      }
      : null,
    asString(photos.familyPhotoName) || asString(familyUpload.path)
      ? {
        fileName: asString(photos.familyPhotoName) || asString(familyUpload.fileName) || "Family photo",
        kind: "Family",
        path: asString(familyUpload.path) || null,
        status: "Submitted",
      }
      : null,
  ].filter((item): item is OperationsOnboardingDocumentItem => Boolean(item));

  return [...uploads, ...documents];
}

function detailFromApplication(
  row: UsamApplicationRow,
  authorization: OperationsAuthorization,
): OperationsOnboardingDetail {
  const support = supportDetails(row);

  return {
    ...itemFromApplication(row),
    adminNotes: cleanText(row.admin_notes),
    applicantPhone: cleanText(row.applicant_phone),
    canManage: canManageOperationsModule(authorization, "missionaries"),
    callingFocus: cleanText(row.calling_focus),
    createdAt: row.created_at ?? null,
    decisionState: workflowText(row, "decisionState"),
    documents: documentItems(row),
    dosSetupState: workflowText(row, "dosSetupState") ?? (row.workspace_id ? "Workspace linked" : null),
    followUpState: workflowText(row, "followUpState"),
    householdDetails: householdDetails(row),
    householdMembers: householdMembers(row),
    interviewState: workflowText(row, "interviewState"),
    location: cleanText(row.location),
    monthlyBudgetLabel: moneyLabel(row.monthly_budget),
    onboardingStatus: workflowText(row, "onboardingStatus"),
    prayerPartners: prayerPartners(row),
    prayerRequests: prayerRequests(row),
    profileReadiness: workflowText(row, "publicProfileDraft"),
    references: references(row),
    reviewedAt: row.reviewed_at,
    storyAnswers: storyAnswers(row),
    storyTestimony: cleanText(row.story_testimony),
    supportDetails: support,
    supportGoalLabel: moneyLabel(row.support_goal),
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
  }

  return { error: null };
}
