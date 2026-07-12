import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Technology | National Command Center",
};

export default function NccTechnologyPage() {
  return (
    <NccPlanned
      activeKey="technology"
      crossLinks={[{ href: "/admin/settings", label: "Settings (Legacy)" }]}
    />
  );
}
