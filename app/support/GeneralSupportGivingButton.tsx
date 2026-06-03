"use client";

import { useEffect, useState } from "react";
import { primaryDarkButtonClassName } from "@/components/brandButtons";
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
        className={primaryDarkButtonClassName}
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
