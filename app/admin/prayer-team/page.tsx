import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prayer Team | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export { default } from "../prayer/page";
