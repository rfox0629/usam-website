"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { dosReviewSharePermissionOptions } from "@/src/lib/dos/review-form-config";
import { dosReviewOutcomeOptions, dosTestimonyReviewFormDefinition } from "@/src/lib/dos/testimony-form-config";
import type { DosReviewLinkState, DosReviewSharePermission } from "@/src/lib/dos/review-types";
import { ExperienceChip, QuestionLabel, RatingRow, atmosphere, firstNameOf, formatMeetingDate, meetingTypeLabel } from "@/app/dos/review/[token]/DosQuickReviewForm";

type ReadyLink = Extract<DosReviewLinkState, { status: "ready" }>;

type TestimonyDraft = {
  nextStep: string;
  outcomeTags: string[];
  publicDisplayName: string;
  sharePermission: DosReviewSharePermission;
  story: string;
  whatChanged: string;
};

const initialDraft: TestimonyDraft = {
  nextStep: "",
  outcomeTags: [],
  publicDisplayName: "",
  sharePermission: "private",
  story: "",
  whatChanged: "",
};

const fieldClass = "mt-1.5 w-full rounded-xl border border-dos-hairline bg-white px-3 py-2.5 text-[14px] leading-[1.45] text-dos-primary outline-none transition-colors placeholder:text-dos-secondary focus:border-dos-blue";

/* The secure link already binds this story to the right person and meeting
   (USA-243 §4), so the form never asks for a name or an email. The one time
   it asks who is writing is when the link carries no recipient at all -- the
   same fallback Quick Review uses -- and even then the server ignores the
   typed name for identity. */
export function DosTestimonyForm({ link }: { link: ReadyLink }) {
  const [draft, setDraft] = useState<TestimonyDraft>(initialDraft);
  const [fallbackName, setFallbackName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const linkKnowsRecipient = Boolean(link.reviewerPersonName?.trim());
  const leaderFirstName = firstNameOf(link.leaderName);
  const meetingDate = formatMeetingDate(link.meetingDate);
  const meetingType = meetingTypeLabel(link.meetingType);
  const submittedName = linkKnowsRecipient ? String(link.reviewerPersonName).trim() : fallbackName.trim();

  function updateDraft(patch: Partial<TestimonyDraft>) {
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

    if (!draft.story.trim()) {
      setErrorMessage("Share what happened before sending.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/dos/testimonies/${link.token}`, {
        body: JSON.stringify({
          decisionMade: draft.nextStep,
          nextStep: draft.nextStep,
          outcomeTags: draft.outcomeTags,
          publicDisplayName: draft.publicDisplayName,
          sharePermission: draft.sharePermission,
          story: draft.story,
          submittedName,
          whatChanged: draft.whatChanged,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to send story.");
      }

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send story.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className={`flex min-h-screen items-center justify-center px-4 py-10 text-dos-primary ${atmosphere}`}>
        <section className="w-full max-w-[420px] rounded-3xl border border-dos-hairline bg-white px-5 py-7 text-center shadow-[0_18px_44px_rgba(15,21,32,0.07)]">
          <h1 className="text-[27px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">Thank you for sharing.</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-dos-body">Your story has been received and will be read before anything is shared.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-3 text-dos-primary ${atmosphere}`}>
      <form className="mx-auto w-full max-w-[420px] rounded-3xl border border-dos-hairline bg-white px-4 py-3.5 shadow-[0_18px_44px_rgba(15,21,32,0.07)]" onSubmit={handleSubmit}>
        <header>
          <h1 className="text-[22px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">
            {leaderFirstName ? `Share your story with ${leaderFirstName}` : dosTestimonyReviewFormDefinition.title}
          </h1>
          <p className="mt-1 text-[12.5px] font-semibold leading-[1.3] text-dos-secondary">
            {[meetingDate, meetingType].filter(Boolean).join(" · ") || link.workspaceDisplayName}
          </p>
          {linkKnowsRecipient ? (
            <p className="mt-0.5 text-[12.5px] leading-[1.3] text-dos-secondary">
              You&apos;re sharing as <span className="font-bold text-dos-primary">{link.reviewerPersonName}</span>
            </p>
          ) : (
            <input
              aria-label="Your name"
              autoComplete="name"
              className={`${fieldClass} mt-2`}
              onChange={(event) => setFallbackName(event.target.value)}
              placeholder="Your name"
              value={fallbackName}
            />
          )}
        </header>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>What happened?</QuestionLabel>
          <textarea className={`${fieldClass} min-h-[110px] resize-none`} onChange={(event) => updateDraft({ story: event.target.value })} placeholder="Share what happened in your own words." required value={draft.story} />
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>What changed? (optional)</QuestionLabel>
          <textarea className={`${fieldClass} min-h-[72px] resize-none`} onChange={(event) => updateDraft({ whatChanged: event.target.value })} placeholder="What feels different now?" value={draft.whatChanged} />
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>Did you take a next step? (optional)</QuestionLabel>
          <input className={fieldClass} onChange={(event) => updateDraft({ nextStep: event.target.value })} placeholder="Optional" value={draft.nextStep} />
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>What fruit did you notice? (optional)</QuestionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {dosReviewOutcomeOptions.map((option) => (
              <ExperienceChip
                key={option.value}
                label={option.label}
                onClick={() => toggleOutcomeTag(option.value)}
                selected={draft.outcomeTags.includes(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-dos-rule pt-2.5">
          <QuestionLabel>May we share this testimony?</QuestionLabel>
          <div className="mt-1.5 grid gap-1">
            {dosReviewSharePermissionOptions.map((option) => (
              <RatingRow
                key={option.value}
                label={option.label}
                onClick={() => updateDraft({ sharePermission: option.value })}
                selected={draft.sharePermission === option.value}
              />
            ))}
          </div>
          {draft.sharePermission === "with_name" ? (
            <input
              aria-label="Name to show with your story"
              className={`${fieldClass} mt-2`}
              onChange={(event) => updateDraft({ publicDisplayName: event.target.value })}
              placeholder={submittedName ? `Show as: ${submittedName}` : "First name or initials"}
              value={draft.publicDisplayName}
            />
          ) : null}
          <p className="mt-2 text-[12.5px] leading-[1.4] text-dos-secondary">Stories are read before anything is shared publicly.</p>
        </div>

        {errorMessage ? <p className="mt-3 text-[13px] font-semibold text-[#B42318]" role="alert">{errorMessage}</p> : null}
        <button className="mt-4 min-h-11 w-full rounded-full bg-dos-blue text-[15px] font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Share story"}
        </button>
      </form>
    </main>
  );
}
