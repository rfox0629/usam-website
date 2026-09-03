export const dosReviewOutcomeOptions = [
  { label: "Reconciliation", value: "Reconciliation" },
  { label: "New Believers", value: "New Believers" },
  { label: "Marriage Restoration", value: "Marriage Restoration" },
  { label: "Baptized", value: "Baptized" },
  { label: "Discipling", value: "Discipling" },
  { label: "Started Discipling Others", value: "Started Discipling Others" },
  { label: "Answered Prayer", value: "Answered Prayer" },
] as const;

/* What Quick Review V2 offers. Four things a person can actually notice in
   themselves after a conversation. The ten-option list below is kept as the
   historical set -- reviews already submitted still render every tag they
   carry -- but it is no longer what anyone is asked. */
export const dosQuickReviewExperienceOptions = [
  { label: "I felt closer to God", value: "Closer to God" },
  { label: "Someone prayed with me", value: "Prayer Received" },
  { label: "I decided to follow Jesus", value: "New Believers" },
  { label: "I want to keep growing", value: "Discipling" },
] as const;

/* Historical: every tag Quick Review has ever written. Kept so a stored tag
   never becomes unrenderable, and so the legacy "Follow Up Requested" value
   still validates on the way in. Not offered as a new choice. */
export const dosQuickReviewOutcomeOptions = [
  { label: "I experienced encouragement", value: "Felt encouraged" },
  { label: "I experienced hope", value: "Hope" },
  { label: "I experienced peace", value: "Peace" },
  { label: "Someone prayed with me", value: "Prayer Received" },
  { label: "I experienced forgiveness", value: "Reconciliation" },
  { label: "I feel closer to God", value: "Closer to God" },
  { label: "I want to grow spiritually", value: "Discipling" },
  { label: "I made a decision to follow Jesus", value: "New Believers" },
  { label: "I'd like someone to follow up with me", value: "Follow Up Requested" },
  { label: "Other", value: "Other" },
] as const;

export const dosReviewSharePermissionOptions = [
  { label: "Yes, anonymously", value: "anonymous" },
  { label: "Yes, with my name included", value: "with_name" },
  { label: "No, keep it private", value: "private" },
] as const;

/* Historical. Quick Review no longer asks agree/disagree questions, but
   reviews already submitted carry these values and must keep rendering with
   the words they were answered in. */
export const dosQuickReviewAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "Somewhat", value: "somewhat" },
  { label: "No", value: "no" },
] as const;

export const dosQuickReviewOverallRatingOptions = [
  { label: "Life-changing", value: "life_changing" },
  { label: "Very meaningful", value: "very_meaningful" },
  { label: "Helpful", value: "helpful" },
  { label: "Somewhat helpful", value: "somewhat_helpful" },
  { label: "Not very helpful", value: "not_very_helpful" },
] as const;

export const dosReviewOptionChoices = [
  {
    description: "A short feedback form for care and follow-up.",
    label: "Quick Review",
    value: "quick_review",
  },
  {
    description: "A deeper story form for testimony and fruit.",
    label: "Testimony Review",
    value: "testimony_review",
  },
] as const;

export const dosQuickReviewFormDefinition = {
  description: "Three questions. It takes about fifteen seconds.",
  title: "Quick Review",
  sections: [
    {
      choiceType: "radio",
      label: "How was it?",
      options: dosQuickReviewOverallRatingOptions.map((option) => option.label),
      type: "choice",
    },
    {
      choiceType: "checkbox",
      label: "Did any of this happen? (optional)",
      options: dosQuickReviewExperienceOptions.map((option) => option.label),
      type: "choice",
    },
    {
      fieldType: "textarea",
      label: "Anything you'd like us to know? (optional)",
      type: "field",
    },
    {
      choiceType: "checkbox",
      label: "Follow-up",
      options: ["I'd like someone to follow up with me"],
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
export type DosQuickReviewOutcomeValue = typeof dosQuickReviewOutcomeOptions[number]["value"];
export type DosQuickReviewExperienceValue = typeof dosQuickReviewExperienceOptions[number]["value"];
export type DosReviewOptionChoice = typeof dosReviewOptionChoices[number]["value"];
export type DosReviewSharePermissionValue = typeof dosReviewSharePermissionOptions[number]["value"];
export type DosQuickReviewOverallRatingValue = typeof dosQuickReviewOverallRatingOptions[number]["value"];

const dosReviewOutcomeValueSet = new Set<string>(dosReviewOutcomeOptions.map((option) => option.value));
const dosQuickReviewOutcomeValueSet = new Set<string>(dosQuickReviewOutcomeOptions.map((option) => option.value));

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

export function normalizeDosQuickReviewOutcomeTags(value: unknown): DosQuickReviewOutcomeValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value.filter((item): item is DosQuickReviewOutcomeValue => (
      typeof item === "string" && dosQuickReviewOutcomeValueSet.has(item)
    )),
  ));
}
