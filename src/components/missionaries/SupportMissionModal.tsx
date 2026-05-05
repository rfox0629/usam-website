"use client";

import { useEffect } from "react";
import { FundingCommitmentForm } from "@/components/missionaries/FundingCommitmentForm";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SupportMissionModalProps = {
  isOpen: boolean;
  missionaryName: string;
  missionarySlug: string;
  monthlyGoal: number;
  receivedMonthlySupport: number;
  supportButtonLabel?: string;
  supportExplanation?: string;
  supportMode?: string;
  supportPublicLabel?: string;
  supportTargetFund?: string | null;
  supportTargetHouseholdName?: string | null;
  onClose: () => void;
};

export function SupportMissionModal({
  isOpen,
  missionaryName,
  missionarySlug,
  monthlyGoal,
  receivedMonthlySupport,
  supportButtonLabel = "Support This Mission",
  supportExplanation,
  supportMode,
  supportPublicLabel,
  supportTargetFund,
  supportTargetHouseholdName,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onMouseDown={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-stone-800 bg-[#050505] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] md:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close support form"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center border border-white/[0.18] bg-white/[0.04] text-sm uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          onClick={onClose}
        >
          X
        </button>

        <div className="pr-12">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Commitment Form
          </p>
          <h2 className="mt-3 text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
            {supportButtonLabel}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
            {supportExplanation || "Document your giving commitment today. A USAM team member will follow up with the giving link and next steps."}
          </p>
        </div>

        <div className="mt-7">
          <FundingCommitmentForm
            missionaryName={missionaryName}
            missionarySlug={missionarySlug}
            monthlyGoal={monthlyGoal}
            receivedMonthlySupport={receivedMonthlySupport}
            supportExplanation={supportExplanation}
            supportMode={supportMode}
            supportPublicLabel={supportPublicLabel}
            supportTargetFund={supportTargetFund}
            supportTargetHouseholdName={supportTargetHouseholdName}
            displayMode="modal"
          />
        </div>
      </div>
    </div>
  );
}
