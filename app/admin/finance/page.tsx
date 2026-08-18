import type { Metadata } from "next";
import { OperationsInboxPage } from "../_components/OperationsInboxPage";

export const metadata: Metadata = {
  title: "Finance Inbox",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function FinanceOperationsPage() {
  return (
    <OperationsInboxPage
      config={{
        active: "finance",
        description: "Track giving commitments, monthly support setup, and finance follow-up without turning public pages into finance dashboards.",
        emptyDescription: "Finance submissions and support commitments will appear here when available.",
        formTypes: ["financial_freedom"],
        includeMajorGiftInquiries: true,
        includeProfileAssignment: true,
        includeSupportCommitments: true,
        sourceForms: [
          { name: "Giving Commitments", route: "/support" },
          { name: "Monthly Support", route: "/missionaries/fox-family" },
          { name: "Future Finance Forms", route: "/admin/finance" },
        ],
        title: "Finance",
      }}
    />
  );
}
