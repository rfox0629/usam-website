import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { DosWalkthroughClient } from "./DosWalkthroughClient";

// USA-289: the 2-minute instructional walkthrough linked from the DOS welcome
// email. Real DOS screens with a made-up demo workspace; no sound, with the
// steps written on screen and repeated below as text. The 22-second bumper on
// the public DOS page is a separate, promotional video.
export const metadata: Metadata = {
  ...dosAppMetadata,
  description: "A 2-minute walkthrough of DOS: signing in, Home, People, Meetings, Prayer, and adding DOS to your phone.",
  title: { absolute: "Getting started with DOS" },
};

export const viewport: Viewport = dosAppViewport;

export default function DosWalkthroughPage() {
  return <DosWalkthroughClient />;
}
