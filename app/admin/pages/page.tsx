import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";
import type { AdminResourceControlRow } from "../_components/AdminResourceControlTable";

export const metadata: Metadata = {
  title: "Public Pages Admin | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const pageRows: AdminResourceControlRow[] = [
  {
    actionHref: "/",
    actionLabel: "View Page",
    detail: "Primary public homepage and broad invitation into the USA Missionaries site.",
    id: "home",
    metadata: [
      { label: "Primary CTA", value: "Mission / Support entry points" },
      { label: "Workflow", value: "Public page review" },
    ],
    owner: "Public Site",
    secondaryHref: "/admin/forms",
    secondaryLabel: "View Forms",
    status: "Live",
    title: "Home",
    updatedAt: "Static",
    url: "/",
  },
  {
    actionHref: "/mission",
    actionLabel: "View Page",
    detail: "Mission briefing page with field report access and mission story entry points.",
    id: "mission",
    metadata: [
      { label: "Form Route", value: "Field Reports Access -> Support Team" },
      { label: "Workflow", value: "Briefing and access requests" },
    ],
    owner: "Public Site",
    secondaryHref: "/admin/support-team?type=field_report_access",
    secondaryLabel: "View Submissions",
    status: "Live",
    title: "Mission",
    updatedAt: "Static",
    url: "/mission",
  },
  {
    actionHref: "/missionaries",
    actionLabel: "View Directory",
    detail: "Public missionary profile directory driven by missionary household visibility settings.",
    id: "missionaries",
    metadata: [
      { label: "Data Source", value: "missionary_households" },
      { label: "Workflow", value: "Profile visibility and support pages" },
    ],
    owner: "Missionary Profiles",
    secondaryHref: "/admin/missionary-profiles",
    secondaryLabel: "Manage Profiles",
    status: "Live",
    title: "Missionaries",
    updatedAt: "Live Data",
    url: "/missionaries",
  },
  {
    actionHref: "/prayer",
    actionLabel: "View Page",
    detail: "Prayer invitation page and public entry point into prayer team applications.",
    id: "prayer",
    metadata: [
      { label: "Form Route", value: "Prayer Team Application -> Prayer Team" },
      { label: "Workflow", value: "Prayer operations" },
    ],
    owner: "Prayer Team",
    secondaryHref: "/admin/prayer-team",
    secondaryLabel: "Open Prayer Team",
    status: "Live",
    title: "Prayer",
    updatedAt: "Static",
    url: "/prayer",
  },
  {
    actionHref: "/support",
    actionLabel: "View Page",
    detail: "General support and giving interest page routed into the Support Team workflow.",
    id: "support",
    metadata: [
      { label: "Form Route", value: "Support / Giving -> Support Team" },
      { label: "Workflow", value: "Giving interest and follow up" },
    ],
    owner: "Support Team",
    secondaryHref: "/admin/support-team?type=support_giving",
    secondaryLabel: "View Submissions",
    status: "Live",
    title: "Support",
    updatedAt: "Static",
    url: "/support",
  },
  {
    actionHref: "/system",
    actionLabel: "View Page",
    detail: "System preview and waitlist entry point routed into the Support Team workflow.",
    id: "system",
    metadata: [
      { label: "Form Route", value: "System Waitlist -> Support Team" },
      { label: "Workflow", value: "Future platform interest" },
    ],
    owner: "Support Team",
    secondaryHref: "/admin/support-team?type=system_waitlist",
    secondaryLabel: "View Submissions",
    status: "Live",
    title: "System",
    updatedAt: "Static",
    url: "/system",
  },
  {
    actionHref: "/financialfreedom",
    actionLabel: "View Page",
    detail: "Financial Freedom intake page routed into the Support Team workflow.",
    id: "financial-freedom",
    metadata: [
      { label: "Form Route", value: "Financial Freedom -> Support Team" },
      { label: "Workflow", value: "Financial request intake" },
    ],
    owner: "Support Team",
    secondaryHref: "/admin/support-team?type=financial_freedom",
    secondaryLabel: "View Submissions",
    status: "Live",
    title: "Financial Freedom",
    updatedAt: "Live Data",
    url: "/financialfreedom",
  },
];

export default function PublicPagesAdminPage() {
  return (
    <AdminPlaceholderPage
      active="pages"
      description="Review public pages, entry points, routing ownership, and the operating team connected to each workflow."
      primaryActionHref="/admin/forms"
      primaryActionLabel="View Forms"
      rows={pageRows}
      title="Public Pages"
    />
  );
}
