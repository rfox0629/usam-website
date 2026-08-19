import type { Metadata } from "next";
import { RacePage } from "./RacePage";

const title = "Race With Purpose | 2THREE2 (Founder Preview)";
const description =
  "We train together, then we race together. A training season inside the 2THREE2 discipleship movement, powered by USA Missionaries.";

// Founder-preview mockup only. Deliberately not indexed and not wired into the
// domain-sites middleware, so it stays isolated from usamissionaries.org routing
// and cannot be mistaken for a live public page while it is still a concept.
export const metadata: Metadata = {
  description,
  robots: {
    follow: false,
    index: false,
  },
  title,
};

export default function Page() {
  return <RacePage />;
}
