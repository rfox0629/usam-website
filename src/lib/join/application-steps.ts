/**
 * USA-167: the shape of the USA Missionaries application at /join.
 *
 * This is the applicant-facing information architecture from the locked spec.
 * It is deliberately free of DOS: no workspace preferences, no circles, no
 * discipleship tracking, no path selection. DOS becomes relevant only after
 * acceptance, as a separate onboarding step, per the approved lifecycle:
 *
 *   application -> review -> acceptance -> USA Missionaries onboarding ->
 *   DOS activation -> Top 100 -> DOS training -> Active Missionary
 *
 * No "use client" and no server-only marker: both the server route and the
 * client component read this, so it has to be importable from either side.
 */

export const joinApplicationStepIds = [
  "start",
  "about",
  "story",
  "calling",
  "experience",
  "mission",
  "support",
  "profile",
  "review",
] as const;

export type JoinApplicationStepId = typeof joinApplicationStepIds[number];

export type JoinApplicationStep = {
  /** Shown in the progress rail. */
  eyebrow: string;
  id: JoinApplicationStepId;
  /** One line under the heading explaining why the step is being asked. */
  intro: string;
  title: string;
};

export const joinApplicationSteps: JoinApplicationStep[] = [
  {
    eyebrow: "Welcome",
    id: "start",
    intro:
      "An application to serve with USA Missionaries. Take your time, answer thoughtfully, and save whenever you need to stop.",
    title: "Start Your Application",
  },
  {
    eyebrow: "Step 1",
    id: "about",
    intro: "Who you are, and who is applying with you.",
    title: "About You",
  },
  {
    eyebrow: "Step 2",
    id: "story",
    intro: "How you came to faith, and how God has shaped you.",
    title: "Your Story",
  },
  {
    eyebrow: "Step 3",
    id: "calling",
    intro: "Why ministry, why USA Missionaries, and who you believe you are called to reach.",
    title: "Your Calling",
  },
  {
    eyebrow: "Step 4",
    id: "experience",
    intro: "Your ministry background, training, and the people who know your work.",
    title: "Ministry Experience",
  },
  {
    eyebrow: "Step 5",
    id: "mission",
    intro: "The ministry you envision under USA Missionaries.",
    title: "Your Mission",
  },
  {
    eyebrow: "Step 6",
    id: "support",
    intro: "What it will take to sustain you, and how ready you are to raise it.",
    title: "Support and Fundraising",
  },
  {
    eyebrow: "Step 7",
    id: "profile",
    intro: "Material we would use to prepare your missionary profile if you are accepted.",
    title: "Build Your Missionary Profile",
  },
  {
    eyebrow: "Final",
    id: "review",
    intro: "Check your answers, then submit.",
    title: "Review and Submit",
  },
];

export function isJoinApplicationStepId(value: unknown): value is JoinApplicationStepId {
  return typeof value === "string" && (joinApplicationStepIds as readonly string[]).includes(value);
}

export function joinApplicationStepIndex(id: JoinApplicationStepId) {
  return joinApplicationSteps.findIndex((step) => step.id === id);
}

/**
 * A couple applies as one household while staying two distinct people. The
 * spouse is never modelled as fields hanging off the applicant, so that both
 * identities survive into Operations.
 */
export type JoinApplicantIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

/**
 * A photo the applicant uploaded. Only the private storage path is kept: the
 * bucket is not public, and nothing here is a URL that could be shared.
 */
export type JoinApplicationPhoto = {
  bucket: string;
  contentType: string;
  fileName: string;
  kind: "family" | "profile";
  path: string;
  size: number;
  uploadedAt: string;
};

/**
 * Acknowledgements the applicant makes on the review step. Kept as their own
 * map rather than free text so Operations can render them as answered or not,
 * and so submission can require them.
 */
export const joinDisclosureIds = [
  "disclosureAccuracy",
  "disclosureBackgroundCheck",
  "disclosureDoctrine",
  "disclosureReviewBeforePublic",
] as const;

export type JoinDisclosureId = typeof joinDisclosureIds[number];

export type JoinApplicationDraft = {
  applicant: JoinApplicantIdentity;
  /** Free-text answers keyed by field id, one bag per step. */
  answers: Record<string, string>;
  applyingAsCouple: boolean;
  disclosures: Record<string, boolean>;
  photos: JoinApplicationPhoto[];
  spouse: JoinApplicantIdentity;
};

export function emptyJoinApplicantIdentity(): JoinApplicantIdentity {
  return { email: "", firstName: "", lastName: "", phone: "" };
}

export function emptyJoinApplicationDraft(): JoinApplicationDraft {
  return {
    answers: {},
    applicant: emptyJoinApplicantIdentity(),
    applyingAsCouple: false,
    disclosures: {},
    photos: [],
    spouse: emptyJoinApplicantIdentity(),
  };
}

export const joinDisclosureLabels: Record<JoinDisclosureId, string> = {
  disclosureAccuracy: "Everything I have written here is true and accurate to the best of my knowledge.",
  disclosureBackgroundCheck:
    "I understand USA Missionaries conducts reference and background checks as part of its review.",
  disclosureDoctrine:
    "I understand USA Missionaries will review beliefs and ministry expectations with me before any acceptance.",
  disclosureReviewBeforePublic:
    "I understand nothing I have written becomes public automatically, and that I would review any missionary profile before it is published.",
};

export function applicantDisplayName(draft: JoinApplicationDraft) {
  const applicant = [draft.applicant.firstName, draft.applicant.lastName].filter(Boolean).join(" ").trim();

  if (!draft.applyingAsCouple) {
    return applicant;
  }

  const spouse = [draft.spouse.firstName, draft.spouse.lastName].filter(Boolean).join(" ").trim();

  return [applicant, spouse].filter(Boolean).join(" and ");
}
