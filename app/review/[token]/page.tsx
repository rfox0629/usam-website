import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import DosQuickReviewPage from "@/app/dos/review/[token]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...dosAppMetadata,
  robots: {
    follow: false,
    index: false,
  },
  title: { absolute: "How was your conversation? | DOS" },
};

export const viewport: Viewport = dosAppViewport;

export default DosQuickReviewPage;
