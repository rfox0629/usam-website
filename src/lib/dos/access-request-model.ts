/**
 * USA-289: the DOS access request submitted from /dos/setup.
 *
 * Shared by the browser form and the server route, so both validate the same
 * rules. This module must stay free of server-only imports.
 *
 * A DOS access request is not a USA Missionaries application. Missionary
 * applicants go to /join, which has its own record and review.
 */

export const dosAccessRequestTypes = ["individual", "organization"] as const;
export type DosAccessRequestType = typeof dosAccessRequestTypes[number];

export const dosAccessRequestStatuses = ["submitted", "approved", "declined"] as const;
export type DosAccessRequestStatus = typeof dosAccessRequestStatuses[number];

export const dosAccessRequestSchemaVersion = 1;

export const individualRoleOptions = [
  "Disciple-maker",
  "Small group or Bible study leader",
  "Pastor or ministry leader",
  "Missionary",
  "Parent or mentor",
  "Other",
] as const;

export const organizationTypeOptions = [
  "Church",
  "Ministry or nonprofit",
  "Mission organization",
  "Small group network",
  "School or campus ministry",
  "Other",
] as const;

export const expectedUserOptions = [
  "Just me to start",
  "2–10 people",
  "11–50 people",
  "51–200 people",
  "More than 200 people",
] as const;

export const primaryUseOptions = [
  "Keep track of the people I am discipling",
  "Prayer and follow-up",
  "Meetings and discipleship rhythms",
  "Small groups",
  "Journeys and reading plans",
  "Equip leaders who disciple others",
] as const;

export const heardAboutOptions = [
  "A friend or leader invited me",
  "USA Missionaries",
  "My church or ministry",
  "The DOS website",
  "Other",
] as const;

export type DosAccessRequestAnswers = {
  acknowledgement: boolean;
  churchOrCommunity: string;
  city: string;
  email: string;
  expectedUsers: string;
  firstName: string;
  goals: string;
  heardAbout: string;
  individualRole: string;
  invitedBy: string;
  lastName: string;
  organizationName: string;
  organizationRole: string;
  organizationType: string;
  organizationWebsite: string;
  phone: string;
  primaryUses: string[];
  region: string;
  requestType: DosAccessRequestType | "";
};

export const emptyDosAccessRequestAnswers: DosAccessRequestAnswers = {
  acknowledgement: false,
  churchOrCommunity: "",
  city: "",
  email: "",
  expectedUsers: "",
  firstName: "",
  goals: "",
  heardAbout: "",
  individualRole: "",
  invitedBy: "",
  lastName: "",
  organizationName: "",
  organizationRole: "",
  organizationType: "",
  organizationWebsite: "",
  phone: "",
  primaryUses: [],
  region: "",
  requestType: "",
};

export const dosAccessRequestStepIds = ["path", "contact", "details", "use", "review"] as const;
export type DosAccessRequestStepId = typeof dosAccessRequestStepIds[number];

export type DosAccessRequestFieldErrors = Partial<Record<keyof DosAccessRequestAnswers, string>>;

const textLimits: Partial<Record<keyof DosAccessRequestAnswers, number>> = {
  churchOrCommunity: 160,
  city: 80,
  email: 254,
  expectedUsers: 60,
  firstName: 80,
  goals: 1500,
  heardAbout: 80,
  individualRole: 80,
  invitedBy: 120,
  lastName: 80,
  organizationName: 160,
  organizationRole: 120,
  organizationType: 80,
  organizationWebsite: 200,
  phone: 40,
  region: 80,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string) {
  return emailPattern.test(value.trim());
}

function asText(value: unknown, key: keyof DosAccessRequestAnswers) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const limit = textLimits[key] ?? 200;

  return text.slice(0, limit);
}

function asMultilineText(value: unknown, key: keyof DosAccessRequestAnswers) {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";

  return text.slice(0, textLimits[key] ?? 1500);
}

function oneOf<T extends readonly string[]>(value: unknown, options: T): T[number] | "" {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? value as T[number] : "";
}

/** Normalizes untrusted input into the answer shape, dropping anything unknown. */
export function normalizeDosAccessRequestAnswers(input: unknown): DosAccessRequestAnswers {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const primaryUses = Array.isArray(source.primaryUses)
    ? Array.from(new Set(source.primaryUses.filter((value): value is string => (
      typeof value === "string" && (primaryUseOptions as readonly string[]).includes(value)
    ))))
    : [];

  return {
    acknowledgement: source.acknowledgement === true,
    churchOrCommunity: asText(source.churchOrCommunity, "churchOrCommunity"),
    city: asText(source.city, "city"),
    email: asText(source.email, "email").toLowerCase(),
    expectedUsers: oneOf(source.expectedUsers, expectedUserOptions),
    firstName: asText(source.firstName, "firstName"),
    goals: asMultilineText(source.goals, "goals"),
    heardAbout: oneOf(source.heardAbout, heardAboutOptions),
    individualRole: oneOf(source.individualRole, individualRoleOptions),
    invitedBy: asText(source.invitedBy, "invitedBy"),
    lastName: asText(source.lastName, "lastName"),
    organizationName: asText(source.organizationName, "organizationName"),
    organizationRole: asText(source.organizationRole, "organizationRole"),
    organizationType: oneOf(source.organizationType, organizationTypeOptions),
    organizationWebsite: asText(source.organizationWebsite, "organizationWebsite"),
    phone: asText(source.phone, "phone"),
    primaryUses,
    region: asText(source.region, "region"),
    requestType: oneOf(source.requestType, dosAccessRequestTypes),
  };
}

/** Field errors for one step. An empty object means the step is complete. */
export function validateDosAccessRequestStep(
  stepId: DosAccessRequestStepId,
  answers: DosAccessRequestAnswers,
): DosAccessRequestFieldErrors {
  const errors: DosAccessRequestFieldErrors = {};

  if (stepId === "path" && !answers.requestType) {
    errors.requestType = "Choose who this DOS access is for.";
  }

  if (stepId === "contact") {
    if (!answers.firstName.trim()) {
      errors.firstName = "Add your first name.";
    }

    if (!answers.lastName.trim()) {
      errors.lastName = "Add your last name.";
    }

    if (!answers.email.trim()) {
      errors.email = "Add the email you want to sign in with.";
    } else if (!isValidEmail(answers.email)) {
      errors.email = "Check the email address. It should look like name@example.org.";
    }

    if (answers.phone.trim() && answers.phone.replace(/\D/g, "").length < 7) {
      errors.phone = "Check the phone number, or leave it blank.";
    }
  }

  if (stepId === "details") {
    if (answers.requestType === "organization") {
      if (!answers.organizationName.trim()) {
        errors.organizationName = "Add the organization's name.";
      }

      if (!answers.organizationType) {
        errors.organizationType = "Choose the kind of organization.";
      }

      if (!answers.organizationRole.trim()) {
        errors.organizationRole = "Add your role, for example Pastor or Director.";
      }

      if (!answers.expectedUsers) {
        errors.expectedUsers = "Choose about how many people would use DOS.";
      }
    } else if (!answers.individualRole) {
      errors.individualRole = "Choose the option that best describes you.";
    }
  }

  if (stepId === "use" && answers.primaryUses.length === 0) {
    errors.primaryUses = "Choose at least one way you plan to use DOS.";
  }

  if (stepId === "review" && !answers.acknowledgement) {
    errors.acknowledgement = "Confirm you understand this request is reviewed before access is given.";
  }

  return errors;
}

export function validateDosAccessRequest(answers: DosAccessRequestAnswers) {
  return dosAccessRequestStepIds.reduce<DosAccessRequestFieldErrors>((errors, stepId) => ({
    ...errors,
    ...validateDosAccessRequestStep(stepId, answers),
  }), {});
}

export function firstInvalidStep(answers: DosAccessRequestAnswers): DosAccessRequestStepId | null {
  return dosAccessRequestStepIds.find((stepId) => Object.keys(validateDosAccessRequestStep(stepId, answers)).length > 0) ?? null;
}

export function dosAccessRequestTypeLabel(value: DosAccessRequestType | "" | null | undefined) {
  if (value === "organization") {
    return "Organization";
  }

  if (value === "individual") {
    return "Individual";
  }

  return "Not chosen";
}

export function dosAccessRequestStatusLabel(value: string | null | undefined) {
  if (value === "approved") {
    return "Approved";
  }

  if (value === "declined") {
    return "Declined";
  }

  return "Awaiting review";
}

/** A submission key is minted once per draft; the server treats a repeat as the same request. */
export function isValidSubmissionKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{16,80}$/.test(value);
}
