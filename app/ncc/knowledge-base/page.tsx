import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Knowledge Base | National Command Center",
};

export default function NccKnowledgeBasePage() {
  return <NccPlanned activeKey="knowledge-base" />;
}
