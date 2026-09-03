import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { domainSites, type DomainSiteKey } from "@/src/lib/domain-sites";

/**
 * The one USA Missionaries share card.
 *
 * Every link preview across every surface — the USAM site, the domain sites, the
 * group directory, individual pages — is drawn by this function. There is no
 * second renderer and no per-page artwork, so a new page inherits the correct
 * treatment by adding a six-line `opengraph-image.tsx` rather than commissioning
 * an image.
 *
 * The system, deliberately:
 *
 *   - warm off-white field, no photography of any kind. The card that prompted
 *     this was a cropped mountain landscape, which said nothing about the page
 *     and looked like stock art in every unfurl.
 *   - the page name is the only thing set large. Everything else is support.
 *   - one restrained gold accent: the top edge rule and the footer rule.
 *   - the brand emblem small in the corner. Branding, not billboard.
 *   - generous margins; the card should look under-filled rather than packed.
 */
export const shareCardSize = { height: 630, width: 1200 } as const;
export const shareCardContentType = "image/png";

/**
 * Warm off-white rather than white: white cards glare inside the dark chat
 * surfaces most links are shared into, and the cream matches the light sections
 * the site already uses.
 */
const palette = {
  accent: "#C2A14E",
  eyebrow: "#7C6423",
  ink: "#15120C",
  muted: "#5B5347",
  surface: "#FCFAF6",
} as const;

/**
 * DOS is a product with its own blue identity, so it keeps its accent. Everything
 * else shares USAM gold — the point of the system is that these read as one
 * family, not four unrelated cards.
 */
const brandAccent: Partial<Record<DomainSiteKey, { accent: string; eyebrow: string }>> = {
  "discipleship-operating-system": { accent: "#2563EB", eyebrow: "#1D4ED8" },
};

export type ShareCardInput = {
  /** Overrides the brand accent. Tenant group sites supply their own color. */
  accent?: null | string;
  brand?: DomainSiteKey;
  /** Small tracked label above the name. Omit when the name says enough. */
  eyebrow?: null | string;
  /** Inlined instead of the brand emblem. Tenant group sites supply their own. */
  emblemPath?: null | string;
  /** Bottom-left line, under the gold rule. Defaults to the brand's domain. */
  footnote?: null | string;
  /** The brand name beside the emblem. Defaults to the brand's site name. */
  eyebrowBrand?: null | string;
  subtitle?: null | string;
  title: string;
};

/** Long names and descriptions have to stay on the card, not overflow it. */
export function clampCardText(value: string, limit: number) {
  const text = value.trim().replace(/\s+/g, " ");

  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

/**
 * The name is the card, so it is sized to fill the space it has rather than
 * being pinned to one size and either rattling around or wrapping to four lines.
 */
function titleFontSize(title: string) {
  if (title.length <= 16) {
    return 118;
  }

  if (title.length <= 28) {
    return 96;
  }

  if (title.length <= 44) {
    return 78;
  }

  return 64;
}

/**
 * Read once per process. An OG route can be hit repeatedly while a link is being
 * scraped by several platforms at once, and the font files do not change.
 */
let fontsPromise: null | Promise<Array<{ data: Buffer; name: string; style: "normal"; weight: 500 | 600 }>> = null;

function loadFonts() {
  fontsPromise ??= (async () => {
    const [medium, semibold] = await Promise.all([
      readFile(join(process.cwd(), "public/fonts/share/oswald-medium.ttf")),
      readFile(join(process.cwd(), "public/fonts/share/oswald-semibold.ttf")),
    ]);

    return [
      { data: medium, name: "Oswald", style: "normal" as const, weight: 500 as const },
      { data: semibold, name: "Oswald", style: "normal" as const, weight: 600 as const },
    ];
  })();

  return fontsPromise;
}

/**
 * Satori cannot fetch, so the emblem is inlined. A missing or unreadable file
 * drops the mark instead of failing the card: a preview without an emblem still
 * previews, one that throws unfurls as a broken image.
 */
async function inlineEmblem(path: string) {
  try {
    const file = await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));

    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The host a reader will actually type, used as the default footer line. */
function brandDomain(origin: string) {
  return origin.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export async function renderShareCard({
  accent: accentOverride,
  brand = "usam",
  emblemPath,
  eyebrow,
  eyebrowBrand,
  footnote,
  subtitle,
  title,
}: ShareCardInput) {
  const site = domainSites[brand];
  const brandColors = brandAccent[brand];
  const accent = accentOverride?.trim() || brandColors?.accent || palette.accent;
  const eyebrowColor = accentOverride?.trim() || brandColors?.eyebrow || palette.eyebrow;
  const [fonts, emblem] = await Promise.all([
    loadFonts(),
    inlineEmblem(emblemPath || site.icon512Path),
  ]);
  const cardTitle = clampCardText(title, 58);
  const footerLine = footnote === null ? null : footnote?.trim() || brandDomain(site.canonicalOrigin);
  // A brand's own root card has the brand name set large already, so the corner
  // label would just say it twice. The emblem alone carries it there.
  const brandLabel = clampCardText(eyebrowBrand || site.siteName, 40);
  const headerLabel = brandLabel.toLowerCase() === cardTitle.toLowerCase() ? null : brandLabel;

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: palette.surface,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Oswald",
          height: "100%",
          justifyContent: "space-between",
          padding: "76px 88px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        {/* The single unbroken accent on the card. */}
        <div
          style={{
            backgroundColor: accent,
            display: "flex",
            height: 10,
            left: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
        />

        <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
          {emblem ? <img alt="" height={64} src={emblem} width={64} /> : null}
          {headerLabel ? (
            <span
              style={{
                color: palette.muted,
                fontSize: 25,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {headerLabel}
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          {eyebrow ? (
            <span
              style={{
                color: eyebrowColor,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "0.22em",
                marginBottom: 22,
                textTransform: "uppercase",
              }}
            >
              {clampCardText(eyebrow, 42)}
            </span>
          ) : null}

          <span
            style={{
              color: palette.ink,
              fontSize: titleFontSize(cardTitle),
              fontWeight: 600,
              letterSpacing: "-0.005em",
              lineHeight: 1.02,
            }}
          >
            {cardTitle}
          </span>

          {subtitle ? (
            <span
              style={{
                color: palette.muted,
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.34,
                marginTop: 26,
                maxWidth: 880,
              }}
            >
              {clampCardText(subtitle, 124)}
            </span>
          ) : null}
        </div>

        {footerLine ? (
          <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
            <span style={{ backgroundColor: accent, display: "flex", height: 4, width: 72 }} />
            <span
              style={{
                color: palette.muted,
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {clampCardText(footerLine, 56)}
            </span>
          </div>
        ) : (
          <div style={{ backgroundColor: accent, display: "flex", height: 4, width: 72 }} />
        )}
      </div>
    ),
    { ...shareCardSize, fonts },
  );
}
