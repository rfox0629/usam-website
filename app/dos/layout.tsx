import type { Metadata } from "next";
import type { ReactNode } from "react";
import { dosAppIcons, dosAppManifest } from "@/src/lib/dos/icon-metadata";

export const metadata: Metadata = {
  icons: dosAppIcons,
  manifest: dosAppManifest,
};

export default function DosLayout({ children }: { children: ReactNode }) {
  return children;
}
