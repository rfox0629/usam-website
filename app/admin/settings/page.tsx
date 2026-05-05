import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";
import type { AdminResourceControlRow } from "../_components/AdminResourceControlTable";

export const metadata: Metadata = {
  title: "Admin Settings | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const settingRows: AdminResourceControlRow[] = [
  {
    actionHref: "/admin/dashboard",
    actionLabel: "Open Dashboard",
    detail: "Admin route protection uses Supabase auth and the admin_users allowlist.",
    id: "admin-access",
    metadata: [
      { label: "Access Model", value: "Supabase auth + admin_users" },
      { label: "Public Exposure", value: "Admin only" },
    ],
    owner: "System",
    status: "Active",
    title: "Admin Access",
    updatedAt: "Live Data",
    url: "admin_users",
  },
  {
    actionHref: "/admin/forms",
    actionLabel: "View Routing",
    detail: "All public forms should submit to Supabase and route to Prayer Team or Support Team.",
    id: "form-routing",
    metadata: [
      { label: "Source Table", value: "form_submissions" },
      { label: "Teams", value: "Prayer Team, Support Team" },
    ],
    owner: "Forms & Pages",
    status: "Active",
    title: "Form Routing",
    updatedAt: "Live Data",
    url: "form_submissions",
  },
  {
    actionHref: "/admin/prayer-team",
    actionLabel: "Open Prayer Team",
    detail: "Prayer partners, prayer requests, applications, and coverage are operated from Prayer Team.",
    id: "prayer-operations",
    metadata: [
      { label: "Source Tables", value: "prayer_partners, prayer_requests" },
      { label: "Future Integration", value: "DOS prayer alerts" },
    ],
    owner: "Prayer Team",
    status: "Active",
    title: "Prayer Operations",
    updatedAt: "Live Data",
    url: "prayer_team",
  },
  {
    actionHref: "/admin/support-team",
    actionLabel: "Open Support Team",
    detail: "Non-prayer form submissions, giving interest, and support follow up are operated from Support Team.",
    id: "support-operations",
    metadata: [
      { label: "Source Table", value: "form_submissions" },
      { label: "Filter", value: "assigned_team = support_team" },
    ],
    owner: "Support Team",
    status: "Active",
    title: "Support Operations",
    updatedAt: "Live Data",
    url: "support_team",
  },
  {
    actionHref: "/admin/pages",
    actionLabel: "View Pages",
    detail: "Public page settings and site-level configuration will be managed here when those controls are defined.",
    id: "site-settings",
    metadata: [
      { label: "Workflow", value: "Future public page settings" },
      { label: "Status", value: "Reserved, not overbuilt" },
    ],
    owner: "Public Site",
    status: "Draft",
    title: "Public Site Settings",
    updatedAt: "Reserved",
    url: "site_settings",
  },
];

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholderPage
      active="settings"
      description="Review core admin controls, access model, routing ownership, and future configuration areas."
      rows={settingRows}
      title="Admin Settings"
    />
  );
}
