import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";
import { requireFullNccAccess } from "../_lib/require-full-ncc-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Technology | National Command Center",
};

export default async function NccTechnologyPage() {
  await requireFullNccAccess();

  return (
    <NccPlanned
      activeKey="technology"
      crossLinks={[{ href: "/admin/settings", label: "Settings (Legacy)" }]}
    />
  );
}
