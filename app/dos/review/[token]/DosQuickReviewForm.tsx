"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  dosQuickReviewExperienceOptions,
  dosQuickReviewOverallRatingOptions,
} from "@/src/lib/dos/review-form-config";
import type { DosQuickReviewOverallRating, DosReviewLinkState } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyReviewLink = Extract<DosReviewLinkState, { status: "ready" }>;

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

  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", timeZone: "UTC" }).format(parsed);
}

function meetingTypeLabel(value: string | null) {
  const key = (value ?? "").trim().toLowerCase();

  return meetingTypeLabels[key] ?? "";
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

function ChoiceRow({
  children,
  onClick,
  selected,
  shape = "radio",
}: {
  children: string;
  onClick: () => void;
  selected: boolean;
  shape?: "checkbox" | "radio";
}) {
  return (
    <button
      aria-pressed={selected}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl border px-3 text-left text-[13.5px] font-semibold leading-[1.25] transition-colors ${
        selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-white text-[#334155]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center border ${shape === "radio" ? "rounded-full" : "rounded-[4px]"} ${
          selected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#93C5FD] bg-white"
        }`}
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      {children}
    </button>
  );
}

function QuestionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </p>
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
      <main className="min-h-screen bg-[#F8FBFF] px-4 py-10 text-[#0F172A]">
        <section className="mx-auto max-w-md rounded-[24px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
          <h1 className="text-[34px] font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Thank you.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            {wantsFollowUp
              ? `Thanks for sharing. ${leaderFirstName || "Someone"} will reach out to you soon.`
              : "Thanks for sharing. It helps us care for people better."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] px-4 py-3 text-[#0F172A]">
      {/* One card, one screen. Each question is a labelled block rather than
          its own bordered panel, so the whole thing reads as a single small
          moment instead of a survey with chapters. */}
      <form className="mx-auto grid max-w-md gap-3 rounded-[22px] border border-[#DCEBFF] bg-white px-4 py-3.5 shadow-[0_18px_48px_rgba(37,99,235,0.08)]" onSubmit={handleSubmit}>
        <header>
          <h1 className="text-[24px] font-bold leading-[1.08] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            {leaderFirstName ? `How was your conversation with ${leaderFirstName}?` : "How was your conversation?"}
          </h1>
          <p className="mt-1 text-[12.5px] leading-[1.35] text-[#64748B]">
            {[meetingDate, meetingType].filter(Boolean).join(" · ")}
          </p>
          {/* Identity is already bound to the link. Showing it beats asking
              for it, and "Not you?" is the escape when we got it wrong. */}
          {linkKnowsReviewer && !isEditingIdentity ? (
            <p className="mt-0.5 text-[12.5px] leading-[1.35] text-[#64748B]">
              You&apos;re answering as <span className="font-bold text-[#0F172A]">{recipientName}</span>
              {" · "}
              <button className="font-bold text-[#2563EB]" onClick={() => setIsEditingIdentity(true)} type="button">Not you?</button>
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label="First name"
                className="min-h-10 w-full rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 text-[13.5px] outline-none focus:border-[#2563EB]"
                autoComplete="given-name"
                onChange={(event) => setSubmittedFirstName(event.target.value)}
                placeholder="First name"
                value={submittedFirstName}
              />
              <input
                aria-label="Last name"
                className="min-h-10 w-full rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 text-[13.5px] outline-none focus:border-[#2563EB]"
                autoComplete="family-name"
                onChange={(event) => setSubmittedLastName(event.target.value)}
                placeholder="Last name"
                value={submittedLastName}
              />
            </div>
          )}
        </header>

        <div className="grid gap-1.5">
          <QuestionLabel>How was it?</QuestionLabel>
          {dosQuickReviewOverallRatingOptions.map((option) => (
            <ChoiceRow key={option.value} onClick={() => setOverallRating(option.value)} selected={overallRating === option.value}>
              {option.label}
            </ChoiceRow>
          ))}
        </div>

        <div className="grid gap-1.5">
          <QuestionLabel>Did any of this happen? (optional)</QuestionLabel>
          {dosQuickReviewExperienceOptions.map((option) => (
            <ChoiceRow key={option.value} onClick={() => toggleOutcomeTag(option.value)} selected={outcomeTags.includes(option.value)} shape="checkbox">
              {option.label}
            </ChoiceRow>
          ))}
        </div>

        <div className="grid gap-1.5">
          <QuestionLabel>Anything you&apos;d like us to know? (optional)</QuestionLabel>
          <textarea
            className="min-h-[52px] w-full resize-none rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 py-2.5 text-[13.5px] leading-5 outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]"
            onChange={(event) => setStoodOut(event.target.value)}
            placeholder="Optional"
            value={stoodOut}
          />
        </div>

        {/* An action request, not an experience. It sits apart from the
            questions above because answering it asks someone to do something. */}
        <div className="border-t border-[#EAF2FF] pt-3">
          <ChoiceRow onClick={() => setWantsFollowUp((current) => !current)} selected={wantsFollowUp} shape="checkbox">
            I&apos;d like someone to follow up with me
          </ChoiceRow>
        </div>

        {errorMessage ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{errorMessage}</p> : null}
        <button
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-[#111111] px-4 text-[15px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
