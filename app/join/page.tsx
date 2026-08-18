import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { UsamJoinClient } from "./usam/UsamJoinClient";

// /join is a DOS onboarding surface, so it carries DOS identity even though it
// sits outside /dos.
export const metadata: Metadata = {
  ...dosAppMetadata,
  description: "Set up DOS, choose your path, and begin stewarding your field.",
  title: { absolute: "Join DOS" },
};

export const viewport: Viewport = dosAppViewport;

export default function JoinPage() {
  return <UsamJoinClient />;
}
