import type { Metadata } from "next";
import { Two3TwoPage } from "./Two3TwoPage";

const title = "2THREE2 — Run. Pray. Pursue. (Founder Preview)";
const description =
  "2THREE2 is an active discipleship movement powered by USA Missionaries. Move together, pray together, pursue Jesus together.";

// Founder-preview mockup only. Deliberately not indexed and not wired into the
// domain-sites middleware, so it stays isolated from usamissionaries.org routing
// and can't be mistaken for a live public page while it's still a concept.
export const metadata: Metadata = {
  description,
  robots: {
    follow: false,
    index: false,
  },
  title,
};

export default function Page() {
  return <Two3TwoPage />;
}
