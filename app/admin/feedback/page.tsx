import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feedback Inbox",
  robots: {
    follow: false,
    index: false,
  },
};

export { default } from "../product-feedback/page";
