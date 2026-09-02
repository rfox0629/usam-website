import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  fallbackUsamPublicSite,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

/**
 * The shared social card for Groups surfaces: the directory and every individual
 * group. One renderer so the two cannot drift apart visually.
 *
 * USA Missionaries black and gold with the circular USAM emblem. Tenant sites
 * that set their own brand colors get those instead.
 */
export const shareCardSize = { height: 630, width: 1200 };
export const shareCardContentType = "image/png";

/** Long names and descriptions have to stay on the card, not overflow it. */
export function clampCardText(value: string, limit: number) {
  const text = value.trim();

  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

/** Site branding is stored loosely, so only usable color strings are trusted. */
function brandColor(brand: Record<string, unknown>, key: string, fallback: string) {
  const value = brand[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function resolveShareCardSite(hostname: string): Promise<PublicSiteConfig> {
  if (!isSupabaseAdminConfigured()) {
    return fallbackUsamPublicSite;
  }

  try {
    const resolution = await resolvePublicSiteForHost(createSupabaseAdminClient(), hostname);

    return resolution.site ?? fallbackUsamPublicSite;
  } catch {
    // A share card is never worth failing a page over.
    return fallbackUsamPublicSite;
  }
}

async function inlineEmblem() {
  const file = await readFile(join(process.cwd(), "public/favicons/usam/icon-512.png"));

  return `data:image/png;base64,${file.toString("base64")}`;
}

export async function renderGroupsShareCard({
  footnote,
  site,
  subtitle,
  title,
}: {
  footnote: string;
  site: PublicSiteConfig;
  subtitle: string;
  title: string;
}) {
  const accent = brandColor(site.brand, "primaryColor", "#C2A14E");
  const surface = brandColor(site.brand, "surfaceColor", "#0B0D10");
  const emblem = await inlineEmblem();

  return new ImageResponse(
    (
      <div
        style={{
          background: surface,
          backgroundImage: `radial-gradient(circle at 88% 14%, ${accent}2E, transparent 46%)`,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "78px 84px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "26px" }}>
          <img alt="" height={92} src={emblem} width={92} />
          <span
            style={{
              color: accent,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {site.displayName}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 82,
              fontWeight: 800,
              letterSpacing: "-0.022em",
              lineHeight: 1.04,
            }}
          >
            {clampCardText(title, 46)}
          </span>
          <span style={{ color: "#C8C3B6", fontSize: 32, lineHeight: 1.35, marginTop: 24, maxWidth: 900 }}>
            {clampCardText(subtitle, 118)}
          </span>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: "20px" }}>
          <span style={{ backgroundColor: accent, display: "flex", height: 3, width: 64 }} />
          <span style={{ color: accent, fontSize: 26, fontWeight: 600, letterSpacing: "0.05em" }}>
            {clampCardText(footnote, 54)}
          </span>
        </div>
      </div>
    ),
    { ...shareCardSize },
  );
}
