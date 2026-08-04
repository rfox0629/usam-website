import type { Metadata } from "next";
import { DosV3PrototypeClient } from "./DosV3PrototypeClient";

export const metadata: Metadata = {
  title: "DOS V3 Prototype | USA Missionaries",
  description: "Founder preview of the DOS V3 workflow redesign and AI-assisted meeting intake concept.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function DosV3PrototypePage() {
  return <DosV3PrototypeClient />;
}
