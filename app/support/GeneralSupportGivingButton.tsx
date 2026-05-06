"use client";

import { useEffect, useState } from "react";
import { SupportMissionModal } from "@/src/components/missionaries/SupportMissionModal";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function GeneralSupportGivingButton({
  children,
  initialOpen = false,
}: {
  children: React.ReactNode;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useEffect(() => {
    if (initialOpen) {
      setIsOpen(true);
    }
  }, [initialOpen]);

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
        source="general_support_page"
        supportMode="general_fund"
      />
    </>
  );
}
