import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Communications | National Command Center",
};

export default function NccCommunicationsPage() {
  return (
    <NccPlanned
      activeKey="communications"
      crossLinks={[{ href: "/admin/public-experience", label: "Website (Legacy)" }]}
    />
  );
}
