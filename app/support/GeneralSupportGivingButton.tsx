"use client";

import { useState } from "react";
import { SupportMissionModal } from "@/src/components/missionaries/SupportMissionModal";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function GeneralSupportGivingButton({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="inline-block px-7 py-3 text-sm uppercase tracking-[0.2em] transition-all duration-300 bg-stone-100 text-stone-950 hover:bg-amber-200"
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        type="button"
      >
        {children}
      </button>

      <SupportMissionModal
        defaultAllocation="Support the General Mission Fund"
        householdId={null}
        householdName="USA Missionaries"
        initialGiftType="monthly"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        profileSlug={null}
        receivedMonthlySupport={0}
        source="general_support_page"
        supportMode="general_fund"
      />
    </>
  );
}
