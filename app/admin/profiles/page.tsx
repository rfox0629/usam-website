import type { Metadata } from "next";
import { OperationsInboxPage } from "../_components/OperationsInboxPage";

export const metadata: Metadata = {
  title: "Profiles Inbox | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function ProfilesOperationsPage() {
  return (
    <OperationsInboxPage
      config={{
        active: "missionary-profiles",
        description: "Review public profile feedback and profile-related submissions before changes move into the publishing workflow.",
        emptyDescription: "Profile review submissions will appear here. Photo review is listed as a source but is not a separate inbox yet.",
        formTypes: ["missionary_profile_review"],
        sourceForms: [
          { name: "Missionary Profile Review", route: "/missionaries/ryan-brooke-fox?previewForm=missionary_profile_review" },
          { name: "Photo Review", route: "/admin/missionary-profiles" },
        ],
        title: "Profiles",
      }}
    />
  );
}
