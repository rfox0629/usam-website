import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";

// Everything under /dos is DOS-branded, not USAM-branded. Pages below here should
// only set their own title, description, canonical, and robots.
export const metadata: Metadata = dosAppMetadata;

export const viewport: Viewport = dosAppViewport;

export default function DosLayout({ children }: { children: ReactNode }) {
  return children;
}
