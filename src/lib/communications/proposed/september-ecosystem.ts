/**
 * PROPOSED September design — an isolated experiment, not wired to anything.
 *
 * Nothing here imports from, or is imported by, the live newsletter path. The
 * production renderer (src/lib/communications/render.ts -> newsletter-editorial.ts)
 * is untouched, and deleting this directory plus app/dev/newsletter-design-review
 * returns the repository to exactly its current state.
 *
 * Every colour, mark, and font below was read from the live sites and the
 * canonical tokens in this repository, not eyeballed:
 *
 *   USA Missionaries   app/globals.css  --usam-black #0D0D0D, --usam-gold #C2A14E
 *                      live site body rgb(13,13,13), section numbers rgb(194,161,78)
 *   Kitchen Table      kitchentablegospel.org grounds rgb(30,20,13) / rgb(22,15,10)
 *                      accent rgb(156,199,239), cream rgb(243,228,204)
 *   DOS                discipleshipoperatingsystem.com panels rgb(10,22,34) /
 *                      rgb(7,13,20), accent rgb(111,178,240), deep rgb(30,111,191)
 */

/** USA Missionaries — the environment the whole email lives in. */
export const usam = {
  black: "#0D0D0D",
  body: "#D1D5DB",
  gold: "#C2A14E",
  /** Hairline. The site uses rgba white; email needs a solid equivalent. */
  hairline: "#242424",
  lift: "#151515",
  meta: "#9CA3AF",
  white: "#FFFFFF",
} as const;

/** Kitchen Table Gospel — warm ground, light blue signal, cream call to action. */
export const ktg = {
  accent: "#9CC7EF",
  body: "#CFC3B4",
  cream: "#F3E4CC",
  deep: "#100A06",
  ground: "#160F0A",
  panel: "#1E140D",
  rule: "#33241A",
} as const;

/** Discipleship Operating System — cool ground, brighter blue signal. */
export const dos = {
  accent: "#6FB2F0",
  body: "#A9BACB",
  cta: "#1E6FBF",
  deep: "#070D14",
  ground: "#0A1622",
  rule: "#16283A",
} as const;

const HEAD = "'Oswald','Arial Narrow',Arial,Helvetica,sans-serif";
const LABEL = "'Rajdhani','Trebuchet MS',Arial,Helvetica,sans-serif";
const BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export type ProposedLinks = {
  archiveUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
};

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paras(value: string) {
  return value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

function copy(value: string, color: string = usam.body, size = 15) {
  return paras(value)
    .map((item) => `<p style="margin:0 0 15px;font-family:${BODY};font-size:${size}px;line-height:1.78;color:${color};">${esc(item).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** Small tracked label. The site's most repeated signal. */
function label(text: string, color: string, extra = "") {
  return `<p style="margin:0 0 14px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${color};${extra}">${esc(text)}</p>`;
}

/** Numbered section label: gold index, muted role, mirroring 01 / 02 / 03 on the site. */
function indexLabel(index: string, role: string, indexColor: string, roleColor: string) {
  return `<p style="margin:0 0 14px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${roleColor};">`
    + `<span style="color:${indexColor};">${esc(index)}</span>`
    + `<span style="color:${roleColor};"> &nbsp;/&nbsp; ${esc(role)}</span></p>`;
}

function headline(text: string, size: number, color: string = usam.white, cls = "h2") {
  return `<h2 class="${cls}" style="margin:0 0 16px;font-family:${HEAD};font-size:${size}px;line-height:1.04;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;color:${color};">${esc(text).replace(/\n/g, "<br />")}</h2>`;
}

/** Edge-to-edge photograph with a documentary caption underneath. */
function plate(url: string, alt: string, caption: string, captionColor: string = usam.meta, ground: string = usam.black) {
  return `
    <tr>
      <td style="padding:0;background:${ground};">
        <img src="${esc(url)}" alt="${esc(alt)}" width="600" style="display:block;width:100%;max-width:100%;height:auto;border:0;" />
      </td>
    </tr>
    <tr>
      <td class="pad" style="padding:10px 32px 0;background:${ground};">
        <p style="margin:0;font-family:${LABEL};font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${captionColor};">${esc(caption)}</p>
      </td>
    </tr>`;
}

/** Bulletproof-ish button. Fill carries the destination's identity. */
function cta(text: string, url: string, fill: string, textColor: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="background:${fill};">
          <a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-family:${LABEL};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${textColor};text-decoration:none;">${esc(text)} &nbsp;&rarr;</a>
        </td>
      </tr>
    </table>`;
}

function rule(color: string = usam.hairline) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="border-top:1px solid ${color};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

export type ProposedContent = {
  closing: { body: string; heading: string; signoff: string };
  covering: string;
  dosBody: string;
  dosCtaLabel: string;
  edition: string;
  fieldLabel: string;
  frameworkSummary: string;
  hero: { subhead: string; title: string };
  intro: string;
  ktgBody: string;
  mens: { body: string; heading: string; teaser: string };
  slug: string;
  subject: string;
  tables: string;
  /** Null until a real announcement exists. The section is omitted entirely. */
  team: { body: string; heading: string } | null;
  website: { body: string; heading: string };
};

export function renderProposedNewsletter({
  assetBase,
  content,
  links,
  postalAddress = null,
  recipientFirstName,
}: {
  assetBase: string;
  content: ProposedContent;
  links: ProposedLinks;
  /** Omitted entirely until verified. Never invented. */
  postalAddress?: string | null;
  recipientFirstName: string;
}) {
  const mark = (file: string) => `${assetBase}/images/email/september-2026-proposed/${file}`;
  const photo = (file: string) => `${assetBase}/images/email/september-2026/${file}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${esc(content.subject)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
    <style>
      /* The shell is fluid; these only pull the display type back on phones. */
      @media only screen and (max-width:620px) {
        .wrap { width:100% !important; }
        .pad { padding-left:22px !important; padding-right:22px !important; }
        .h1 { font-size:32px !important; line-height:0.96 !important; }
        .h2 { font-size:25px !important; }
        .h3 { font-size:21px !important; }
        .statement { font-size:22px !important; }
        .mast { font-size:11px !important; letter-spacing:0.2em !important; padding-left:10px !important; }
        .mark { width:64px !important; }
        .edition { font-size:9px !important; letter-spacing:0.14em !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${usam.black};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(content.hero.subhead)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:${usam.black};">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrap" style="width:100%;max-width:600px;border-collapse:collapse;background:${usam.black};">

            <!-- Masthead: the site's own lockup, mark left, wordmark right. -->
            <tr>
              <td class="pad" style="padding:26px 32px 18px;background:${usam.black};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" valign="middle" style="padding:0;">
                      <img src="${esc(mark("usam-mark.png"))}" alt="USA Missionaries" width="76" class="mark" style="display:inline-block;width:76px;height:auto;border:0;vertical-align:middle;" />
                      <span class="mast" style="display:inline-block;padding-left:14px;font-family:${HEAD};font-size:15px;font-weight:500;letter-spacing:0.32em;text-transform:uppercase;color:${usam.white};vertical-align:middle;">USA Missionaries</span>
                    </td>
                    <td align="right" valign="middle" style="padding:0;">
                      <span class="edition" style="font-family:${LABEL};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#8E7838;">${esc(content.edition)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td class="pad" style="padding:0 32px;background:${usam.black};">${rule()}</td></tr>

            <!-- Hero -->
            <tr>
              <td class="pad" style="padding:34px 32px 32px;background:${usam.black};">
                ${label(content.fieldLabel, usam.gold)}
                <h1 class="h1" style="margin:0 0 20px;font-family:${HEAD};font-size:44px;line-height:0.94;font-weight:700;letter-spacing:0.005em;text-transform:uppercase;color:${usam.white};">${esc(content.hero.title).replace(/\n/g, "<br />")}</h1>
                <p style="margin:0;font-family:${BODY};font-size:16px;line-height:1.7;color:${usam.body};">${esc(content.hero.subhead)}</p>
              </td>
            </tr>
            <tr><td class="pad" style="padding:0 32px;background:${usam.black};">${rule()}</td></tr>

            <!-- Personal opening. Stays on the black field, wider measure, warmer. -->
            <tr>
              <td class="pad" style="padding:30px 32px 26px;background:${usam.black};">
                <p style="margin:0 0 18px;font-family:${BODY};font-size:16px;line-height:1.78;color:${usam.white};">Hi ${esc(recipientFirstName)},</p>
                ${copy(content.intro, usam.body, 16)}
              </td>
            </tr>

            <!-- 01 / 02 / 03 — the centrepiece -->
            <tr>
              <td class="pad" style="padding:0 32px 20px;background:${usam.black};">
                ${rule()}
                <div style="height:30px;line-height:30px;font-size:0;">&nbsp;</div>
                ${label("The Ecosystem", usam.gold)}
                ${headline("So, what exactly is\nUSA Missionaries?", 30)}
                <p style="margin:0;font-family:${BODY};font-size:15px;line-height:1.78;color:${usam.meta};">${esc(content.frameworkSummary)}</p>
              </td>
            </tr>

            <!-- 01 USA MISSIONARIES — the parent layer, core USAM system -->
            <tr>
              <td class="pad" style="padding:0 32px 28px;background:${usam.black};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="border-left:2px solid ${usam.gold};padding:2px 0 2px 20px;">
                      ${indexLabel("01", "The Covering", usam.gold, usam.meta)}
                      <img src="${esc(mark("usam-mark.png"))}" alt="USA Missionaries" width="40" style="display:block;width:40px;height:auto;border:0;margin:0 0 14px;" />
                      ${headline("USA Missionaries", 24, usam.white, "h3")}
                      ${copy(content.covering)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- 02 KITCHEN TABLE GOSPEL — its own warm ground and identity -->
            <tr><td style="padding:0;background:${ktg.accent};font-size:0;line-height:0;height:3px;">&nbsp;</td></tr>
            <tr>
              <td class="pad" style="padding:28px 32px 22px;background:${ktg.ground};">
                ${indexLabel("02", "The Model", ktg.accent, "#8E7E6C")}
                <img src="${esc(mark("ktg-mark.png"))}" alt="Kitchen Table Gospel" width="38" style="display:block;width:38px;height:auto;border:0;margin:0 0 14px;" />
                <h3 class="h3" style="margin:0 0 16px;font-family:${HEAD};font-size:24px;line-height:1.08;font-weight:700;letter-spacing:-0.01em;text-transform:uppercase;color:${usam.white};">Kitchen Table Gospel</h3>
                ${copy(content.ktgBody, ktg.body)}
              </td>
            </tr>
            ${plate(photo("kitchen-table-01.jpg"), "Four friends gathered around a wooden table with an open Bible and the USA Missionaries vision binder.", "Kitchen Table Gospel // Minnesota", "#8E7E6C", ktg.ground)}
            <tr>
              <td class="pad" style="padding:18px 32px 28px;background:${ktg.ground};">
                ${copy(content.tables, ktg.body)}
                <p style="margin:0 0 20px;font-family:${HEAD};font-size:15px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${ktg.cream};">Gather. Learn. Confess. Encourage. Multiply.</p>
                ${cta("Explore Kitchen Table Gospel", "https://kitchentablegospel.org", ktg.cream, ktg.ground)}
              </td>
            </tr>

            <!-- 03 DISCIPLESHIP OPERATING SYSTEM — cool ground, its own blue -->
            <tr><td style="padding:0;background:${dos.accent};font-size:0;line-height:0;height:3px;">&nbsp;</td></tr>
            <tr>
              <td class="pad" style="padding:28px 32px 30px;background:${dos.ground};">
                ${indexLabel("03", "The Tool", dos.accent, "#6C8095")}
                <img src="${esc(mark("dos-mark.png"))}" alt="Discipleship Operating System" width="38" style="display:block;width:38px;height:auto;border:0;margin:0 0 14px;" />
                <h3 class="h3" style="margin:0 0 16px;font-family:${HEAD};font-size:24px;line-height:1.08;font-weight:700;letter-spacing:-0.01em;text-transform:uppercase;color:${usam.white};">Discipleship Operating System</h3>
                ${copy(content.dosBody, dos.body)}
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                ${cta(content.dosCtaLabel, "https://discipleshipoperatingsystem.com", dos.cta, usam.white)}
              </td>
            </tr>

            <!-- Conclusion of the ecosystem sequence. The three branded sections
                 above already carry the hierarchy, so this states the point once
                 rather than repeating the ladder as a legend. -->
            <tr>
              <td class="pad" style="padding:34px 32px 36px;background:${usam.lift};">
                <p style="margin:0 0 10px;font-family:${LABEL};font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${usam.gold};">One Mission</p>
                <p class="statement" style="margin:0;font-family:${HEAD};font-size:28px;line-height:1.14;font-weight:700;letter-spacing:0.01em;text-transform:uppercase;color:${usam.white};">Make disciples who<br />make disciples.</p>
              </td>
            </tr>

            <!-- Website -->
            <tr>
              <td class="pad" style="padding:34px 32px 22px;background:${usam.black};">
                ${label("System Update // Website", usam.gold)}
                ${headline("The mission is\nbecoming clearer.", 30)}
                ${copy(content.website.body)}
              </td>
            </tr>
            ${plate(mark("usam-website.jpg"), "The rebuilt USA Missionaries website, showing the headline The Mission Is Active.", "usamissionaries.org // Rebuilt 2026")}
            <tr>
              <td class="pad" style="padding:18px 32px 34px;background:${usam.black};">
                ${cta("Explore USA Missionaries", "https://usamissionaries.org", usam.gold, usam.black)}
              </td>
            </tr>

            <!-- Men's discipleship -->
            <tr>
              <td class="pad" style="padding:0 32px 26px;background:${usam.black};">
                ${rule()}
                <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
                ${label("Field Report // Minnesota", usam.gold)}
                ${headline("Men are\ngathering.", 30)}
                ${copy(content.mens.body)}
              </td>
            </tr>
            ${plate(photo("group-prayer-01.jpg"), "Six men from the USA Missionaries men's discipleship group standing together outside, one holding a Bible.", "Men's discipleship // Two groups meeting weekly")}
            <tr>
              <td class="pad" style="padding:18px 32px 32px;background:${usam.black};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="border-left:2px solid ${usam.gold};padding:2px 0 2px 18px;">
                      <p style="margin:0;font-family:${HEAD};font-size:16px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${usam.white};">${esc(content.mens.teaser)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Team growth. Rendered only when a real announcement exists;
                 placeholder copy is never shipped. -->
            ${content.team ? `
            <tr>
              <td class="pad" style="padding:32px 32px 34px;background:${usam.lift};">
                ${label("Deployment Update", usam.gold)}
                ${headline(content.team.heading, 30)}
                ${copy(content.team.body, usam.meta)}
              </td>
            </tr>` : ""}

            <!-- Closing -->
            <tr>
              <td class="pad" style="padding:34px 32px 30px;background:${usam.black};">
                ${headline(content.closing.heading, 26)}
                ${copy(content.closing.body)}
                <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                ${rule()}
                <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
                <p style="margin:0 0 4px;font-family:${HEAD};font-size:19px;font-weight:700;letter-spacing:0.01em;color:${usam.white};">${esc(content.closing.signoff)}</p>
                <p style="margin:0;font-family:${LABEL};font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${usam.gold};">USA Missionaries</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="pad" style="padding:26px 32px 34px;background:#080808;border-top:1px solid ${usam.hairline};">
                <img src="${esc(mark("usam-mark.png"))}" alt="USA Missionaries" width="40" style="display:block;width:40px;height:auto;border:0;margin:0 0 14px;" />
                <p style="margin:0 0 16px;font-family:${BODY};font-size:12px;line-height:1.75;color:#9A9A9A;">You are receiving this because you partner with USA Missionaries.</p>
                ${postalAddress ? `<p style="margin:0 0 16px;font-family:${BODY};font-size:12px;line-height:1.75;color:#9A9A9A;">${esc(postalAddress)}</p>` : ""}
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
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const divider = "----------------------------------------";
  const text = [
    `USA MISSIONARIES  |  ${content.edition}`,
    content.fieldLabel.toUpperCase(),
    divider,
    content.hero.title.replace(/\n/g, " ").toUpperCase(),
    content.hero.subhead,
    divider,
    `Hi ${recipientFirstName},`,
    paras(content.intro).join("\n\n"),
    divider,
    "THE ECOSYSTEM",
    content.frameworkSummary,
    "",
    "01 / THE COVERING — USA MISSIONARIES",
    paras(content.covering).join("\n\n"),
    "",
    "02 / THE MODEL — KITCHEN TABLE GOSPEL",
    paras(content.ktgBody).join("\n\n"),
    paras(content.tables).join("\n\n"),
    "Explore Kitchen Table Gospel: https://kitchentablegospel.org",
    "",
    "03 / THE TOOL — DISCIPLESHIP OPERATING SYSTEM",
    paras(content.dosBody).join("\n\n"),
    `${content.dosCtaLabel}: https://discipleshipoperatingsystem.com`,
    divider,
    "ONE MISSION: MAKE DISCIPLES WHO MAKE DISCIPLES.",
    divider,
    "SYSTEM UPDATE // WEBSITE",
    "THE MISSION IS BECOMING CLEARER.",
    paras(content.website.body).join("\n\n"),
    "Explore USA Missionaries: https://usamissionaries.org",
    divider,
    "FIELD REPORT // MINNESOTA",
    "MEN ARE GATHERING.",
    paras(content.mens.body).join("\n\n"),
    content.mens.teaser,
    divider,
    ...(content.team ? ["DEPLOYMENT UPDATE", content.team.heading, paras(content.team.body).join("\n\n"), divider] : []),
    content.closing.heading,
    paras(content.closing.body).join("\n\n"),
    "",
    content.closing.signoff,
    "USA Missionaries",
    divider,
    postalAddress ?? "",
    `Read online: ${links.archiveUrl}`,
    `Manage preferences: ${links.preferencesUrl}`,
    `Unsubscribe: ${links.unsubscribeUrl}`,
  ].filter((line) => line !== "").join("\n");

  return { html, subject: content.subject, text };
}
