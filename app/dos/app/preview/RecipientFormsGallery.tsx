import type { DosReviewLinkState } from "@/src/lib/dos/review-types";
import { DosQuickReviewForm } from "@/app/dos/review/[token]/DosQuickReviewForm";
import { DosReviewOptionsForm } from "@/app/dos/review-options/[token]/DosReviewOptionsForm";
import { DosSharedAssessmentForm } from "@/app/dos/resource/[token]/DosSharedAssessmentForm";
import { DosTestimonyForm } from "@/app/dos/testimony/[token]/DosTestimonyForm";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";

/* USA-243: the recipient-facing forms in isolation, behind the demo token,
   with a synthetic bound link, so they can be reviewed and screenshotted
   without a real secure link (which would expose a real recipient and mark the
   link opened). Submitting here reaches the real API with a fake token and is
   refused; nothing is written. */
export type RecipientFormPreviewKey =
  | "marriage-assessment"
  | "marriage-assessment-wife-first"
  | "quick-review"
  | "review-options"
  | "testimony"
  | "testimony-unbound";

function demoLink(reviewType: "quick_review" | "review_options" | "testimony_review", bound: boolean): Extract<DosReviewLinkState, { status: "ready" }> {
  return {
    leaderName: "Ryan Fox",
    meetingDate: "2026-09-02",
    meetingId: "demo-meeting-naomi-recent",
    meetingType: "coffee",
    recipientPersonId: bound ? "demo-person-george-jenko" : null,
    reviewRequestId: "demo-review-link",
    reviewType,
    reviewerPersonEmail: null,
    reviewerPersonId: bound ? "demo-person-george-jenko" : null,
    reviewerPersonName: bound ? "George Jenko" : null,
    status: "ready",
    token: "demo-preview-token",
    workspaceDisplayName: "Fox Family",
    workspaceId: "demo-workspace",
  };
}

/* USA-279: the assessment a couple was sent, with a fake token. The two
   variants differ only in who was sent the link, which is the whole point:
   the wife-first link must show her as Wife, not as the first participant. */
function demoAssessmentLink(primaryRole: "Husband" | "Wife") {
  const resource = getDosResourceBySlug("marriage-assessment");
  const assessment = resource?.content?.assessment;

  if (!resource || !assessment) {
    throw new Error("The Marriage Assessment is missing from the resource catalog.");
  }

  const secondaryRole = primaryRole === "Husband" ? "Wife" : "Husband";
  const names = { Husband: "Ryan Fox", Wife: "Brooke Fox" } as const;

  return {
    assessment: {
      maxScore: assessment.maxScore,
      participants: [primaryRole, secondaryRole] as readonly string[],
      questions: assessment.questions,
    },
    description: resource.description,
    participants: [
      { name: names[primaryRole], role: primaryRole },
      { name: names[secondaryRole], role: secondaryRole },
    ],
    requestedByName: "Dirk Nowitzki",
    responses: {},
    title: resource.title,
    token: "demo-preview-token",
    typeLabel: "Assessment",
  };
}

export function RecipientFormsGallery({ form }: { form: RecipientFormPreviewKey }) {
  if (form === "marriage-assessment" || form === "marriage-assessment-wife-first") {
    return <DosSharedAssessmentForm shareLink={demoAssessmentLink(form === "marriage-assessment" ? "Husband" : "Wife")} />;
  }

  if (form === "quick-review") {
    return <DosQuickReviewForm reviewLink={demoLink("quick_review", true)} />;
  }

  if (form === "review-options") {
    return <DosReviewOptionsForm link={demoLink("review_options", true)} />;
  }

  return <DosTestimonyForm link={demoLink("testimony_review", form !== "testimony-unbound")} />;
}
