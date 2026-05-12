"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { CommitmentGiftType } from "@/components/missionaries/GivingCommitmentForm";
import { MajorGiftInquiryModal } from "@/src/components/missionaries/MajorGiftInquiryModal";
import { SupportMissionModal } from "@/src/components/missionaries/SupportMissionModal";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SharedSupportProps = {
  enableMajorGiftInquiry?: boolean;
  extraAction?: ReactNode;
  initialMajorGiftOpen?: boolean;
  majorGiftButtonLabel?: string;
  majorGiftPublicDescription?: string | null;
  missionaryId: string;
  missionaryName: string;
  missionarySlug: string;
  monthlyButtonLabel?: string;
  monthlyGivingUrl?: string | null;
  oneTimeButtonLabel?: string;
  oneTimeGivingUrl?: string | null;
  showSupport?: boolean;
  supportButtonLabel?: string;
  supportExplanation?: string;
  supportMode?: string;
  supportPublicLabel?: string;
  supportTargetFund?: string | null;
  supportTargetHouseholdName?: string | null;
};

function primaryButtonClassName() {
  return "inline-flex min-h-12 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_0_22px_rgba(212,166,61,0.24)] sm:w-auto sm:min-w-[220px]";
}

function secondaryButtonClassName() {
  return "inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] sm:w-auto sm:min-w-[208px]";
}

function compactPrimaryButtonClassName() {
  return "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-4 py-3 text-center text-[11px] uppercase leading-5 tracking-[0.22em] text-black transition-all duration-300 hover:bg-[#F5B942]";
}

function compactSecondaryButtonClassName() {
  return "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#D4A63D]/35 bg-black/25 px-4 py-3 text-center text-[11px] uppercase leading-5 tracking-[0.22em] text-[#F5B942] transition-all duration-300 hover:border-[#D4A63D] hover:bg-[#D4A63D]/10";
}

function compactTertiaryButtonClassName() {
  return "inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.03] px-4 py-2 text-center text-[10px] uppercase leading-5 tracking-[0.2em] text-stone-300 transition-all duration-300 hover:border-[#D4A63D]/50 hover:text-[#F5B942]";
}

function useSupportModal() {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [initialGiftType, setInitialGiftType] = useState<CommitmentGiftType>("monthly");

  return {
    closeModal: () => setIsSupportModalOpen(false),
    initialGiftType,
    isSupportModalOpen,
    openModal: (giftType: CommitmentGiftType = "monthly") => {
      setInitialGiftType(giftType);
      setIsSupportModalOpen(true);
    },
  };
}

function ProfileSupportModal({
  initialGiftType,
  isOpen,
  onClose,
  props,
}: {
  initialGiftType: CommitmentGiftType;
  isOpen: boolean;
  onClose: () => void;
  props: SharedSupportProps;
}) {
  return (
    <SupportMissionModal
      defaultAllocation={props.supportPublicLabel}
      householdId={props.missionaryId}
      householdName={props.missionaryName}
      initialGiftType={initialGiftType}
      isOpen={isOpen}
      monthlyGivingUrl={props.monthlyGivingUrl}
      onClose={onClose}
      oneTimeGivingUrl={props.oneTimeGivingUrl}
      profileSlug={props.missionarySlug}
      source="missionary_profile"
      supportButtonLabel={props.supportButtonLabel}
      supportExplanation={props.supportExplanation}
      supportMode={props.supportMode}
      supportPublicLabel={props.supportPublicLabel}
      supportTargetFund={props.supportTargetFund}
      supportTargetHouseholdName={props.supportTargetHouseholdName}
    />
  );
}

export function HeroSupportActions(props: SharedSupportProps) {
  const { closeModal, initialGiftType, isSupportModalOpen, openModal } = useSupportModal();
  const {
    extraAction,
    monthlyButtonLabel = "Support Monthly",
    showSupport = true,
  } = props;

  return (
    <>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4 md:mt-10">
        {showSupport ? (
          <button
            className={primaryButtonClassName()}
            onClick={() => openModal("monthly")}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            {monthlyButtonLabel}
          </button>
        ) : null}
        {extraAction}
      </div>

      <ProfileSupportModal
        initialGiftType={initialGiftType}
        isOpen={isSupportModalOpen}
        onClose={closeModal}
        props={props}
      />
    </>
  );
}

export function MonthlySupportActions(props: SharedSupportProps) {
  const { closeModal, initialGiftType, isSupportModalOpen, openModal } = useSupportModal();
  const triggerLabel = props.supportButtonLabel || props.monthlyButtonLabel || "Submit Commitment";

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClassName()}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          onClick={() => openModal("monthly")}
        >
          {triggerLabel}
        </button>
      </div>

      <ProfileSupportModal
        initialGiftType={initialGiftType}
        isOpen={isSupportModalOpen}
        onClose={closeModal}
        props={props}
      />
    </>
  );
}

export function ProfileSupportSectionActions(props: SharedSupportProps & { layout?: "default" | "compact" }) {
  const { closeModal, initialGiftType, isSupportModalOpen, openModal } = useSupportModal();
  const {
    enableMajorGiftInquiry = true,
    initialMajorGiftOpen = false,
    layout = "default",
    majorGiftButtonLabel = "Contact About Major Gift",
    majorGiftPublicDescription,
    missionaryId,
    missionaryName,
    missionarySlug,
    monthlyButtonLabel = "Support Monthly",
    oneTimeButtonLabel = "Give One Time",
    showSupport = true,
  } = props;

  if (!showSupport) {
    return null;
  }

  const isCompact = layout === "compact";

  return (
    <>
      <div className={isCompact ? "mt-5 grid gap-2" : "mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"}>
        <button
          className={isCompact ? compactPrimaryButtonClassName() : primaryButtonClassName()}
          onClick={() => openModal("monthly")}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          {monthlyButtonLabel}
        </button>
        <button
          className={isCompact ? compactSecondaryButtonClassName() : secondaryButtonClassName()}
          onClick={() => openModal("onetime")}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          {oneTimeButtonLabel}
        </button>
        {enableMajorGiftInquiry ? (
          <MajorGiftInquiryModal
            buttonClassName={isCompact ? compactTertiaryButtonClassName() : undefined}
            buttonLabel={majorGiftButtonLabel}
            description={majorGiftPublicDescription}
            householdId={missionaryId}
            householdName={missionaryName}
            initialOpen={initialMajorGiftOpen}
            profileSlug={missionarySlug}
          />
        ) : null}
      </div>

      <ProfileSupportModal
        initialGiftType={initialGiftType}
        isOpen={isSupportModalOpen}
        onClose={closeModal}
        props={props}
      />
    </>
  );
}
