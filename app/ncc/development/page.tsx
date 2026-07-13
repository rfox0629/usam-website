import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";
import { requireFullNccAccess } from "../_lib/require-full-ncc-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Development | National Command Center",
};

export default async function NccDevelopmentPage() {
  await requireFullNccAccess();

  return (
    <NccPlanned
      activeKey="development"
      crossLinks={[{ href: "/admin/finance", label: "Major Gift Inquiries (Legacy)" }]}
    />
  );
}
