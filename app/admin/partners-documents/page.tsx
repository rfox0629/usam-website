import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { PARTNERS_DOCUMENT_GROUPS, listPartnersDocuments } from "@/src/lib/partners-documents";
import { PartnersDocumentsAdmin } from "./PartnersDocumentsAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Partner Documents",
};

export default async function PartnersDocumentsPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  // Admin manages the whole legacy library, including documents held back
  // from the shared-passphrase partner surface.
  const documents = await listPartnersDocuments({ includeHidden: true });

  return (
    <AdminShell
      active="partners-documents"
      description="Upload and manage the files shown in the Due Diligence Library on the private /partners page."
      title="Partner Documents"
    >
      <PartnersDocumentsAdmin documents={documents} groupOptions={PARTNERS_DOCUMENT_GROUPS} />
    </AdminShell>
  );
}
