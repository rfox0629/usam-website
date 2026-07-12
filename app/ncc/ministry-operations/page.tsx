import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Ministry Operations | National Command Center",
};

export default function NccMinistryOperationsPage() {
  return (
    <NccPlanned
      activeKey="ministry-operations"
      crossLinks={[{ href: "/admin/relationship-intelligence", label: "Circle Engine (Legacy)" }]}
    />
  );
}
