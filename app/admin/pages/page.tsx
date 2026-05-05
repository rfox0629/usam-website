import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Public Pages Admin | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function PublicPagesAdminPage() {
  return (
    <AdminPlaceholderPage
      active="pages"
      description="Public page management for campaign pages, missionary pages, and future giving pages will be added here."
      title="Public Pages"
    />
  );
}
