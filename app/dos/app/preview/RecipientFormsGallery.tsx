import type { DosReviewLinkState } from "@/src/lib/dos/review-types";
import { DosQuickReviewForm } from "@/app/dos/review/[token]/DosQuickReviewForm";
import { DosReviewOptionsForm } from "@/app/dos/review-options/[token]/DosReviewOptionsForm";
import { DosTestimonyForm } from "@/app/dos/testimony/[token]/DosTestimonyForm";

/* USA-243: the recipient-facing forms in isolation, behind the demo token,
   with a synthetic bound link, so they can be reviewed and screenshotted
   without a real secure link (which would expose a real recipient and mark the
   link opened). Submitting here reaches the real API with a fake token and is
   refused; nothing is written. */
export type RecipientFormPreviewKey = "quick-review" | "review-options" | "testimony" | "testimony-unbound";

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

export function RecipientFormsGallery({ form }: { form: RecipientFormPreviewKey }) {
  if (form === "quick-review") {
    return <DosQuickReviewForm reviewLink={demoLink("quick_review", true)} />;
  }

  if (form === "review-options") {
    return <DosReviewOptionsForm link={demoLink("review_options", true)} />;
  }

  return <DosTestimonyForm link={demoLink("testimony_review", form !== "testimony-unbound")} />;
}
