export const dosReviewOutcomeOptions = [
  { label: "Reconciliation", value: "Reconciliation" },
  { label: "New Believers", value: "New Believers" },
  { label: "Marriage Restoration", value: "Marriage Restoration" },
  { label: "Baptized", value: "Baptized" },
  { label: "Discipling", value: "Discipling" },
  { label: "Started Discipling Others", value: "Started Discipling Others" },
  { label: "Answered Prayer", value: "Answered Prayer" },
] as const;

export const dosReviewSharePermissionOptions = [
  { label: "Yes, anonymously", value: "anonymous" },
  { label: "Yes, with my name included", value: "with_name" },
  { label: "No, keep it private", value: "private" },
] as const;

export const dosQuickReviewHelpedOptions = [
  { label: "Yes", value: "yes" },
  { label: "Unsure", value: "unsure" },
  { label: "No", value: "no" },
] as const;

export const dosQuickReviewMeetAgainOptions = [
  { label: "Yes", value: "yes" },
  { label: "Maybe", value: "maybe" },
  { label: "No", value: "no" },
] as const;

export const dosReviewOptionChoices = [
  {
    description: "Four short questions for quick care and follow-up.",
    label: "2 Minute Review / Quick Review",
    value: "quick_review",
  },
  {
    description: "A deeper story form for testimony and fruit.",
    label: "Testimony Review",
    value: "testimony_review",
  },
] as const;

export const dosQuickReviewFormDefinition = {
  description: "A short reflection form someone completes after a saved Table.",
  title: "2 Minute Review",
  sections: [
    {
      fieldType: "text",
      helper: "Optional confirmation only. The secure link already connects this response to the right Table.",
      label: "Your name",
      type: "field",
    },
    {
      fieldType: "email",
      helper: "Optional confirmation only.",
      label: "Email address",
      type: "field",
    },
    {
      choiceType: "pill",
      label: "I felt heard",
      options: ["Yes", "No"],
      type: "choice",
    },
    {
      choiceType: "pill",
      label: "I felt cared for",
      options: ["Yes", "No"],
      type: "choice",
    },
    {
      choiceType: "pill",
      label: "This conversation helped me",
      options: dosQuickReviewHelpedOptions.map((option) => option.label),
      type: "choice",
    },
    {
      choiceType: "pill",
      label: "I would meet again",
      options: dosQuickReviewMeetAgainOptions.map((option) => option.label),
      type: "choice",
    },
    {
      choiceType: "checkbox",
      label: "What fruit did you notice?",
      options: dosReviewOutcomeOptions.map((option) => option.label),
      type: "choice",
    },
    {
      fieldType: "textarea",
      label: "Anything you want us to know?",
      placeholder: "Optional note",
      type: "field",
    },
    {
      copy: "Responses are reviewed before anything is shared publicly.",
      label: "Privacy",
      type: "notice",
    },
    {
      choiceType: "radio",
      label: "May we share this testimony?",
      options: dosReviewSharePermissionOptions.map((option) => option.label),
      type: "choice",
    },
  ],
} as const;

export const dosTestimonyReviewFormDefinition = {
  description: "A deeper story form someone completes after a saved Table.",
  title: "Testimony Review",
  sections: [
    {
      fieldType: "text",
      helper: "Optional confirmation only. The secure link already connects this response to the right Table.",
      label: "Your name",
      type: "field",
    },
    {
      fieldType: "email",
      helper: "Optional confirmation only.",
      label: "Email address",
      type: "field",
    },
    {
      fieldType: "textarea",
      label: "What happened?",
      placeholder: "Share what happened in your own words.",
      required: true,
      type: "field",
    },
    {
      fieldType: "textarea",
      label: "What changed?",
      placeholder: "What feels different now?",
      type: "field",
    },
    {
      fieldType: "text",
      label: "Did you take a next step?",
      placeholder: "Optional",
      type: "field",
    },
    {
      choiceType: "checkbox",
      label: "What fruit did you notice?",
      options: dosReviewOutcomeOptions.map((option) => option.label),
      type: "choice",
    },
    {
      copy: "Stories are reviewed before anything is shared publicly.",
      label: "Privacy",
      type: "notice",
    },
    {
      choiceType: "radio",
      label: "May we share this testimony?",
      options: dosReviewSharePermissionOptions.map((option) => option.label),
      type: "choice",
    },
  ],
} as const;

export type DosReviewOutcomeValue = typeof dosReviewOutcomeOptions[number]["value"];
export type DosReviewOptionChoice = typeof dosReviewOptionChoices[number]["value"];
export type DosReviewSharePermissionValue = typeof dosReviewSharePermissionOptions[number]["value"];

const dosReviewOutcomeValueSet = new Set<string>(dosReviewOutcomeOptions.map((option) => option.value));

export function normalizeDosReviewOutcomeTags(value: unknown): DosReviewOutcomeValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value.filter((item): item is DosReviewOutcomeValue => (
      typeof item === "string" && dosReviewOutcomeValueSet.has(item)
    )),
  ));
}
