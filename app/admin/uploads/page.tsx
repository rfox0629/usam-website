import type { Metadata } from "next";
import { AdminPlaceholderPage } from "../_components/AdminPlaceholderPage";

export const metadata: Metadata = {
  title: "Uploads & Documents | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function UploadsAdminPage() {
  return (
    <AdminPlaceholderPage
      active="uploads"
      description="Redacted inquiry uploads, statements, screenshots, and submitted files will be reviewed here after the upload workflow is built."
      title="Uploads & Documents"
    />
  );
}
