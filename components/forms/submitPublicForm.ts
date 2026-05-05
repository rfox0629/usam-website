type FormSubmissionType =
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

type SubmitPublicFormInput = {
  email: string;
  firstName?: string;
  formType: FormSubmissionType;
  lastName?: string;
  message?: string;
  payload?: Record<string, unknown>;
  phone?: string;
  priority?: "high" | "low" | "normal" | "urgent";
  sourcePage: string;
};

export async function submitPublicForm(input: SubmitPublicFormInput) {
  const response = await fetch("/api/form-submissions", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : "Unable to submit this form.");
  }

  return result as { assignedTeam?: string; id?: string; ok?: boolean };
}

export function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function getAllStrings(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
}
