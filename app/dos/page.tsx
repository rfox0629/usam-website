import type { Metadata } from "next";
import { DosPortalClient } from "./DosPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Portal | USA Missionaries",
  description: "Set up your DOS workspace and begin walking with people.",
};

export default function DosPortalPage() {
  return <DosPortalClient />;
}
