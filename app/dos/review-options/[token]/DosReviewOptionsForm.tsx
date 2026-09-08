"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { dosReviewOptionChoices } from "@/src/lib/dos/review-form-config";
import type { DosReviewLinkState } from "@/src/lib/dos/review-types";
import { DosQuickReviewForm } from "@/app/dos/review/[token]/DosQuickReviewForm";
import { DosTestimonyForm } from "@/app/dos/testimony/[token]/DosTestimonyForm";
import { atmosphere } from "@/app/dos/review/[token]/DosQuickReviewForm";


type ReadyLink = Extract<DosReviewLinkState, { status: "ready" }>;
type SelectedForm = "quick_review" | "testimony_review" | null;

function OptionButton({
  children,
  description,
  onClick,
}: {
  children: ReactNode;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-2xl border border-dos-hairline bg-white p-4 text-left transition-colors hover:border-dos-blue hover:bg-dos-band"
      onClick={onClick}
      type="button"
    >
      <span className="block text-[15px] font-bold text-dos-primary">{children}</span>
      <span className="mt-0.5 block text-[13.5px] leading-[1.45] text-dos-body">{description}</span>
    </button>
  );
}

export function DosReviewOptionsForm({ link }: { link: ReadyLink }) {
  const [selectedForm, setSelectedForm] = useState<SelectedForm>(null);

  if (selectedForm === "quick_review") {
    return <DosQuickReviewForm reviewLink={link} />;
  }

  if (selectedForm === "testimony_review") {
    return <DosTestimonyForm link={link} />;
  }

  return (
    <main className={`min-h-screen px-4 py-3 text-dos-primary ${atmosphere}`}>
      <section className="mx-auto w-full max-w-[420px] rounded-3xl border border-dos-hairline bg-white px-4 py-3.5 shadow-[0_18px_44px_rgba(15,21,32,0.07)]">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-dos-eyebrow">
          Review
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">
          Choose a review
        </h1>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-dos-body">
          Pick the form that best fits what you want to share from this meeting.
        </p>
        <p className="mt-1 text-[12.5px] font-semibold leading-[1.3] text-dos-secondary">{link.workspaceDisplayName}</p>

        <div className="mt-5 grid gap-3">
          {dosReviewOptionChoices.map((choice) => (
            <OptionButton
              description={choice.description}
              key={choice.value}
              onClick={() => setSelectedForm(choice.value)}
            >
              {choice.label}
            </OptionButton>
          ))}
        </div>
      </section>
    </main>
  );
}
