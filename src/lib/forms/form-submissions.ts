import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export type FormSubmissionType =
  | "financial_freedom"
  | "field_report_access"
  | "join_mission_interest"
  | "major_gift"
  | "missionary_profile_review"
  | "contact"
  | "support_giving"
  | "prayer_request"
  | "prayer_team_application"
  | "missionary_application"
  | "system_waitlist"
  | "general";

export type AssignedTeam = "prayer_team" | "support_team";

type CreateFormSubmissionInput = {
  assignedTeam?: AssignedTeam;
  email?: string | null;
  firstName?: string | null;
  formType: FormSubmissionType;
  lastName?: string | null;
  message?: string | null;
  payload?: Record<string, unknown>;
  phone?: string | null;
  priority?: "high" | "low" | "normal" | "urgent";
  sourcePage?: string | null;
  status?: "new" | "reviewed" | "follow_up" | "converted" | "archived";
};

function cleanString(value: string | null | undefined) {
  const nextValue = value?.trim();

  return nextValue ? nextValue : null;
}

export function getAssignedTeamForFormType(formType: FormSubmissionType): AssignedTeam {
  return formType === "prayer_team_application" || formType === "prayer_request"
    ? "prayer_team"
    : "support_team";
}

export async function createFormSubmission(input: CreateFormSubmissionInput) {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      id: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("form_submissions")
    .insert({
      assigned_team: input.assignedTeam ?? getAssignedTeamForFormType(input.formType),
      email: cleanString(input.email)?.toLowerCase() ?? null,
      first_name: cleanString(input.firstName),
      form_type: input.formType,
      last_name: cleanString(input.lastName),
      message: cleanString(input.message),
      payload: input.payload ?? {},
      phone: cleanString(input.phone),
      priority: input.priority ?? "normal",
      source_page: cleanString(input.sourcePage),
      status: input.status ?? "new",
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.message,
      id: null,
    };
  }

  return {
    error: null,
    id: (data as { id?: string } | null)?.id ?? null,
  };
}
