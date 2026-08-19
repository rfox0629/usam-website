import type { Metadata } from "next";
import { RaceV2Page } from "./RaceV2Page";

const title = "Race With Purpose | 2THREE2 V2 (Founder Preview)";
const description =
  "We train together, then we race together. A training season inside the 2THREE2 discipleship movement, powered by USA Missionaries.";

// Founder-preview mockup only. Not indexed, not wired into the domain-sites
// middleware, and reachable by direct URL alone.
export const metadata: Metadata = {
  description,
  robots: {
    follow: false,
    index: false,
  },
  title,
};

export default function Page() {
  return <RaceV2Page />;
}
