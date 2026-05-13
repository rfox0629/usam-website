export const dosQuickReviewType = "quick_check_in" as const;
export const dosReviewSharePermissions = ["anonymous", "with_name", "private"] as const;
export const dosReviewStepAnswers = ["yes", "no", "unsure"] as const;
export const dosReviewFollowUpAnswers = ["yes", "no", "maybe"] as const;

export type DosReviewSharePermission = typeof dosReviewSharePermissions[number];
export type DosReviewStepAnswer = typeof dosReviewStepAnswers[number];
export type DosReviewFollowUpAnswer = typeof dosReviewFollowUpAnswers[number];

export type DosReviewLinkState =
  | {
      meetingDate: string | null;
      meetingType: string | null;
      reviewerPersonId: string | null;
      reviewerPersonName: string | null;
      status: "ready";
      token: string;
      workspaceDisplayName: string;
      workspaceId: string;
    }
  | {
      status: "already_submitted" | "expired" | "invalid" | "not_configured";
    };

export type DosQuickReviewSubmission = {
  encouraged?: boolean | null;
  feltHeard?: boolean | null;
  sharePermission: DosReviewSharePermission;
  stepTowardJesus?: DosReviewStepAnswer | null;
  stoodOut?: string | null;
  submittedName?: string | null;
  wantsFollowUp?: DosReviewFollowUpAnswer | null;
};
