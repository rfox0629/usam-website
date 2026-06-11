import type { Metadata } from "next";
import { dosAppIcons, dosAppManifest } from "@/src/lib/dos/icon-metadata";
import { UsamJoinClient } from "./usam/UsamJoinClient";

export const metadata: Metadata = {
  title: "Join DOS | USA Missionaries",
  description: "Set up DOS, choose your path, and begin stewarding your field.",
  icons: dosAppIcons,
  manifest: dosAppManifest,
};

export default function JoinPage() {
  return <UsamJoinClient />;
}
