import type { Metadata } from "next";
import type { ReactNode } from "react";
import { dosAppIcons } from "@/src/lib/dos/icon-metadata";
import { publicGroupPath } from "@/src/lib/groups/public-site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  return {
    icons: dosAppIcons,
    manifest: `${publicGroupPath(slug)}/manifest.webmanifest`,
  };
}

export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}
