"use client";

import { useState } from "react";
import { adminFont, AdminBadge, type AdminBadgeTone } from "../../admin/_components/AdminUI";

const checklistStatuses = ["Missing", "Received", "Needs Information", "Reviewed", "Reconciled"] as const;
type ChecklistStatus = (typeof checklistStatuses)[number];

const statusTone: Record<ChecklistStatus, AdminBadgeTone> = {
  Missing: "muted",
  "Needs Information": "red",
  Received: "blue",
  Reconciled: "green",
  Reviewed: "amber",
};

const checklistItems = [
  "Bank Statement — Operating Account",
  "Bank Statement — Savings Account",
  "Credit Card Statement",
  "Payroll Register",
  "Monthly Financial Statements (P&L, Balance Sheet)",
  "Restricted Fund Activity Summary",
  "Reconciliation Sign-Off",
  "Board Report Draft",
] as const;

function nextStatus(status: ChecklistStatus): ChecklistStatus {
  const index = checklistStatuses.indexOf(status);

  return checklistStatuses[(index + 1) % checklistStatuses.length];
}

export function MonthlyChecklistPrototype() {
  const [statuses, setStatuses] = useState<Record<string, ChecklistStatus>>(
    () => Object.fromEntries(checklistItems.map((item) => [item, "Missing" as ChecklistStatus])),
  );

  return (
    <div className="space-y-4">
      <div className="border border-[#C9A24A]/35 bg-[#C9A24A]/[0.06] p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#E4C465]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Prototype — Not Connected To A Database
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          This checklist has no backing table or migration. It&apos;s a clickable UI prototype of the intended
          Phase 2 monthly-close workflow (per docs/ncc-architecture.md §20) so it can be reviewed as a real
          interaction, not a static mock. Clicking a status cycles it through the real intended state machine —
          changes live only in this browser tab and reset on reload. No data here is persisted anywhere.
        </p>
      </div>

      <div className="divide-y divide-stone-800 border border-stone-800/75 bg-[#080808]/85">
        {checklistItems.map((item) => {
          const status = statuses[item];

          return (
            <button
              className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-stone-950/80"
              key={item}
              onClick={() => setStatuses((prev) => ({ ...prev, [item]: nextStatus(prev[item]) }))}
              type="button"
            >
              <span className="text-sm text-stone-100">{item}</span>
              <AdminBadge tone={statusTone[status]}>{status}</AdminBadge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
