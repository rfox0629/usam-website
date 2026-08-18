import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support Inbox",
  robots: {
    follow: false,
    index: false,
  },
};

export { default } from "../support-team/page";
