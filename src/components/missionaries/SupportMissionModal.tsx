"use client";

import { useEffect } from "react";
import { FundingCommitmentForm, type CommitmentGiftType } from "@/components/missionaries/FundingCommitmentForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SupportMissionModalProps = {
  isOpen: boolean;
  missionaryName: string;
  missionarySlug: string;
  monthlyGoal: number;
  monthlyGivingUrl?: string | null;
  oneTimeGivingUrl?: string | null;
  receivedMonthlySupport: number;
  supportButtonLabel?: string;
  supportExplanation?: string;
  supportMode?: string;
  supportPublicLabel?: string;
  supportTargetFund?: string | null;
  supportTargetHouseholdName?: string | null;
  initialGiftType?: CommitmentGiftType;
  onClose: () => void;
};

export function SupportMissionModal({
  isOpen,
  missionaryName,
  missionarySlug,
  monthlyGoal,
  monthlyGivingUrl,
  oneTimeGivingUrl,
  receivedMonthlySupport,
  supportButtonLabel = "Support This Mission",
  supportExplanation,
  supportMode,
  supportPublicLabel,
  supportTargetFund,
  supportTargetHouseholdName,
  initialGiftType = "Monthly",
  onClose,
}: SupportMissionModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onMouseDown={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-stone-200 bg-[#f8f4ec] p-4 text-stone-950 shadow-[0_30px_120px_rgba(28,25,23,0.34)] md:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close support form"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-sm uppercase tracking-[0.16em] text-stone-800 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-[#9a6b12]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          onClick={onClose}
        >
          X
        </button>

        <div className="rounded-3xl border border-[#eadfca] bg-white px-5 py-6 pr-14 shadow-sm md:px-7">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {missionaryName}
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-stone-950 md:text-3xl">
            {supportButtonLabel}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
            Choose the gift type and allocation preference below, then continue to the secure giving page.
          </p>
        </div>

        <div className="mt-5">
          <FundingCommitmentForm
            missionaryName={missionaryName}
            missionarySlug={missionarySlug}
            monthlyGoal={monthlyGoal}
            monthlyGivingUrl={monthlyGivingUrl}
            oneTimeGivingUrl={oneTimeGivingUrl}
            receivedMonthlySupport={receivedMonthlySupport}
            supportExplanation={supportExplanation}
            supportMode={supportMode}
            supportPublicLabel={supportPublicLabel}
            supportTargetFund={supportTargetFund}
            supportTargetHouseholdName={supportTargetHouseholdName}
            initialGiftType={initialGiftType}
            displayMode="modal"
          />
        </div>
      </div>
    </div>
  );
}
