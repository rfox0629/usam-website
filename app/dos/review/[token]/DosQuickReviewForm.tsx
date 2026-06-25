"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  dosQuickReviewFormDefinition,
  dosQuickReviewHelpedOptions,
  dosQuickReviewMeetAgainOptions,
  dosReviewOutcomeOptions,
  dosReviewSharePermissionOptions,
} from "@/src/lib/dos/review-form-config";
import type { DosReviewFollowUpAnswer, DosReviewLinkState, DosReviewSharePermission, DosReviewStepAnswer } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyReviewLink = Extract<DosReviewLinkState, { status: "ready" }>;

type QuickReviewDraft = {
  encouraged: boolean | null;
  feltCaredFor: boolean | null;
  feltHeard: boolean | null;
  outcomeTags: string[];
  sharePermission: DosReviewSharePermission;
  stepTowardJesus: DosReviewStepAnswer | null;
  submittedEmail: string;
  stoodOut: string;
  submittedName: string;
  wantsFollowUp: DosReviewFollowUpAnswer | null;
};

const initialDraft: QuickReviewDraft = {
  encouraged: null,
  feltCaredFor: null,
  feltHeard: null,
  outcomeTags: [],
  sharePermission: "private",
  stepTowardJesus: null,
  submittedEmail: "",
  stoodOut: "",
  submittedName: "",
  wantsFollowUp: null,
};

function meetingContextLabel(value: string | null) {
  return {
    coffee: "Coffee",
    discipleship: "Discipleship",
    group: "Group",
    kitchen_table: "Kitchen Table",
    other: "Meeting",
    phone: "Phone",
    prayer: "Prayer",
    text: "Text",
    zoom: "Zoom",
  }[value ?? ""] ?? "Meeting";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Recent conversation";
  }

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Recent conversation";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function BooleanQuestion({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean | null;
}) {
  return (
    <div className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <ChoiceButton active={value === true} onClick={() => onChange(true)}>Yes</ChoiceButton>
        <ChoiceButton active={value === false} onClick={() => onChange(false)}>No</ChoiceButton>
      </div>
    </div>
  );
}

function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
      <FieldLabel>{label}</FieldLabel>
      <input
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
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
      className={`min-h-9 rounded-full border px-3 text-xs font-bold transition-colors ${
        active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ChoiceGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T | null;
}) {
  return (
    <div className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">{label}</p>
      <div className={`mt-2 grid gap-1.5 ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((option) => (
          <ChoiceButton active={value === option.value} key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </ChoiceButton>
        ))}
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
    <div className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">What fruit did you notice?</p>
      <div className="mt-2 grid gap-1.5">
        {dosReviewOutcomeOptions.map((option) => {
          const active = value.includes(option.value);

          return (
            <button
              aria-pressed={active}
              className={`flex min-h-10 items-center gap-2 rounded-2xl border px-3 text-left text-xs font-bold transition-colors ${
                active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#DCEBFF] bg-[#F8FBFF] text-[#475569]"
              }`}
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              <span className={`h-3.5 w-3.5 shrink-0 rounded-[4px] border ${active ? "border-[#2563EB] bg-[#2563EB]" : "border-[#93C5FD] bg-white"}`} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DosQuickReviewForm({ reviewLink }: { reviewLink: ReadyReviewLink }) {
  const [draft, setDraft] = useState<QuickReviewDraft>(initialDraft);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const meetingMeta = `${meetingContextLabel(reviewLink.meetingType)} · ${formatDate(reviewLink.meetingDate)}`;

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
      const response = await fetch(`/api/dos/reviews/${reviewLink.token}`, {
        body: JSON.stringify(draft),
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
      <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
        <section className="mx-auto max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            DOS Review
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Thank you for sharing your experience.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            Your review helps encourage and strengthen the mission.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] px-4 py-6 text-[#0F172A]">
      <form className="mx-auto max-w-md rounded-[30px] border border-[#DCEBFF] bg-white p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)]" onSubmit={handleSubmit}>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>DOS Review</p>
        <h1 className="mt-2 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {dosQuickReviewFormDefinition.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">{dosQuickReviewFormDefinition.description}</p>
        <p className="mt-2 rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{reviewLink.workspaceDisplayName} · {meetingMeta}</p>

        <div className="mt-5 grid gap-2.5">
          <TextField label="Your name" onChange={(value) => updateDraft({ submittedName: value })} value={draft.submittedName} />
          <TextField label="Email address" onChange={(value) => updateDraft({ submittedEmail: value })} type="email" value={draft.submittedEmail} />
          <BooleanQuestion label="I felt heard" onChange={(value) => updateDraft({ feltHeard: value })} value={draft.feltHeard} />
          <BooleanQuestion label="I felt cared for" onChange={(value) => updateDraft({ feltCaredFor: value })} value={draft.feltCaredFor} />
          <ChoiceGroup
            label="This conversation helped me"
            onChange={(value) => updateDraft({ encouraged: value === "yes" ? true : value === "no" ? false : null, stepTowardJesus: value })}
            options={dosQuickReviewHelpedOptions}
            value={draft.stepTowardJesus}
          />
          <ChoiceGroup
            label="I would meet again"
            onChange={(value) => updateDraft({ wantsFollowUp: value })}
            options={dosQuickReviewMeetAgainOptions}
            value={draft.wantsFollowUp}
          />
          <OutcomeQuestion onToggle={toggleOutcomeTag} value={draft.outcomeTags} />

          <label className="block rounded-[20px] border border-[#DCEBFF] bg-white p-3">
            <FieldLabel>Optional Note</FieldLabel>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#BFDBFE] bg-[#F8FBFF] px-3 py-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
              onChange={(event) => updateDraft({ stoodOut: event.target.value })}
              placeholder="Anything you want us to know?"
              value={draft.stoodOut}
            />
          </label>
          <ChoiceGroup
            label="May we share this testimony?"
            onChange={(value) => updateDraft({ sharePermission: value })}
            options={dosReviewSharePermissionOptions}
            value={draft.sharePermission}
          />

          <p className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#475569]">
            Reviews are used internally unless our team approves them for public sharing.
          </p>
        </div>

        {errorMessage ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
        <button
          className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-[#111111] px-4 text-[15px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send Review"}
        </button>
      </form>
    </main>
  );
}
