import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type UsamApplicationRow = {
  admin_notes?: string | null;
  applicant_email: string | null;
  applicant_name: string | null;
  applicant_phone: string | null;
  assigned_admin_email: string | null;
  calling_focus?: string | null;
  contact_payload?: unknown;
  created_at: string;
  id: string;
  missionary_profile_id?: string | null;
  profile_id?: string | null;
  references_text?: string | null;
  reviewed_at: string | null;
  status: string | null;
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
  submittedAt: string | null;
};

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
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

function missingRequirements(row: UsamApplicationRow) {
  const contactPayload = asRecord(row.contact_payload);
  const story = asRecord(contactPayload.story_json);
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

  if (!cleanText(story.testimony) && !cleanText(story.calling)) {
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
  const photos = asArray(contactPayload.photos_json);
  const documents = asArray(contactPayload.documents_json);

  if (documents.length > 0) {
    return `${documents.length} documents`;
  }

  if (photos.length > 0) {
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
    href: "/admin/organizations/usa-missionaries?tab=applications",
    id: row.id,
    missingRequirements: missing,
    profileLabel: cleanText(workflow.publicProfileDraft) ?? (row.missionary_profile_id ? "Profile linked" : "Draft needed"),
    referencesLabel: referencesLabel(row),
    reviewLabel: row.reviewed_at ? "Reviewed" : "Needs review",
    status,
    submittedAt: row.submitted_at ?? row.created_at ?? null,
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
    .select("id, workspace_id, missionary_profile_id, profile_id, applicant_name, applicant_email, applicant_phone, calling_focus, references_text, support_goal, status, assigned_admin_email, admin_notes, submitted_at, reviewed_at, created_at, updated_at, contact_payload")
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
    items: ((data ?? []) as UsamApplicationRow[]).map(itemFromApplication),
  };
}
