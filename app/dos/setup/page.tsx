import type { Metadata } from "next";
import { DosSetupClient } from "./DosSetupClient";

export const metadata: Metadata = {
  title: "DOS Setup | USA Missionaries",
  description: "Create a DOS workspace and add your first three people.",
};

export default function DosSetupPage() {
  return <DosSetupClient />;
}
