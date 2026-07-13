import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";
import { requireFullNccAccess } from "../_lib/require-full-ncc-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Communications | National Command Center",
};

export default async function NccCommunicationsPage() {
  await requireFullNccAccess();

  return (
    <NccPlanned
      activeKey="communications"
      crossLinks={[{ href: "/admin/public-experience", label: "Website (Legacy)" }]}
    />
  );
}
