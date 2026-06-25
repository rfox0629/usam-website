import type { Metadata } from "next";
import DosTestimonyPage from "@/app/dos/testimony/[token]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimony Review | DOS",
  robots: {
    follow: false,
    index: false,
  },
};

export default DosTestimonyPage;
