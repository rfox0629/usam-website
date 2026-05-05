import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Stewardship Sharing | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function StewardshipSharingAdminPage() {
  return (
    <AdminPlaceholderPage
      active="stewardship"
      description="This future view will support invited accountability relationships, sharing permissions, and support visibility without exposing private data by default."
      title="Stewardship Sharing"
    />
  );
}
