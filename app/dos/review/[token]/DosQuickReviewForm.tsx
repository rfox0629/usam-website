"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  dosQuickReviewExperienceOptions,
  dosQuickReviewOverallRatingOptions,
} from "@/src/lib/dos/review-form-config";
import type { DosQuickReviewOverallRating, DosReviewLinkState } from "@/src/lib/dos/review-types";

type ReadyReviewLink = Extract<DosReviewLinkState, { status: "ready" }>;

/* The same atmosphere the Person page sits on, so the page someone opens from
   a text message is recognisably the same product the leader is using. */
const atmosphere = "bg-[#F8FBFF] bg-[radial-gradient(circle_at_78%_6%,rgba(219,234,254,0.95),transparent_36%),radial-gradient(circle_at_50%_58%,rgba(221,214,254,0.4),transparent_44%),linear-gradient(140deg,#FAFCFF_0%,#F5F8FF_52%,#EEF3FF_100%)]";

const meetingTypeLabels: Record<string, string> = {
  call: "Phone call",
  coffee: "Coffee",
  kitchen_table: "Kitchen table",
  meal: "Meal",
  ministry_event: "Ministry event",
  outreach: "Outreach",
  phone: "Phone call",
  video: "Video call",
  zoom: "Video call",
};

function firstNameOf(value: string | null) {
  return (value ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

function formatMeetingDate(value: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(parsed);
}

function meetingTypeLabel(value: string | null) {
  return meetingTypeLabels[(value ?? "").trim().toLowerCase()] ?? "";
}

function splitKnownName(value: string | null) {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function QuestionLabel({ children }: { children: string }) {
  return <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-dos-eyebrow">{children}</p>;
}

/* The rating is the one required answer, so it gets the most deliberate
   control on the page: full-width rows that fill with DOS blue, rather than a
   column of outlined boxes each carrying a radio dot. */
function RatingRow({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`flex min-h-[38px] w-full items-center rounded-xl px-3.5 text-left text-[14.5px] leading-[1.2] transition-colors ${
        selected
          ? "bg-dos-blue font-bold text-white shadow-[0_6px_16px_rgba(36,80,200,0.24)]"
          : "bg-dos-band font-semibold text-dos-body hover:bg-[#EAF1FF]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

/* Optional signals read as chips: smaller, wrapping, obviously secondary to
   the rating above them. */
function ExperienceChip({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold leading-[1.2] transition-colors ${
        selected
          ? "border-dos-blue bg-[#EBF2FF] text-dos-blue"
          : "border-dos-hairline bg-white text-dos-body hover:border-[#C9D8F5]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function DosQuickReviewForm({ reviewLink }: { reviewLink: ReadyReviewLink }) {
  const knownName = splitKnownName(reviewLink.reviewerPersonName);
  const [overallRating, setOverallRating] = useState<DosQuickReviewOverallRating | null>(null);
  const [outcomeTags, setOutcomeTags] = useState<string[]>([]);
  const [stoodOut, setStoodOut] = useState("");
  const [wantsFollowUp, setWantsFollowUp] = useState(false);
  const [submittedFirstName, setSubmittedFirstName] = useState(knownName.firstName);
  const [submittedLastName, setSubmittedLastName] = useState(knownName.lastName);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // The link identifies the recipient when the request was sent to a known
  // Person; only then can we skip asking who they are.
  const linkKnowsReviewer = Boolean(reviewLink.reviewerPersonName?.trim());
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);

  const leaderFirstName = firstNameOf(reviewLink.leaderName);
  const meetingDate = formatMeetingDate(reviewLink.meetingDate);
  const meetingType = meetingTypeLabel(reviewLink.meetingType);
  const recipientName = [submittedFirstName, submittedLastName].filter(Boolean).join(" ");

  function toggleOutcomeTag(value: string) {
    setOutcomeTags((current) => (
      current.includes(value) ? current.filter((tag) => tag !== value) : [...current, value]
    ));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!overallRating) {
      setErrorMessage("Choose how the conversation was.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      /* The five-point answer and the old agree/disagree "this conversation
         was helpful" are the same question at different resolutions, so the
         coarser one is derived rather than asked twice. Nothing else is
         inferred: what is not asked is sent as null. */
      const conversationHelpful = overallRating === "not_very_helpful"
        ? "no"
        : overallRating === "somewhat_helpful"
          ? "somewhat"
          : "yes";
      const response = await fetch(`/api/dos/reviews/${reviewLink.token}`, {
        body: JSON.stringify({
          conversationHelpful,
          outcomeTags,
          overallRating,
          stoodOut,
          submittedFirstName,
          submittedLastName,
          submittedName: [submittedFirstName, submittedLastName].map((value) => value.trim()).filter(Boolean).join(" "),
          /* The explicit request, and the only thing that may set it. */
          wantsFollowUp: wantsFollowUp ? "yes" : null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to send review.");
      }

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className={`flex min-h-screen items-center justify-center px-4 py-10 text-dos-primary ${atmosphere}`}>
        <section className="w-full max-w-[420px] rounded-3xl border border-dos-hairline bg-white px-5 py-7 text-center shadow-[0_18px_44px_rgba(15,21,32,0.07)]">
          <h1 className="text-[27px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">Thank you.</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-dos-body">
            {wantsFollowUp
              ? `${leaderFirstName || "Someone"} will reach out to you soon.`
              : "It helps us care for people better."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-3 text-dos-primary ${atmosphere}`}>
      {/* One surface, grouped by thin rules rather than a stack of bordered
          cards. The old form read as a generic web questionnaire because every
          question sat inside its own outlined box. */}
      <form className="mx-auto w-full max-w-[420px] rounded-3xl border border-dos-hairline bg-white px-4 py-3.5 shadow-[0_18px_44px_rgba(15,21,32,0.07)]" onSubmit={handleSubmit}>
        <header>
          <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">
            {leaderFirstName ? `How was your conversation with ${leaderFirstName}?` : "How was your conversation?"}
          </h1>
          <p className="mt-1 text-[12.5px] font-semibold leading-[1.3] text-dos-secondary">
            {[meetingDate, meetingType].filter(Boolean).join(" · ")}
          </p>
          {/* Identity is already bound to the link. Showing it beats asking
              for it, and "Not you?" is the escape when we got it wrong. */}
          {linkKnowsReviewer && !isEditingIdentity ? (
            <p className="mt-0.5 text-[12.5px] leading-[1.3] text-dos-secondary">
              You&apos;re answering as <span className="font-bold text-dos-primary">{recipientName}</span>
              {" · "}
              <button className="font-bold text-dos-blue" onClick={() => setIsEditingIdentity(true)} type="button">Not you?</button>
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label="First name"
                className="min-h-10 w-full rounded-xl border border-dos-hairline bg-dos-band px-3 text-[13.5px] text-dos-primary outline-none transition-colors placeholder:text-dos-eyebrow focus:border-dos-blue"
                autoComplete="given-name"
                onChange={(event) => setSubmittedFirstName(event.target.value)}
                placeholder="First name"
                value={submittedFirstName}
              />
              <input
                aria-label="Last name"
                className="min-h-10 w-full rounded-xl border border-dos-hairline bg-dos-band px-3 text-[13.5px] text-dos-primary outline-none transition-colors placeholder:text-dos-eyebrow focus:border-dos-blue"
                autoComplete="family-name"
                onChange={(event) => setSubmittedLastName(event.target.value)}
                placeholder="Last name"
                value={submittedLastName}
              />
            </div>
          )}
        </header>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>How was it?</QuestionLabel>
          <div className="mt-1.5 grid gap-1">
            {dosQuickReviewOverallRatingOptions.map((option) => (
              <RatingRow
                key={option.value}
                label={option.label}
                onClick={() => setOverallRating(option.value)}
                selected={overallRating === option.value}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>Did any of this happen? (optional)</QuestionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {dosQuickReviewExperienceOptions.map((option) => (
              <ExperienceChip
                key={option.value}
                label={option.label}
                onClick={() => toggleOutcomeTag(option.value)}
                selected={outcomeTags.includes(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>Anything you&apos;d like us to know? (optional)</QuestionLabel>
          <textarea
            className="mt-1.5 min-h-[46px] w-full resize-none rounded-xl border border-dos-hairline bg-dos-band px-3 py-2.5 text-[14px] leading-[1.45] text-dos-primary outline-none transition-colors placeholder:text-dos-eyebrow focus:border-dos-blue"
            onChange={(event) => setStoodOut(event.target.value)}
            placeholder="Optional"
            value={stoodOut}
          />
        </div>

        {/* An action request, not an experience. It asks someone to do
            something, so it reads as a decision rather than another chip. */}
        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <button
            aria-pressed={wantsFollowUp}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-1 text-left text-[14px] font-semibold leading-[1.25] text-dos-primary"
            onClick={() => setWantsFollowUp((current) => !current)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                wantsFollowUp ? "border-dos-blue bg-dos-blue" : "border-[#C9D8F5] bg-white"
              }`}
            >
              {wantsFollowUp ? <span className="h-[7px] w-[7px] rounded-[2px] bg-white" /> : null}
            </span>
            I&apos;d like someone to follow up with me
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-[13px] font-semibold text-[#B42318]">{errorMessage}</p>
        ) : null}
        <button
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-dos-blue px-4 text-[15px] font-bold text-white transition-colors hover:bg-[#1E43AC] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
