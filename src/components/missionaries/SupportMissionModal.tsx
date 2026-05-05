"use client";

import { useEffect } from "react";
import { GivingCommitmentForm, type CommitmentGiftType, type SupportCommitmentSource } from "@/components/missionaries/GivingCommitmentForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SupportMissionModalProps = {
  isOpen: boolean;
  defaultAllocation?: string | null;
  householdId?: string | null;
  householdName: string;
  monthlyGivingUrl?: string | null;
  oneTimeGivingUrl?: string | null;
  profileSlug?: string | null;
  source?: SupportCommitmentSource;
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
  defaultAllocation,
  householdId,
  householdName,
  monthlyGivingUrl,
  oneTimeGivingUrl,
  profileSlug,
  source = "missionary_profile",
  supportExplanation,
  supportMode,
  supportPublicLabel,
  supportTargetFund,
  supportTargetHouseholdName,
  initialGiftType = "monthly",
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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-stone-950/75 px-4 pb-10 pt-20 backdrop-blur-md sm:px-5 sm:pt-24 md:pt-28"
      role="dialog"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-[840px] text-stone-950"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close support form"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-sm uppercase tracking-[0.16em] text-stone-800 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-[#9a6b12] md:right-5 md:top-5"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          onClick={onClose}
        >
          X
        </button>

        <GivingCommitmentForm
          defaultAllocation={defaultAllocation ?? supportPublicLabel}
          displayMode="modal"
          householdId={householdId}
          householdName={householdName}
          initialGiftType={initialGiftType}
          profileSlug={profileSlug}
          resolvedMonthlyGivingUrl={monthlyGivingUrl}
          resolvedOneTimeGivingUrl={oneTimeGivingUrl}
          source={source}
          supportExplanation={supportExplanation}
          supportMode={supportMode}
          supportTargetFund={supportTargetFund}
          supportTargetHouseholdName={supportTargetHouseholdName}
        />
      </div>
    </div>
  );
}
