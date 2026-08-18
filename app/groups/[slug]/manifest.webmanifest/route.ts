import { NextResponse } from "next/server";
import { publicGroupPath } from "@/src/lib/groups/public-site";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const startUrl = publicGroupPath(slug);

  // Matches the DOS icon family and colors in public/favicons/dos/*.webmanifest.
  // "any" and "maskable" are separate assets: the maskable one is padded so a
  // circular Android crop cannot clip the mark.
  return NextResponse.json({
    background_color: "#FFFFFF",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/favicons/dos/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/favicons/dos/icon-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/favicons/dos/icon-maskable-512.png",
        type: "image/png",
      },
    ],
    name: "Discipleship Operating System",
    scope: `${startUrl}/`,
    short_name: "DOS",
    start_url: startUrl,
    theme_color: "#2563EB",
  });
}
