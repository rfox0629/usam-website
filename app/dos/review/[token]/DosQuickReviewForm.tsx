"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { DosReviewFollowUpAnswer, DosReviewLinkState, DosReviewSharePermission, DosReviewStepAnswer } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyReviewLink = Extract<DosReviewLinkState, { status: "ready" }>;

type QuickReviewDraft = {
  encouraged: boolean | null;
  feltHeard: boolean | null;
  sharePermission: DosReviewSharePermission;
  stepTowardJesus: DosReviewStepAnswer | null;
  stoodOut: string;
  submittedName: string;
  wantsFollowUp: DosReviewFollowUpAnswer | null;
};

const initialDraft: QuickReviewDraft = {
  encouraged: null,
  feltHeard: null,
  sharePermission: "private",
  stepTowardJesus: null,
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
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
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
    <div className="rounded-[20px] border border-[#E2DED6] bg-white p-3">
      <p className="text-sm font-semibold leading-5 text-[#1E1D1A]">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <ChoiceButton active={value === true} onClick={() => onChange(true)}>Yes</ChoiceButton>
        <ChoiceButton active={value === false} onClick={() => onChange(false)}>No</ChoiceButton>
      </div>
    </div>
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
        active ? "border-[#D4A63D] bg-[#FFF8E7] text-[#8A5A12]" : "border-[#E2DED6] bg-[#F8F7F3] text-[#1E1D1A]"
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
    <div className="rounded-[20px] border border-[#E2DED6] bg-white p-3">
      <p className="text-sm font-semibold leading-5 text-[#1E1D1A]">{label}</p>
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

export function DosQuickReviewForm({ reviewLink }: { reviewLink: ReadyReviewLink }) {
  const [draft, setDraft] = useState<QuickReviewDraft>(initialDraft);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const meetingMeta = `${meetingContextLabel(reviewLink.meetingType)} · ${formatDate(reviewLink.meetingDate)}`;

  function updateDraft(patch: Partial<QuickReviewDraft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
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
      <main className="min-h-screen bg-[#EDEAE3] px-5 py-10 text-[#1E1D1A]">
        <section className="mx-auto max-w-md rounded-[28px] border border-[#DED9CF] bg-[#F5F3EE] p-5 text-center shadow-[0_24px_70px_rgba(42,37,29,0.10)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
            DOS Review
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
            Thank you for sharing your experience.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77716A]">
            Your review helps encourage and strengthen the mission.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDEAE3] px-4 py-6 text-[#1E1D1A]">
      <form className="mx-auto max-w-md rounded-[30px] border border-[#DED9CF] bg-[#F5F3EE] p-4 shadow-[0_24px_70px_rgba(42,37,29,0.10)]" onSubmit={handleSubmit}>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          Quick Check-In
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          How was the conversation?
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#77716A]">{reviewLink.workspaceDisplayName} · {meetingMeta}</p>

        <div className="mt-5 grid gap-2.5">
          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>Name</FieldLabel>
            <input
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#DDD9D0] bg-[#F8F7F3] px-3 text-sm text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]"
              onChange={(event) => updateDraft({ submittedName: event.target.value })}
              placeholder="Optional"
              value={draft.submittedName}
            />
          </label>

          <BooleanQuestion label="Did this conversation encourage you?" onChange={(value) => updateDraft({ encouraged: value })} value={draft.encouraged} />
          <BooleanQuestion label="Did you feel heard and cared for?" onChange={(value) => updateDraft({ feltHeard: value })} value={draft.feltHeard} />
          <ChoiceGroup
            label="Did this help you take a step toward Jesus?"
            onChange={(value) => updateDraft({ stepTowardJesus: value })}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Unsure", value: "unsure" },
            ]}
            value={draft.stepTowardJesus}
          />
          <ChoiceGroup
            label="Would you like another conversation?"
            onChange={(value) => updateDraft({ wantsFollowUp: value })}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Maybe", value: "maybe" },
            ]}
            value={draft.wantsFollowUp}
          />

          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>What stood out most?</FieldLabel>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#DDD9D0] bg-[#F8F7F3] px-3 py-3 text-sm text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]"
              onChange={(event) => updateDraft({ stoodOut: event.target.value })}
              placeholder="Optional"
              value={draft.stoodOut}
            />
          </label>

          <div className="rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <p className="text-sm font-semibold leading-5 text-[#1E1D1A]">May we share this publicly?</p>
            <div className="mt-2 grid gap-1.5">
              {[
                { label: "Yes, anonymously", value: "anonymous" },
                { label: "Yes, with my name", value: "with_name" },
                { label: "No, keep private", value: "private" },
              ].map((option) => (
                <ChoiceButton
                  active={draft.sharePermission === option.value}
                  key={option.value}
                  onClick={() => updateDraft({ sharePermission: option.value as DosReviewSharePermission })}
                >
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
          </div>
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
