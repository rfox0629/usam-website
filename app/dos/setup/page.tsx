import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { DosOnboardingClient } from "./DosOnboardingClient";

// USA-167 moved this wizard off /join. It is DOS workspace setup, so it lives
// on a DOS path and keeps DOS identity. /join is now the USA Missionaries
// application and must not show any of this before acceptance.
export const metadata: Metadata = {
  ...dosAppMetadata,
  description: "Set up DOS, choose your path, and begin stewarding your field.",
  title: { absolute: "Set up DOS" },
};

export const viewport: Viewport = dosAppViewport;

export default function DosSetupPage() {
  return <DosOnboardingClient />;
}
