import type { Metadata } from "next";
import { getFeaturedRemnantVideo, getRemnantVideos } from "@/src/lib/remnant/content";
import { RemnantCollectionClient } from "./RemnantCollectionClient";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Remnant",
};

export default function DosRemnantCollectionPage() {
  const featured = getFeaturedRemnantVideo();
  const videos = getRemnantVideos();

  return <RemnantCollectionClient featured={featured} videos={videos} />;
}
