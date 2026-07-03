"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  dosQuickReviewAnswerOptions,
  dosQuickReviewFormDefinition,
  dosQuickReviewOverallRatingOptions,
  dosQuickReviewOutcomeOptions,
} from "@/src/lib/dos/review-form-config";
import type { DosQuickReviewAnswer, DosQuickReviewOverallRating, DosReviewLinkState } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyReviewLink = Extract<DosReviewLinkState, { status: "ready" }>;

type QuickReviewDraft = {
  conversationHelpful: DosQuickReviewAnswer | null;
  feltCaredFor: DosQuickReviewAnswer | null;
  feltHeard: DosQuickReviewAnswer | null;
  overallRating: DosQuickReviewOverallRating | null;
  outcomeTags: string[];
  submittedEmail: string;
  submittedFirstName: string;
  submittedLastName: string;
  stoodOut: string;
  wouldMeetAgain: DosQuickReviewAnswer | null;
};

function splitKnownName(value: string | null) {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildInitialDraft(reviewLink: ReadyReviewLink): QuickReviewDraft {
  const knownName = splitKnownName(reviewLink.reviewerPersonName);

  return {
    conversationHelpful: null,
    feltCaredFor: null,
    feltHeard: null,
    overallRating: null,
    outcomeTags: [],
    submittedEmail: reviewLink.reviewerPersonEmail ?? "",
    submittedFirstName: knownName.firstName,
    submittedLastName: knownName.lastName,
    stoodOut: "",
    wouldMeetAgain: null,
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function SectionCard({ children, helper, title }: { children: ReactNode; helper?: string; title: string }) {
  return (
    <section className="rounded-[20px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_28px_rgba(37,99,235,0.05)]">
      <h2 className="text-[15px] font-bold leading-5 text-[#0F172A]">{title}</h2>
      {helper ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{helper}</p> : null}
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function TextField({
  autoComplete,
  helper,
  label,
  onChange,
  type = "text",
  value,
}: {
  autoComplete?: string;
  helper?: string;
  label: string;
  onChange: (value: string) => void;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        className="mt-1.5 min-h-11 w-full rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {helper ? <span className="mt-1.5 block text-xs leading-5 text-[#64748B]">{helper}</span> : null}
    </label>
  );
}

function SegmentedQuestion({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: DosQuickReviewAnswer) => void;
  value: DosQuickReviewAnswer | null;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">{label}</p>
      <div className="grid grid-cols-3 rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] p-1">
        {dosQuickReviewAnswerOptions.map((option) => {
          const active = value === option.value;

          return (
            <button
              aria-pressed={active}
              className={`min-h-9 rounded-xl px-2 text-xs font-bold transition-colors ${
                active ? "bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]" : "text-[#475569] hover:bg-white"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverallRatingQuestion({
  onChange,
  value,
}: {
  onChange: (value: DosQuickReviewOverallRating) => void;
  value: DosQuickReviewOverallRating | null;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">Overall, how would you describe today's conversation?</p>
      <div className="grid gap-1.5">
        {dosQuickReviewOverallRatingOptions.map((option) => {
          const active = value === option.value;

          return (
            <button
              aria-pressed={active}
              className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-left text-xs font-bold leading-4 transition-colors ${
                active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#93C5FD] bg-white"}`} aria-hidden="true">
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeQuestion({
  onToggle,
  value,
}: {
  onToggle: (value: string) => void;
  value: string[];
}) {
  return (
    <div className="grid gap-1.5">
      {dosQuickReviewOutcomeOptions.map((option) => {
        const active = value.includes(option.value);

        return (
          <button
            aria-pressed={active}
            className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-left text-xs font-bold leading-4 transition-colors ${
              active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
            }`}
            key={option.value}
            onClick={() => onToggle(option.value)}
            type="button"
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#93C5FD] bg-white"}`} aria-hidden="true">
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function DosQuickReviewForm({ reviewLink }: { reviewLink: ReadyReviewLink }) {
  const [draft, setDraft] = useState<QuickReviewDraft>(() => buildInitialDraft(reviewLink));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateDraft(patch: Partial<QuickReviewDraft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  }

  function toggleOutcomeTag(value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      outcomeTags: currentDraft.outcomeTags.includes(value)
        ? currentDraft.outcomeTags.filter((tag) => tag !== value)
        : [...currentDraft.outcomeTags, value],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const submittedName = [draft.submittedFirstName, draft.submittedLastName].map((value) => value.trim()).filter(Boolean).join(" ");
      const response = await fetch(`/api/dos/reviews/${reviewLink.token}`, {
        body: JSON.stringify({
          ...draft,
          submittedName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
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
      <main className="min-h-screen bg-[#F8FBFF] px-4 py-8 text-[#0F172A]">
        <section className="mx-auto max-w-md rounded-[24px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
          <h1 className="text-[34px] font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Thank you.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            Your feedback helps us care for people better. We're grateful you took a few moments to share your experience. If you requested follow-up, someone will reach out soon.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] px-4 py-5 text-[#0F172A]">
      <form className="mx-auto grid max-w-md gap-3" onSubmit={handleSubmit}>
        <header className="rounded-[24px] border border-[#DCEBFF] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(37,99,235,0.08)]">
          <h1 className="text-[36px] font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            {dosQuickReviewFormDefinition.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{dosQuickReviewFormDefinition.description}</p>
        </header>

        <SectionCard title="About You">
          <div className="grid gap-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <TextField autoComplete="given-name" label="First Name" onChange={(value) => updateDraft({ submittedFirstName: value })} value={draft.submittedFirstName} />
              <TextField autoComplete="family-name" label="Last Name" onChange={(value) => updateDraft({ submittedLastName: value })} value={draft.submittedLastName} />
            </div>
            <TextField autoComplete="email" helper="Optional when this link already knows you." label="Email" onChange={(value) => updateDraft({ submittedEmail: value })} type="email" value={draft.submittedEmail} />
          </div>
        </SectionCard>

        <SectionCard helper="How much do you agree?" title="How was your experience today?">
          <SegmentedQuestion label="I felt heard" onChange={(value) => updateDraft({ feltHeard: value })} value={draft.feltHeard} />
          <SegmentedQuestion label="I felt cared for" onChange={(value) => updateDraft({ feltCaredFor: value })} value={draft.feltCaredFor} />
          <SegmentedQuestion label="This conversation was helpful" onChange={(value) => updateDraft({ conversationHelpful: value })} value={draft.conversationHelpful} />
          <SegmentedQuestion label="I would be happy to meet again" onChange={(value) => updateDraft({ wouldMeetAgain: value })} value={draft.wouldMeetAgain} />
        </SectionCard>

        <SectionCard helper="Select all that apply." title="What did you experience today?">
          <OutcomeQuestion onToggle={toggleOutcomeTag} value={draft.outcomeTags} />
        </SectionCard>

        <SectionCard title="Overall">
          <OverallRatingQuestion onChange={(value) => updateDraft({ overallRating: value })} value={draft.overallRating} />
        </SectionCard>

        <SectionCard helper="We'd love to hear what encouraged you, what stood out, or anything we could do better." title="Is there anything you'd like us to know? (Optional)">
          <textarea
            className="min-h-20 w-full resize-none rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
            onChange={(event) => updateDraft({ stoodOut: event.target.value })}
            placeholder="Optional"
            value={draft.stoodOut}
          />
        </SectionCard>

        {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
        <button
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#111111] px-4 text-[15px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </main>
  );
}
