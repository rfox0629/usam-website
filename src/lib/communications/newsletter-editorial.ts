/**
 * The USA Missionaries editorial newsletter template.
 *
 * This is the LOCKED visual system, recovered from the founder-approved
 * September test send: black hero, muted gold accents, Oswald/Rajdhani
 * condensed headlines over Inter body copy, warm-neutral reading sections with
 * dark blocks used only for emphasis. Iterate inside it; do not introduce a
 * second look.
 *
 * No imports, so the renderer can be exercised directly by a script and the
 * previewed HTML is byte-identical to what Resend receives.
 */

export const brand = {
  cream: "#FAF8F4",
  gold: "#C2A14E",
  goldTint: "#FFF6DD",
  ink: "#0D0D0D",
  inkSoft: "#1B1B1B",
  inkLift: "#2A2A2A",
  line: "#EDE8DF",
  sand: "#F2EFE9",
  shell: "#EDEAE4",
} as const;

const FONT_HEAD = "'Oswald','Arial Narrow',Arial,Helvetica,sans-serif";
const FONT_LABEL = "'Rajdhani','Trebuchet MS',Arial,Helvetica,sans-serif";
const FONT_BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export type EditorialImage = { alt: string; url: string };

export type EditorialPillar = {
  body: string;
  index: string;
  subtitle: string;
  title: string;
};

export type EditorialNewsletter = {
  closing: { body: string; heading: string; signoff: string };
  edition: string;
  editionMeta: string;
  hero: { subhead: string; title: string };
  intro: string;
  kicker: string;
  mens: { body: string; heading: string; image: EditorialImage; teaser: string };
  pillars: { heading: string; items: EditorialPillar[]; summary: string; tagline: string };
  postalAddress?: string | null;
  preheader: string;
  slug: string;
  subject: string;
  tables: { body: string; heading: string; image: EditorialImage };
  team: { body: string; heading: string; label: string };
  website: {
    body: string;
    ctaLabel: string;
    ctaUrl: string;
    heading: string;
    /** Optional screenshot. When absent, an email-safe browser mock renders. */
    image?: EditorialImage;
    mock: { eyebrow: string; headline: string; sub: string };
  };
};

export type EditorialLinks = {
  archiveUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(value: string) {
  return value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

function bodyHtml(value: string, color = "#33302B") {
  return paragraphs(value)
    .map((item) => (
      `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:16px;line-height:1.75;color:${color};">${escapeHtml(item).replace(/\n/g, "<br />")}</p>`
    ))
    .join("");
}

/** Full-bleed photograph. Width attribute keeps Outlook from over-scaling. */
function photo(image: EditorialImage) {
  return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" width="600" style="display:block;width:100%;max-width:100%;height:auto;border:0;" />`;
}

function label(text: string, color: string) {
  return `<p style="margin:0 0 12px;font-family:${FONT_LABEL};font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
}

/**
 * The 1-2-3 explanation. Rendered as one continuous gold-ruled column inside a
 * single dark block so the three pillars read as one argument rather than three
 * unrelated cards.
 */
function pillarsHtml(pillars: EditorialNewsletter["pillars"]) {
  const items = pillars.items.map((item, index) => `
    <tr>
      <td style="padding:${index === 0 ? "0" : "26px"} 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td width="58" valign="top" style="width:58px;padding:0 14px 0 0;">
              <p class="pillar-n" style="margin:0;font-family:${FONT_HEAD};font-size:34px;line-height:1;font-weight:700;color:${brand.gold};">${escapeHtml(item.index)}</p>
            </td>
            <td valign="top" style="border-left:2px solid ${brand.gold};padding:0 0 0 18px;">
              <p class="pillar-t" style="margin:0 0 4px;font-family:${FONT_HEAD};font-size:21px;line-height:1.15;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(item.title)}</p>
              <p style="margin:0 0 10px;font-family:${FONT_LABEL};font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${brand.gold};">${escapeHtml(item.subtitle)}</p>
              <p style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:#CFC9BF;">${escapeHtml(item.body).replace(/\n/g, "<br />")}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  return `
    <tr>
      <td class="pad" style="background:${brand.inkSoft};padding:34px 30px 36px;">
        ${label(pillars.heading, brand.gold)}
        <p style="margin:0 0 26px;font-family:${FONT_BODY};font-size:16px;line-height:1.75;color:#CFC9BF;">${escapeHtml(pillars.summary)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${items}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:30px;">
          <tr>
            <td style="border-top:1px solid ${brand.inkLift};padding:22px 0 0;">
              <p style="margin:0 0 6px;font-family:${FONT_HEAD};font-size:17px;line-height:1.4;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:${brand.gold};">${escapeHtml(pillars.tagline)}</p>
              <p class="tag" style="margin:0;font-family:${FONT_HEAD};font-size:25px;line-height:1.2;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#FFFFFF;">Make disciples who make disciples.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderEditorialNewsletter({
  links,
  newsletter,
  recipientFirstName,
}: {
  links: EditorialLinks;
  newsletter: EditorialNewsletter;
  recipientFirstName: string;
}) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(newsletter.subject)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Oswald:wght@500;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
    <style>
      /* Phones: let the shell breathe and pull the display type back so the
         headline never clips. Clients that ignore this still get a fluid
         table, because the wrapper is width:100% with a max-width. */
      @media only screen and (max-width:620px) {
        .wrap { width:100% !important; }
        .pad { padding-left:20px !important; padding-right:20px !important; }
        .h1 { font-size:32px !important; line-height:1.06 !important; }
        .h2 { font-size:23px !important; }
        .mock-h { font-size:32px !important; }
        .pillar-t { font-size:18px !important; }
        .pillar-n { font-size:28px !important; }
        .tag { font-size:20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${brand.shell};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(newsletter.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${brand.shell};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrap" style="width:100%;max-width:600px;border-collapse:collapse;background:${brand.cream};">

            <!-- A. HERO -->
            <tr>
              <td class="pad" style="background:${brand.ink};padding:34px 30px 38px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td>
                      <p style="margin:0;font-family:${FONT_LABEL};font-size:15px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#FFFFFF;">USA Missionaries</p>
                    </td>
                    <td align="right">
                      <p style="margin:0;font-family:${FONT_LABEL};font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${brand.gold};">${escapeHtml(newsletter.edition)}</p>
                    </td>
                  </tr>
                </table>
                <div style="height:1px;background:${brand.inkLift};margin:18px 0 24px;"></div>
                <p style="margin:0 0 16px;font-family:${FONT_LABEL};font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${brand.gold};">${escapeHtml(newsletter.editionMeta)}</p>
                <h1 class="h1" style="margin:0;font-family:${FONT_HEAD};font-size:44px;line-height:1.04;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;">${escapeHtml(newsletter.hero.title)}</h1>
                <p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:#BDB6AA;">${escapeHtml(newsletter.hero.subhead)}</p>
              </td>
            </tr>

            <!-- B. PERSONAL OPENING -->
            <tr>
              <td class="pad" style="padding:32px 30px 8px;">
                <p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:16px;line-height:1.75;color:#33302B;">Hi ${escapeHtml(recipientFirstName)},</p>
                ${bodyHtml(newsletter.intro)}
              </td>
            </tr>

            <!-- C. WHAT IS USA MISSIONARIES -->
            ${pillarsHtml(newsletter.pillars)}

            <!-- D. WEBSITE OVERHAUL -->
            <tr>
              <td style="padding:0;">
                ${newsletter.website.image ? photo(newsletter.website.image) : `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="background:${brand.inkLift};padding:11px 16px;">
                      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#4A453D;"></span>
                      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#4A453D;margin-left:6px;"></span>
                      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#4A453D;margin-left:6px;"></span>
                      <span style="font-family:${FONT_LABEL};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8C857A;margin-left:14px;">usamissionaries.org</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="background:${brand.ink};padding:46px 26px 50px;">
                      <p style="margin:0 0 14px;font-family:${FONT_LABEL};font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#8C857A;">${escapeHtml(newsletter.website.mock.eyebrow)}</p>
                      <p class="mock-h" style="margin:0;font-family:${FONT_HEAD};font-size:46px;line-height:0.98;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(newsletter.website.mock.headline)}</p>
                      <p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:#BDB6AA;">${escapeHtml(newsletter.website.mock.sub)}</p>
                    </td>
                  </tr>
                </table>`}
              </td>
            </tr>
            <tr>
              <td class="pad" style="background:${brand.sand};padding:28px 30px 32px;">
                ${label(newsletter.kicker, "#8A7231")}
                <h2 class="h2" style="margin:0 0 12px;font-family:${FONT_HEAD};font-size:28px;line-height:1.14;font-weight:700;letter-spacing:0.01em;color:${brand.ink};">${escapeHtml(newsletter.website.heading)}</h2>
                ${bodyHtml(newsletter.website.body)}
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:6px;">
                  <tr>
                    <td style="background:${brand.gold};">
                      <a href="${escapeHtml(newsletter.website.ctaUrl)}" style="display:inline-block;padding:14px 26px;font-family:${FONT_LABEL};font-size:14px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${brand.ink};text-decoration:none;">${escapeHtml(newsletter.website.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- E. KITCHEN TABLE + MEN'S DISCIPLESHIP -->
            <tr>
              <td style="padding:0;">
                ${photo(newsletter.tables.image)}
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:28px 30px 6px;">
                <h2 class="h2" style="margin:0 0 12px;font-family:${FONT_HEAD};font-size:28px;line-height:1.14;font-weight:700;color:${brand.ink};">${escapeHtml(newsletter.tables.heading)}</h2>
                ${bodyHtml(newsletter.tables.body)}
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:14px 30px 0;">
                ${photo(newsletter.mens.image)}
              </td>
            </tr>
            <tr>
              <td class="pad" style="padding:22px 30px 30px;">
                <h2 class="h2" style="margin:0 0 12px;font-family:${FONT_HEAD};font-size:24px;line-height:1.16;font-weight:700;color:${brand.ink};">${escapeHtml(newsletter.mens.heading)}</h2>
                ${bodyHtml(newsletter.mens.body)}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="background:${brand.goldTint};border-left:3px solid ${brand.gold};padding:14px 18px;">
                      <p style="margin:0;font-family:${FONT_LABEL};font-size:14px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7A6220;">${escapeHtml(newsletter.mens.teaser)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- F. TEAM IS GROWING (reserved) -->
            <tr>
              <td class="pad" style="background:${brand.inkSoft};padding:30px;">
                ${label(newsletter.team.label, brand.gold)}
                <h2 class="h2" style="margin:0 0 12px;font-family:${FONT_HEAD};font-size:26px;line-height:1.16;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(newsletter.team.heading)}</h2>
                <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.75;color:#CFC9BF;">${escapeHtml(newsletter.team.body)}</p>
              </td>
            </tr>

            <!-- G. CLOSING -->
            <tr>
              <td class="pad" style="padding:30px 30px 34px;">
                <h2 class="h2" style="margin:0 0 12px;font-family:${FONT_HEAD};font-size:26px;line-height:1.16;font-weight:700;color:${brand.ink};">${escapeHtml(newsletter.closing.heading)}</h2>
                ${bodyHtml(newsletter.closing.body)}
                <div style="height:1px;background:${brand.line};margin:8px 0 18px;"></div>
                <p style="margin:0;font-family:${FONT_HEAD};font-size:17px;line-height:1.4;font-weight:500;letter-spacing:0.04em;color:${brand.ink};">${escapeHtml(newsletter.closing.signoff)}</p>
                <p style="margin:2px 0 0;font-family:${FONT_LABEL};font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8A7231;">USA Missionaries</p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td class="pad" style="background:${brand.ink};padding:26px 30px 30px;">
                <p style="margin:0 0 14px;font-family:${FONT_LABEL};font-size:13px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FFFFFF;">USA Missionaries</p>
                <p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:13px;line-height:1.7;color:#8C857A;">You are receiving this because you partner with USA Missionaries.</p>
                ${newsletter.postalAddress
                  ? `<p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:12px;line-height:1.7;color:#8C857A;">${escapeHtml(newsletter.postalAddress)}</p>`
                  : ""}
                <p style="margin:0;font-family:${FONT_LABEL};font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
                  <a href="${escapeHtml(links.archiveUrl)}" style="color:${brand.gold};text-decoration:none;">Read online</a>
                  <span style="color:#4A453D;">&nbsp;&nbsp;/&nbsp;&nbsp;</span>
                  <a href="${escapeHtml(links.preferencesUrl)}" style="color:${brand.gold};text-decoration:none;">Manage preferences</a>
                  <span style="color:#4A453D;">&nbsp;&nbsp;/&nbsp;&nbsp;</span>
                  <a href="${escapeHtml(links.unsubscribeUrl)}" style="color:${brand.gold};text-decoration:none;">Unsubscribe</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const rule = "------------------------------------------------------------";
  const text = [
    `USA MISSIONARIES — ${newsletter.edition}`,
    newsletter.editionMeta.toUpperCase(),
    "",
    newsletter.hero.title.toUpperCase(),
    newsletter.hero.subhead,
    rule,
    `Hi ${recipientFirstName},`,
    "",
    paragraphs(newsletter.intro).join("\n\n"),
    rule,
    newsletter.pillars.heading.toUpperCase(),
    newsletter.pillars.summary,
    "",
    ...newsletter.pillars.items.map((item) => (
      `${item.index}  ${item.title.toUpperCase()} — ${item.subtitle.toUpperCase()}\n${item.body}`
    )),
    "",
    `${newsletter.pillars.tagline.toUpperCase()}`,
    "MAKE DISCIPLES WHO MAKE DISCIPLES.",
    rule,
    newsletter.website.heading.toUpperCase(),
    paragraphs(newsletter.website.body).join("\n\n"),
    `${newsletter.website.ctaLabel.toUpperCase()}: ${newsletter.website.ctaUrl}`,
    rule,
    newsletter.tables.heading.toUpperCase(),
    paragraphs(newsletter.tables.body).join("\n\n"),
    "",
    newsletter.mens.heading.toUpperCase(),
    paragraphs(newsletter.mens.body).join("\n\n"),
    newsletter.mens.teaser,
    rule,
    newsletter.team.heading.toUpperCase(),
    newsletter.team.body,
    rule,
    newsletter.closing.heading.toUpperCase(),
    paragraphs(newsletter.closing.body).join("\n\n"),
    "",
    newsletter.closing.signoff,
    "USA Missionaries",
    rule,
    newsletter.postalAddress ?? "",
    `Read online: ${links.archiveUrl}`,
    `Manage preferences: ${links.preferencesUrl}`,
    `Unsubscribe: ${links.unsubscribeUrl}`,
  ].filter((line) => line !== "").join("\n");

  return { html, subject: newsletter.subject, text };
}
