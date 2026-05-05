import { NextResponse } from "next/server";
import {
  createFormSubmission,
  getAssignedTeamForFormType,
  type FormSubmissionType,
} from "@/src/lib/forms/form-submissions";

type PublicFormPayload = {
  email?: unknown;
  firstName?: unknown;
  formType?: unknown;
  lastName?: unknown;
  message?: unknown;
  payload?: unknown;
  phone?: unknown;
  priority?: unknown;
  sourcePage?: unknown;
};

const allowedFormTypes = [
  "financial_freedom",
  "field_report_access",
  "join_mission_interest",
  "major_gift",
  "missionary_profile_review",
  "contact",
  "support_giving",
  "prayer_request",
  "prayer_team_application",
  "missionary_application",
  "system_waitlist",
  "general",
] as const satisfies readonly FormSubmissionType[];

const allowedPriorities = ["high", "low", "normal", "urgent"] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const valueString = asString(value);

  return valueString ? valueString : null;
}

function asPayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFormType(value: unknown): FormSubmissionType | null {
  const valueString = asString(value);

  return allowedFormTypes.includes(valueString as FormSubmissionType)
    ? valueString as FormSubmissionType
    : null;
}

function getPriority(value: unknown) {
  const valueString = asString(value);

  return allowedPriorities.includes(valueString as typeof allowedPriorities[number])
    ? valueString as typeof allowedPriorities[number]
    : "normal";
}

export async function POST(request: Request) {
  let body: PublicFormPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const formType = getFormType(body.formType);
  const email = asString(body.email).toLowerCase();
  const firstName = asString(body.firstName);
  const lastName = asString(body.lastName);

  if (!formType) {
    return NextResponse.json({ error: "Invalid form type." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please include a valid email address." }, { status: 400 });
  }

  const { error, id } = await createFormSubmission({
    assignedTeam: getAssignedTeamForFormType(formType),
    email,
    firstName,
    formType,
    lastName,
    message: asNullableString(body.message),
    payload: asPayload(body.payload),
    phone: asNullableString(body.phone),
    priority: getPriority(body.priority),
    sourcePage: asNullableString(body.sourcePage),
  });

  if (error) {
    return NextResponse.json({ error: "Unable to save this submission." }, { status: 500 });
  }

  return NextResponse.json({
    assignedTeam: getAssignedTeamForFormType(formType),
    id,
    ok: true,
  });
}
