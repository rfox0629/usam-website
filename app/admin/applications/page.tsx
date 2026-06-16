import type { Metadata } from "next";
import { OperationsInboxPage } from "../_components/OperationsInboxPage";

export const metadata: Metadata = {
  title: "Applications Inbox | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function ApplicationsOperationsPage() {
  return (
    <OperationsInboxPage
      config={{
        active: "applications",
        description: "Track public application and mission-interest intake from first form submission through team follow-up.",
        emptyDescription: "Application and mission-interest submissions will appear here as they are received.",
        formTypes: ["join_mission_interest", "missionary_application"],
        includeUsamApplications: true,
        sourceForms: [
          { name: "Join The Mission", route: "/join" },
          { name: "USA Missionary Application", route: "/join/usam" },
        ],
        title: "Applications",
      }}
    />
  );
}
