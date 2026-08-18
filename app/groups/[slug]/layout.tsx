import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { dosAppIcons, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { publicGroupPath } from "@/src/lib/groups/public-site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  return {
    icons: dosAppIcons,
    manifest: `${publicGroupPath(slug)}/manifest.webmanifest`,
  };
}

// Group Home is a DOS member surface: it already serves the DOS icon family and
// the DOS manifest, so the browser chrome has to match them rather than inherit
// USAM's theme color from the root layout.
export const viewport: Viewport = dosAppViewport;

export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}
