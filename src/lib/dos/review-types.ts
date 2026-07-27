export const dosQuickReviewType = "quick_review" as const;
export const legacyDosReviewType = "review" as const;
export const legacyDosQuickReviewType = "quick_check_in" as const;
export const dosTestimonyReviewType = "testimony_review" as const;
export const legacyDosTestimonyReviewType = "testimony" as const;
export const dosReviewOptionsType = "review_options" as const;
export const dosExperienceReviewTypes = [dosQuickReviewType, legacyDosReviewType, legacyDosQuickReviewType] as const;
export const dosTestimonyReviewTypes = [dosTestimonyReviewType, legacyDosTestimonyReviewType] as const;
export const dosReviewRequestTypes = [
  dosQuickReviewType,
  legacyDosReviewType,
  legacyDosQuickReviewType,
  dosTestimonyReviewType,
  legacyDosTestimonyReviewType,
  dosReviewOptionsType,
] as const;
export const dosReviewSharePermissions = ["anonymous", "with_name", "private"] as const;
export const dosReviewStepAnswers = ["yes", "no", "unsure"] as const;
export const dosReviewFollowUpAnswers = ["yes", "no", "maybe"] as const;
export const dosQuickReviewAnswers = ["yes", "somewhat", "no"] as const;
export const dosQuickReviewOverallRatings = ["life_changing", "very_meaningful", "helpful", "somewhat_helpful", "not_very_helpful"] as const;

export type DosReviewRequestType = typeof dosReviewRequestTypes[number];
export type DosReviewSharePermission = typeof dosReviewSharePermissions[number];
export type DosReviewStepAnswer = typeof dosReviewStepAnswers[number];
export type DosReviewFollowUpAnswer = typeof dosReviewFollowUpAnswers[number];
export type DosQuickReviewAnswer = typeof dosQuickReviewAnswers[number];
export type DosQuickReviewOverallRating = typeof dosQuickReviewOverallRatings[number];

export type DosReviewLinkState =
  | {
      meetingDate: string | null;
      meetingId: string;
      meetingType: string | null;
      recipientPersonId: string | null;
      reviewerPersonId: string | null;
      reviewerPersonName: string | null;
      reviewRequestId: string;
      reviewType: DosReviewRequestType;
      reviewerPersonEmail: string | null;
      status: "ready";
      token: string;
      workspaceDisplayName: string;
      workspaceId: string;
    }
  | {
      status: "already_submitted" | "expired" | "invalid" | "not_configured";
    };

export type DosQuickReviewSubmission = {
  conversationHelpful?: DosQuickReviewAnswer | null;
  encouraged?: boolean | null;
  feltCaredFor?: DosQuickReviewAnswer | null;
  feltHeard?: DosQuickReviewAnswer | null;
  overallRating?: DosQuickReviewOverallRating | null;
  outcomeTags?: string[];
  sharePermission?: DosReviewSharePermission;
  stepTowardJesus?: DosReviewStepAnswer | null;
  submittedEmail?: string | null;
  submittedFirstName?: string | null;
  submittedLastName?: string | null;
  stoodOut?: string | null;
  submittedName?: string | null;
  wouldMeetAgain?: DosQuickReviewAnswer | null;
  wantsFollowUp?: DosReviewFollowUpAnswer | null;
};
