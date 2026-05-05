"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { MajorGiftInquiryModal } from "@/src/components/missionaries/MajorGiftInquiryModal";
import { SupportMissionModal } from "@/src/components/missionaries/SupportMissionModal";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SharedSupportProps = {
  enableMajorGiftInquiry?: boolean;
  extraAction?: ReactNode;
  majorGiftButtonLabel?: string;
  majorGiftPublicDescription?: string | null;
  missionaryId: string;
  missionaryName: string;
  missionarySlug: string;
  monthlyGoal: number;
  monthlyButtonLabel?: string;
  monthlyGivingUrl?: string | null;
  oneTimeButtonLabel?: string;
  oneTimeGivingUrl?: string | null;
  receivedMonthlySupport: number;
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

function supportUrl(value: string | null | undefined, fallback: string | null | undefined, type: "monthly" | "onetime") {
  const baseUrl = value?.trim() || fallback?.trim() || "/support";
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}type=${type}`;
}

function useSupportModal() {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  return {
    closeModal: () => setIsSupportModalOpen(false),
    isSupportModalOpen,
    openModal: () => setIsSupportModalOpen(true),
  };
}

export function HeroSupportActions(props: SharedSupportProps) {
  const {
    extraAction,
    monthlyButtonLabel = "Support Monthly",
    monthlyGivingUrl,
    oneTimeGivingUrl,
    showSupport = true,
  } = props;

  return (
    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4 md:mt-10">
      {showSupport ? (
        <Link
          className={primaryButtonClassName()}
          href={supportUrl(monthlyGivingUrl, oneTimeGivingUrl, "monthly")}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {monthlyButtonLabel}
        </Link>
      ) : null}
      {extraAction}
    </div>
  );
}

export function MonthlySupportActions(props: SharedSupportProps) {
  const { closeModal, isSupportModalOpen, openModal } = useSupportModal();

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClassName()}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          onClick={openModal}
        >
          Give Monthly
        </button>
        <Link
          href="/support"
          className={secondaryButtonClassName()}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Give One Time
        </Link>
      </div>

      <SupportMissionModal
        {...props}
        isOpen={isSupportModalOpen}
        onClose={closeModal}
      />
    </>
  );
}

export function ProfileSupportSectionActions(props: SharedSupportProps) {
  const {
    enableMajorGiftInquiry = true,
    majorGiftButtonLabel = "Contact About Major Gift",
    majorGiftPublicDescription,
    missionaryId,
    missionaryName,
    missionarySlug,
    monthlyButtonLabel = "Support Monthly",
    monthlyGivingUrl,
    oneTimeButtonLabel = "Give One Time",
    oneTimeGivingUrl,
    showSupport = true,
  } = props;

  if (!showSupport) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        className={primaryButtonClassName()}
        href={supportUrl(monthlyGivingUrl, oneTimeGivingUrl, "monthly")}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        {monthlyButtonLabel}
      </Link>
      <Link
        className={secondaryButtonClassName()}
        href={supportUrl(oneTimeGivingUrl, monthlyGivingUrl, "onetime")}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        {oneTimeButtonLabel}
      </Link>
      {enableMajorGiftInquiry ? (
        <MajorGiftInquiryModal
          buttonLabel={majorGiftButtonLabel}
          description={majorGiftPublicDescription}
          householdId={missionaryId}
          householdName={missionaryName}
          profileSlug={missionarySlug}
        />
      ) : null}
    </div>
  );
}
