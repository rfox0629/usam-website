import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import DosTestimonyPage from "@/app/dos/testimony/[token]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...dosAppMetadata,
  robots: {
    follow: false,
    index: false,
  },
  title: { absolute: "Testimony Review | DOS" },
};

export const viewport: Viewport = dosAppViewport;

export default DosTestimonyPage;
