import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import type { AdminResourceControlRow } from "../_components/AdminResourceControlTable";
import { UploadsControl } from "./UploadsControl";

export const metadata: Metadata = {
  title: "Uploads & Documents | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const uploadRows: AdminResourceControlRow[] = [
  {
    actionHref: "/admin/missionary-profiles",
    actionLabel: "Manage Media",
    detail: "Supabase Storage bucket for missionary household directory and hero family images.",
    id: "missionary-images",
    metadata: [
      { label: "Storage Bucket", value: "missionary-images" },
      { label: "Public Use", value: "Missionary directory and public profiles" },
    ],
    owner: "Missionary Workspaces",
    secondaryHref: "/missionaries",
    secondaryLabel: "View Directory",
    status: "Active",
    title: "Missionary Images",
    updatedAt: "Live Data",
    url: "missionary-images",
  },
  {
    actionHref: "/admin/support-team?type=financial_freedom",
    actionLabel: "View Requests",
    detail: "Financial Freedom inquiry attachments and supporting documents for admin review.",
    id: "financial-freedom-uploads",
    metadata: [
      { label: "Workflow", value: "Financial Freedom intake" },
      { label: "Visibility", value: "Admin only" },
    ],
    owner: "Support Team",
    status: "Pending",
    title: "Financial Freedom Uploads",
    updatedAt: "Workflow Pending",
    url: "financial-freedom-uploads",
  },
  {
    actionHref: "/admin/public-experience?tab=forms",
    actionLabel: "View Public Experience",
    detail: "Future document uploads connected to public forms and support workflows.",
    id: "form-documents",
    metadata: [
      { label: "Workflow", value: "Form submissions" },
      { label: "Automation", value: "Not connected yet" },
    ],
    owner: "Support Team",
    status: "Draft",
    title: "Form Documents",
    updatedAt: "Not Connected",
    url: "form-documents",
  },
  {
    actionHref: "/admin/public-experience?tab=pages",
    actionLabel: "View Public Experience",
    detail: "Public site media and future content assets for page-level management.",
    id: "site-media",
    metadata: [
      { label: "Workflow", value: "Public page media" },
      { label: "Visibility", value: "Public after placement" },
    ],
    owner: "Public Site",
    status: "Draft",
    title: "Site Media",
    updatedAt: "Not Connected",
    url: "site-media",
  },
];

export default function UploadsAdminPage() {
  return (
    <AdminShell active="uploads" title="Uploads & Documents">
      <UploadsControl rows={uploadRows} />
    </AdminShell>
  );
}
