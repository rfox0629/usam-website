import type { Metadata } from "next";
import { DosV3PrototypeClient } from "./DosV3PrototypeClient";

export const metadata: Metadata = {
  title: "DOS V3 Prototype | USA Missionaries",
  description: "Founder review prototype for the DOS V3 discipleship workflow.",
  robots: {
    follow: false,
    index: false,
  },
};

// USA-138 Phase 2/3 founder prototype. Synthetic data only — this route never
// reads or writes Supabase, so it is safe to review without an account.
export default function DosV3Page() {
  return <DosV3PrototypeClient />;
}
