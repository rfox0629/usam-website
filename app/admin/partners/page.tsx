import type { Metadata } from "next";
import { OperationsInboxPage } from "../_components/OperationsInboxPage";

export const metadata: Metadata = {
  title: "Partners Inbox | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function PartnersOperationsPage() {
  return (
    <OperationsInboxPage
      config={{
        active: "partners",
        description: "Track future church, ministry, and partner intake once those public forms are connected.",
        emptyDescription: "Partner forms are listed for IA readiness only. No partner intake data source exists yet.",
        sourceForms: [
          { name: "Become A Partner", route: "/support" },
          { name: "Church Partner", route: "/admin/partners" },
          { name: "Ministry Partner", route: "/admin/partners" },
        ],
        title: "Partners",
      }}
    />
  );
}
