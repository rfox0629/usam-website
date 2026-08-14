import { NextResponse } from "next/server";
import { publicGroupPath } from "@/src/lib/groups/public-site";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const startUrl = publicGroupPath(slug);

  return NextResponse.json({
    background_color: "#080A0D",
    display: "standalone",
    icons: [
      {
        purpose: "any maskable",
        sizes: "192x192",
        src: "/favicons/dos/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any maskable",
        sizes: "512x512",
        src: "/favicons/dos/icon-512.png",
        type: "image/png",
      },
    ],
    name: "Discipleship Operating System",
    scope: `${startUrl}/`,
    short_name: "DOS",
    start_url: startUrl,
    theme_color: "#080A0D",
  });
}
