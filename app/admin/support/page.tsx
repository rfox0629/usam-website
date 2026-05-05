import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Support Activity | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function SupportActivityAdminPage() {
  return (
    <AdminPlaceholderPage
      active="support"
      description="Future support tools for transactions, giving links, recipient activity, and generosity flows will be organized here."
      title="Support Activity"
    />
  );
}
