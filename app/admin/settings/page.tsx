import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Admin Settings | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholderPage
      active="settings"
      description="Admin users, permissions, platform settings, and operational controls will be managed here in a future build."
      title="Admin Settings"
    />
  );
}
