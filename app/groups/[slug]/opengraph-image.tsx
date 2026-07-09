import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadPublicGroup } from "@/src/lib/public-groups";

export const runtime = "nodejs";
export const alt = "USA Missionaries Discipleship Group";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await loadPublicGroup(slug);

  const logoBuffer = await readFile(join(process.cwd(), "public/brand/logo/usam-website-logo.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const tagline = group?.tagline ?? "Discipleship happens in rhythms.";
  const name = group?.name ?? "USA Missionaries";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#06111F",
          backgroundImage:
            "radial-gradient(circle at 82% 18%, rgba(248,197,106,0.30), transparent 45%), linear-gradient(135deg, rgba(15,23,42,0), rgba(2,6,23,0.72))",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "26px" }}>
          <img alt="" height={70} src={logoSrc} style={{ objectFit: "contain" }} width={180} />
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </span>
        </div>
        <span
          style={{
            color: "#F8C56A",
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            marginTop: 28,
          }}
        >
          {tagline}
        </span>
      </div>
    ),
    { ...size }
  );
}
