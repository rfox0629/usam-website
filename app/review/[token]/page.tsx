import type { Metadata } from "next";
import DosQuickReviewPage from "@/app/dos/review/[token]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How was your conversation? | DOS",
  robots: {
    follow: false,
    index: false,
  },
};

export default DosQuickReviewPage;
