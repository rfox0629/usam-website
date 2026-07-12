import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Reports | National Command Center",
};

export default function NccReportsPage() {
  return <NccPlanned activeKey="reports" />;
}
