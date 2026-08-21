import type { Metadata } from "next";
import { getRemnantVideos, getFeaturedRemnantVideo } from "@/src/lib/remnant/content";
import { LibraryPreviewClient } from "./LibraryPreviewClient";

// DISPOSABLE PROTOTYPE ROUTE - founder UX review only. Not linked from production nav.
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Library Navigation Prototype | DOS",
};

export default function DosLibraryPreviewPage() {
  return (
    <LibraryPreviewClient
      featuredRemnantVideo={getFeaturedRemnantVideo()}
      remnantVideos={getRemnantVideos()}
    />
  );
}
