"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  dosReviewOutcomeOptions,
  dosReviewSharePermissionOptions,
  dosTestimonyReviewFormDefinition,
} from "@/src/lib/dos/review-form-config";
import type { DosReviewLinkState, DosReviewSharePermission } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyLink = Extract<DosReviewLinkState, { status: "ready" }>;

type TestimonyDraft = {
  nextStep: string;
  outcomeTags: string[];
  publicDisplayName: string;
  sharePermission: DosReviewSharePermission;
  story: string;
  submittedEmail: string;
  submittedName: string;
  whatChanged: string;
};

const initialDraft: TestimonyDraft = {
  nextStep: "",
  outcomeTags: [],
  publicDisplayName: "",
  sharePermission: "private",
  story: "",
  submittedEmail: "",
  submittedName: "",
  whatChanged: "",
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function fieldClass() {
  return "mt-2 min-h-12 w-full rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] px-4 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-10 rounded-2xl border px-3 text-left text-xs font-bold transition-colors ${
        active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function DosTestimonyForm({ link }: { link: ReadyLink }) {
  const [draft, setDraft] = useState<TestimonyDraft>(initialDraft);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          submittedEmail: draft.submittedEmail,
          submittedName: draft.submittedName,
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
      <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
        <section className="mx-auto max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            DOS Testimony
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Thank you for sharing.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">Your story has been received for review.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] px-4 py-6 text-[#0F172A]">
      <form className="mx-auto max-w-md rounded-[30px] border border-[#DCEBFF] bg-white p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)]" onSubmit={handleSubmit}>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Testimony
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {dosTestimonyReviewFormDefinition.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">{dosTestimonyReviewFormDefinition.description}</p>
        <p className="mt-2 rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{link.workspaceDisplayName}</p>

        <div className="mt-5 grid gap-3">
          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>Your name</FieldLabel>
            <input className={fieldClass()} onChange={(event) => updateDraft({ submittedName: event.target.value })} value={draft.submittedName} />
          </label>
          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>Email address</FieldLabel>
            <input className={fieldClass()} onChange={(event) => updateDraft({ submittedEmail: event.target.value })} type="email" value={draft.submittedEmail} />
          </label>
          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>What happened?</FieldLabel>
            <textarea className={`${fieldClass()} min-h-32 py-3`} onChange={(event) => updateDraft({ story: event.target.value })} placeholder="Share what happened in your own words." required value={draft.story} />
          </label>
          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>What changed?</FieldLabel>
            <textarea className={`${fieldClass()} min-h-24 py-3`} onChange={(event) => updateDraft({ whatChanged: event.target.value })} placeholder="What feels different now?" value={draft.whatChanged} />
          </label>
          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>Did you take a next step?</FieldLabel>
            <input className={fieldClass()} onChange={(event) => updateDraft({ nextStep: event.target.value })} placeholder="Optional" value={draft.nextStep} />
          </label>
          <section className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <p className="text-sm font-semibold leading-5 text-[#0F172A]">What fruit did you notice?</p>
            <div className="mt-2 grid gap-1.5">
              {dosReviewOutcomeOptions.map((option) => {
                const active = draft.outcomeTags.includes(option.value);

                return (
                  <button
                    aria-pressed={active}
                    className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-left text-xs font-bold transition-colors ${
                      active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
                    }`}
                    key={option.value}
                    onClick={() => toggleOutcomeTag(option.value)}
                    type="button"
                  >
                    <span className={`h-3.5 w-3.5 shrink-0 rounded-[4px] border ${active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#93C5FD] bg-white"}`} aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <p className="text-sm font-semibold leading-5 text-[#0F172A]">May we share this testimony?</p>
            <div className="mt-2 grid gap-1.5">
              {dosReviewSharePermissionOptions.map((option) => (
                <ChoiceButton
                  active={draft.sharePermission === option.value}
                  key={option.value}
                  onClick={() => updateDraft({ sharePermission: option.value })}
                >
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
          </section>
          {draft.sharePermission === "with_name" ? (
            <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
              <FieldLabel>Public Display Name</FieldLabel>
              <input className={fieldClass()} onChange={(event) => updateDraft({ publicDisplayName: event.target.value })} placeholder="First name, initials, or anonymous" value={draft.publicDisplayName} />
            </label>
          ) : null}
        </div>

        {errorMessage ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
        <button className="mt-5 min-h-12 w-full rounded-full bg-[#111111] px-4 text-sm font-bold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Share Story"}
        </button>
      </form>
    </main>
  );
}
