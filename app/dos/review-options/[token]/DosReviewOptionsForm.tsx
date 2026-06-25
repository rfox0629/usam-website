"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { dosReviewOptionChoices } from "@/src/lib/dos/review-form-config";
import type { DosReviewLinkState } from "@/src/lib/dos/review-types";
import { DosQuickReviewForm } from "@/app/dos/review/[token]/DosQuickReviewForm";
import { DosTestimonyForm } from "@/app/dos/testimony/[token]/DosTestimonyForm";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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
      className="rounded-[22px] border border-[#DCEBFF] bg-white p-4 text-left shadow-[0_12px_30px_rgba(37,99,235,0.055)] transition-colors hover:border-[#2563EB] hover:bg-[#F8FBFF]"
      onClick={onClick}
      type="button"
    >
      <span className="block text-base font-black text-[#0F172A]">{children}</span>
      <span className="mt-1 block text-sm leading-6 text-[#475569]">{description}</span>
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
    <main className="min-h-screen bg-[#F8FBFF] px-4 py-6 text-[#0F172A]">
      <section className="mx-auto max-w-md rounded-[30px] border border-[#DCEBFF] bg-white p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Review
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          Choose a review
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          Pick the form that best fits what you want to share from this Table.
        </p>
        <p className="mt-3 rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{link.workspaceDisplayName}</p>

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
