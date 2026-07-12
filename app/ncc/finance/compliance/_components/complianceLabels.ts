import type { AdminBadgeTone } from "../../../../admin/_components/AdminUI";
import type { ComplianceFilingStatus } from "@/src/lib/compliance/types";

export const statusLabels: Record<ComplianceFilingStatus, string> = {
  ai_prepared: "AI Prepared",
  approved: "Approved",
  archived: "Archived",
  filed: "Filed",
  filed_pending_confirmation: "Filed — Pending Confirmation",
  gathering_documents: "Gathering Documents",
  missing_information: "Missing Information",
  not_started: "Not Started",
  ready_for_review: "Ready for Review",
};

export const statusTone: Record<ComplianceFilingStatus, AdminBadgeTone> = {
  ai_prepared: "blue",
  approved: "blue",
  archived: "muted",
  filed: "green",
  filed_pending_confirmation: "amber",
  gathering_documents: "muted",
  missing_information: "red",
  not_started: "muted",
  ready_for_review: "amber",
};

export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
