import type { Metadata } from "next";
import { Two3TwoV2Page } from "./Two3TwoV2Page";

const title = "2THREE2 V2 | Run. Pray. Pursue. (Founder Preview)";
const description =
  "2THREE2 is an active discipleship movement powered by USA Missionaries. Move together, pray together, pursue Jesus together.";

// Founder-preview mockup only. Not indexed, not wired into the domain-sites
// middleware, and reachable by direct URL alone. V1 remains at /2three2-v1 for
// side-by-side comparison.
export const metadata: Metadata = {
  description,
  robots: {
    follow: false,
    index: false,
  },
  title,
};

export default function Page() {
  return <Two3TwoV2Page />;
}
