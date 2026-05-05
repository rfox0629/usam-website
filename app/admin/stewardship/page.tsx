import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Financial Stewardship | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function StewardshipAdminPage() {
  return (
    <AdminPlaceholderPage
      active="stewardship"
      description="Future tools for reviewing stewardship plans will appear here only when a user explicitly grants access. No private stewardship data is exposed in this placeholder."
      title="Financial Stewardship"
    />
  );
}
