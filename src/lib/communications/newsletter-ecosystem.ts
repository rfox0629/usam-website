/**
 * The ecosystem newsletter template.
 *
 * Draws an issue from the structured sections on its record, so Operations can
 * edit copy, reorder, and hide sections without a deploy. Every colour, mark,
 * and font was read from the live sites and the canonical tokens in this
 * repository:
 *
 *   USA Missionaries   app/globals.css  --usam-black #0D0D0D, --usam-gold #C2A14E
 *   Kitchen Table      kitchentablegospel.org grounds rgb(30,20,13) / rgb(22,15,10)
 *                      accent rgb(156,199,239), cream rgb(243,228,204)
 *   DOS                discipleshipoperatingsystem.com panels rgb(10,22,34) /
 *                      rgb(7,13,20), accent rgb(111,178,240), deep rgb(30,111,191)
 *
 * No imports, so the renderer can be exercised directly by a script and the
 * previewed HTML is byte-identical to what Resend receives.
 */

export const usam = {
  black: "#0D0D0D",
  body: "#D1D5DB",
  gold: "#C2A14E",
  hairline: "#242424",
  lift: "#151515",
  meta: "#9CA3AF",
  white: "#FFFFFF",
} as const;

export const ktg = {
  accent: "#9CC7EF",
  body: "#CFC3B4",
  cream: "#F3E4CC",
  ground: "#160F0A",
  meta: "#8E7E6C",
  rule: "#33241A",
} as const;

export const dos = {
  accent: "#6FB2F0",
  body: "#A9BACB",
  cta: "#1E6FBF",
  ground: "#0A1622",
  meta: "#6C8095",
  rule: "#16283A",
} as const;

const HEAD = "'Oswald','Arial Narrow',Arial,Helvetica,sans-serif";
const LABEL = "'Rajdhani','Trebuchet MS',Arial,Helvetica,sans-serif";
const BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export type EcosystemBrand = "usam" | "ktg" | "dos";

export type EcosystemSection = {
  body: string;
  brand: EcosystemBrand;
  cta?: { label: string; url: string };
  eyebrow?: string;
  heading: string;
  hidden: boolean;
  image?: { alt: string; caption?: string; url: string };
  index?: string;
  key: string;
  position: number;
  /**
   * A participant's account. Present only when a sharing permission was
   * verified against the original submission; see renderStory below.
   */
  story?: {
    attribution: string | null;
    permission: "anonymous" | "with_name";
    pullQuote?: string;
    text: string;
  };
  tagline?: string;
  type: "header" | "letter" | "story" | "invitation" | "pillar" | "feature" | "closing";
  /**
   * Review-only note, drawn as a marker when `reviewMarkers` is on. The section
   * normalizer does not read this field, so it cannot arrive from a record and
   * cannot reach an inbox; only a local script can set it.
   */
  pendingNote?: string;
};

export type EcosystemLinks = {
  archiveUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
};

export type EcosystemIssue = {
  markBase: string;
  postalAddress: string | null;
  preheader: string;
  sections: EcosystemSection[];
  subject: string;
};

const palette = {
  dos: { accent: dos.accent, body: dos.body, cta: dos.cta, ctaText: usam.white, ground: dos.ground, meta: dos.meta, rule: dos.rule },
  ktg: { accent: ktg.accent, body: ktg.body, cta: ktg.cream, ctaText: ktg.ground, ground: ktg.ground, meta: ktg.meta, rule: ktg.rule },
  usam: { accent: usam.gold, body: usam.body, cta: usam.gold, ctaText: usam.black, ground: usam.black, meta: usam.meta, rule: usam.hairline },
} as const;

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paras(value: string) {
  return value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

function copy(value: string, color: string, size = 15) {
  return paras(value)
    .map((item) => `<p style="margin:0 0 15px;font-family:${BODY};font-size:${size}px;line-height:1.78;color:${color};">${esc(item).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function label(text: string, color: string) {
  return `<p style="margin:0 0 14px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${color};">${esc(text)}</p>`;
}

function indexLabel(index: string, role: string, indexColor: string, roleColor: string) {
  return `<p style="margin:0 0 14px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${roleColor};">`
    + `<span style="color:${indexColor};">${esc(index)}</span>`
    + `<span> &nbsp;/&nbsp; ${esc(role)}</span></p>`;
}

function headline(text: string, size: number, color: string = usam.white, cls = "h2") {
  return `<h2 class="${cls}" style="margin:0 0 16px;font-family:${HEAD};font-size:${size}px;line-height:1.06;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;color:${color};">${esc(text).replace(/\n/g, "<br />")}</h2>`;
}

function plate(image: { alt: string; caption?: string; url: string }, ground: string, captionColor: string) {
  const caption = image.caption
    ? `<tr><td class="pad" style="padding:10px 32px 0;background:${ground};">
        <p style="margin:0;font-family:${LABEL};font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${captionColor};">${esc(image.caption)}</p>
      </td></tr>`
    : "";

  return `
    <tr><td style="padding:0;background:${ground};">
      <img src="${esc(image.url)}" alt="${esc(image.alt)}" width="600" style="display:block;width:100%;max-width:100%;height:auto;border:0;" />
    </td></tr>${caption}`;
}

function cta(text: string, url: string, fill: string, textColor: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="background:${fill};">
        <a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-family:${LABEL};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${textColor};text-decoration:none;">${esc(text)} &nbsp;&rarr;</a>
      </td></tr>
    </table>`;
}

function rule(color: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="border-top:1px solid ${color};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/**
 * A participant's account renders only under a permission that was verified
 * against the original submission, and only at the scope that permission
 * covers.
 *
 * "anonymous" carries no attribution, so an attribution present alongside it is
 * treated as a contradiction and the whole story is withheld rather than
 * guessed at. There is no "private" branch because a declined permission cannot
 * be represented on a section at all.
 */
function renderStory(section: EcosystemSection, ground: string, bodyColor: string, accent: string) {
  const { story } = section;

  if (!story || !story.text.trim()) {
    return "";
  }

  if (story.permission === "anonymous" && story.attribution) {
    return "";
  }

  if (story.permission === "with_name" && !story.attribution) {
    return "";
  }

  const quote = story.pullQuote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 18px;">
        <tr><td style="border-left:2px solid ${accent};padding:2px 0 2px 18px;">
          <p style="margin:0;font-family:${HEAD};font-size:18px;line-height:1.3;font-weight:500;color:${accent};">&ldquo;${esc(story.pullQuote)}&rdquo;</p>
        </td></tr>
      </table>`
    : "";

  const attribution = story.attribution
    ? `<p style="margin:0 0 4px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${accent};">&mdash; ${esc(story.attribution)}</p>`
    : "";

  return `${copy(story.text, bodyColor, 16)}${quote}${attribution}`;
}

function reviewMarker(note: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
      <tr><td style="border:1px dashed ${usam.gold};padding:14px 18px;background:rgba(194,161,78,0.08);">
        <p style="margin:0 0 6px;font-family:${LABEL};font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${usam.gold};">Permission pending &mdash; private review only</p>
        <p style="margin:0;font-family:${BODY};font-size:13px;line-height:1.7;color:${usam.meta};">${esc(note)}</p>
      </td></tr>
    </table>`;
}

function renderSection(section: EcosystemSection, markBase: string, reviewMarkers: boolean) {
  const tone = palette[section.brand];
  const mark = (file: string) => `${markBase}/images/email/september-2026-proposed/${file}`;
  const marks: Record<EcosystemBrand, string> = { dos: "dos-mark.png", ktg: "ktg-mark.png", usam: "usam-mark.png" };

  const tagline = section.tagline
    ? `<p style="margin:0 0 20px;font-family:${HEAD};font-size:15px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${section.brand === "usam" ? usam.white : tone.cta};">${esc(section.tagline)}</p>`
    : "";

  const button = section.cta ? cta(section.cta.label, section.cta.url, tone.cta, tone.ctaText) : "";

  if (section.type === "header") {
    return `
      <tr><td class="pad" style="padding:34px 32px 30px;background:${tone.ground};">
        ${section.eyebrow ? label(section.eyebrow, usam.gold) : ""}
        <h1 class="h1" style="margin:0 0 20px;font-family:${HEAD};font-size:44px;line-height:0.94;font-weight:700;letter-spacing:0.005em;text-transform:uppercase;color:${usam.white};">${esc(section.heading).replace(/\n/g, "<br />")}</h1>
        <p style="margin:0;font-family:${BODY};font-size:16px;line-height:1.7;color:${tone.body};">${esc(section.body)}</p>
      </td></tr>
      <tr><td class="pad" style="padding:0 32px;background:${tone.ground};">${rule(tone.rule)}</td></tr>`;
  }

  if (section.type === "letter") {
    return `
      <tr><td class="pad" style="padding:30px 32px 28px;background:${tone.ground};">
        ${section.heading ? `<p style="margin:0 0 18px;font-family:${BODY};font-size:16px;line-height:1.78;color:${usam.white};">${esc(section.heading)}</p>` : ""}
        ${copy(section.body, tone.body, 16)}
      </td></tr>`;
  }

  if (section.type === "closing") {
    return `
      <tr><td class="pad" style="padding:34px 32px 30px;background:${tone.ground};">
        ${headline(section.heading, 26)}
        ${copy(section.body, tone.body)}
        <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
        ${rule(tone.rule)}
        <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
        <p style="margin:0 0 4px;font-family:${HEAD};font-size:19px;font-weight:700;letter-spacing:0.01em;color:${usam.white};">${esc(section.tagline ?? "")}</p>
        <p style="margin:0;font-family:${LABEL};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${usam.gold};">USA Missionaries</p>
      </td></tr>`;
  }

  // pillar / feature / story / invitation share one shape: label, optional
  // mark, heading, copy, optional photograph, optional tagline, optional CTA.
  const eyebrow = section.index && section.eyebrow
    ? indexLabel(section.index, section.eyebrow, tone.accent, tone.meta)
    : section.eyebrow
      ? label(section.eyebrow, tone.accent)
      : "";

  const brandMark = section.type === "pillar"
    ? `<img src="${esc(mark(marks[section.brand]))}" alt="" width="38" style="display:block;width:38px;height:auto;border:0;margin:0 0 14px;" />`
    : "";

  const headingSize = section.type === "story" || section.type === "invitation" ? 24 : 27;
  const headingColor = section.type === "invitation" ? tone.cta : usam.white;

  const above = `
    <tr><td class="pad" style="padding:28px 32px ${section.image ? "20px" : "6px"};background:${tone.ground};">
      ${eyebrow}${brandMark}
      ${headline(section.heading, headingSize, headingColor, "h3")}
      ${reviewMarkers && section.pendingNote ? reviewMarker(section.pendingNote) : ""}
      ${copy(section.body, tone.body, section.type === "story" ? 16 : 15)}
      ${section.type === "story" ? renderStory(section, tone.ground, tone.body, tone.accent) : ""}
    </td></tr>`;

  const photo = section.image ? plate(section.image, tone.ground, tone.meta) : "";

  const below = tagline || button
    ? `<tr><td class="pad" style="padding:${section.image ? "20px" : "6px"} 32px 30px;background:${tone.ground};">${tagline}${button}</td></tr>`
    : `<tr><td class="pad" style="padding:0 32px 22px;background:${tone.ground};font-size:0;line-height:0;">&nbsp;</td></tr>`;

  return `${above}${photo}${below}`;
}

export function renderEcosystemNewsletter({
  issue,
  links,
  recipientFirstName,
  reviewMarkers = false,
}: {
  issue: EcosystemIssue;
  links: EcosystemLinks;
  recipientFirstName: string;
  /**
   * Founder-review only. Draws `pendingNote` markers so unresolved copy reads
   * as a deliberate hole. Off everywhere a real message is produced.
   */
  reviewMarkers?: boolean;
}) {
  // One substitution pass over every visible string, so a greeting token works
  // wherever an editor puts it rather than only in the opening.
  const personalize = (value: string) => value.replace(/\{\{\s*first_name\s*\}\}/g, recipientFirstName);

  const sections = issue.sections
    .filter((section) => !section.hidden)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      ...section,
      body: personalize(section.body),
      heading: personalize(section.heading),
      ...(section.tagline ? { tagline: personalize(section.tagline) } : {}),
    }));

  const mark = (file: string) => `${issue.markBase}/images/email/september-2026-proposed/${file}`;
  const edition = sections.find((section) => section.type === "header")?.tagline ?? "";

  // A 3px accent bar wherever the identity changes, so the KTG and DOS grounds
  // announce themselves. Derived from order, so it survives a reorder.
  let previousBrand: EcosystemBrand | null = null;
  const body = sections.map((section) => {
    const divider = previousBrand && previousBrand !== section.brand
      ? `<tr><td style="padding:0;background:${palette[section.brand].accent};font-size:0;line-height:0;height:3px;">&nbsp;</td></tr>`
      : "";
    previousBrand = section.brand;

    return `${divider}${renderSection(section, issue.markBase, reviewMarkers)}`;
  }).join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${esc(issue.subject)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
    <style>
      @media only screen and (max-width:620px) {
        .wrap { width:100% !important; }
        .pad { padding-left:22px !important; padding-right:22px !important; }
        .h1 { font-size:32px !important; line-height:0.96 !important; }
        .h2 { font-size:25px !important; }
        .h3 { font-size:22px !important; }
        .mast { font-size:11px !important; letter-spacing:0.18em !important; padding-left:10px !important; }
        .mark { width:64px !important; }
        .edition { font-size:9px !important; letter-spacing:0.14em !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${usam.black};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(issue.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:${usam.black};">
      <tr><td align="center" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrap" style="width:100%;max-width:600px;border-collapse:collapse;background:${usam.black};">

          <tr>
            <td class="pad" style="padding:26px 32px 18px;background:${usam.black};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="left" valign="middle" style="padding:0;">
                    <img src="${esc(mark("usam-mark.png"))}" alt="USA Missionaries" width="76" class="mark" style="display:inline-block;width:76px;height:auto;border:0;vertical-align:middle;" />
                    <span class="mast" style="display:inline-block;padding-left:14px;font-family:${HEAD};font-size:15px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:${usam.white};vertical-align:middle;">USA Missionaries</span>
                  </td>
                  <td align="right" valign="middle" style="padding:0;">
                    <span class="edition" style="font-family:${LABEL};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8E7838;">${esc(edition)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="pad" style="padding:0 32px;background:${usam.black};">${rule(usam.hairline)}</td></tr>

          ${body}

          <tr>
            <td class="pad" style="padding:26px 32px 34px;background:#080808;border-top:1px solid ${usam.hairline};">
              <img src="${esc(mark("usam-mark.png"))}" alt="USA Missionaries" width="40" style="display:block;width:40px;height:auto;border:0;margin:0 0 14px;" />
              <p style="margin:0 0 16px;font-family:${BODY};font-size:12px;line-height:1.75;color:#9A9A9A;">You are receiving this because you partner with USA Missionaries.</p>
              ${issue.postalAddress ? `<p style="margin:0 0 16px;font-family:${BODY};font-size:12px;line-height:1.75;color:#9A9A9A;">${esc(issue.postalAddress)}</p>` : ""}
              <p style="margin:0;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
                <a href="${esc(links.archiveUrl)}" style="color:${usam.gold};text-decoration:none;">Read online</a>
                <span style="color:#3A3A3A;"> &nbsp;/&nbsp; </span>
                <a href="${esc(links.preferencesUrl)}" style="color:${usam.gold};text-decoration:none;">Manage preferences</a>
                <span style="color:#3A3A3A;"> &nbsp;/&nbsp; </span>
                <a href="${esc(links.unsubscribeUrl)}" style="color:${usam.gold};text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const divider = "----------------------------------------";
  const lines: string[] = [`USA MISSIONARIES  |  ${edition}`, divider];

  for (const section of sections) {
    if (section.eyebrow) {
      lines.push(section.index ? `${section.index} / ${section.eyebrow.toUpperCase()}` : section.eyebrow.toUpperCase());
    }

    if (section.heading) {
      lines.push(section.type === "letter" ? section.heading : section.heading.replace(/\n/g, " ").toUpperCase());
    }

    lines.push(paras(section.body).join("\n\n"));

    if (section.type === "story") {
      const rendered = renderStory(section, "", "", "");
      // Withheld in HTML means withheld here: one gate, not two.
      if (rendered && section.story) {
        lines.push(paras(section.story.text).join("\n\n"));
        if (section.story.pullQuote) lines.push(`"${section.story.pullQuote}"`);
        if (section.story.attribution) lines.push(`— ${section.story.attribution}`);
      }
    }

    if (section.tagline) lines.push(section.tagline);
    if (section.cta) lines.push(`${section.cta.label}: ${section.cta.url}`);
    lines.push(divider);
  }

  lines.push(
    issue.postalAddress ?? "",
    `Read online: ${links.archiveUrl}`,
    `Manage preferences: ${links.preferencesUrl}`,
    `Unsubscribe: ${links.unsubscribeUrl}`,
  );

  const text = lines.filter((line) => line !== "").join("\n");

  return { html, subject: issue.subject, text };
}
