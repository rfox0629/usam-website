/**
 * Q2/Q3 2026 field update: a designed issue template.
 *
 * The generic renderer in newsletter-template.ts turns heading/body sections
 * into a plain letter. This issue needs photography, a numbered framework, and
 * a website block, so it gets its own renderer and registers itself by slug.
 * Everything else stays shared: the same subscriber row, the same manage token,
 * the same Resend sender, the same send and delivery-event tables.
 *
 * Email constraints this file is written against:
 * - 640px max width, single column, no flex or grid.
 * - Layout in tables, spacing in cell padding, every style inline.
 * - No border-radius, which suits the brand and keeps Outlook honest.
 * - Google Fonts are requested for Apple Mail and ignored elsewhere, so every
 *   family carries a real fallback stack.
 *
 * Copy note: no em dashes, per founder direction, same rule the join emails
 * follow. Enforced by scripts/newsletter-q3-2026-regression.mjs.
 */

const BLACK = "#0D0D0D";
const INK = "#151515";
const GOLD = "#C2A14E";
const GOLD_DEEP = "#8C6D1F";
const PAPER = "#FAF8F4";
const BODY_TEXT = "#2B2B2B";
const MUTED_TEXT = "#5C574E";
const DARK_MUTED = "#B8B4AD";

const DISPLAY = "'Oswald','Arial Narrow',Arial,Helvetica,sans-serif";
const TACTICAL = "'Rajdhani','Trebuchet MS',Arial,Helvetica,sans-serif";
const BODY = "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

const CONTENT_WIDTH = 640;

export type Q3FieldUpdateLinks = {
  briefingUrl: string;
  dosUrl: string;
  groupUrl: string;
  kitchenTableUrl: string;
  missionariesUrl: string;
  siteUrl: string;
};

export type RenderQ3FieldUpdateInput = {
  archiveUrl: string;
  assetBaseUrl: string;
  firstName: string;
  links: Q3FieldUpdateLinks;
  preferencesUrl: string;
  /**
   * Founder-review draft shows the notes that mark what still has to be filled
   * in. The donor send must be rendered with this off.
   */
  showPlaceholderNotes: boolean;
  unsubscribeUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full-bleed row inside the 640px frame. */
function bleed(background: string, inner: string) {
  return `<tr><td bgcolor="${background}" style="background-color:${background};padding:0;">${inner}</td></tr>`;
}

/** Padded row inside the 640px frame. */
function block(background: string, padding: string, inner: string) {
  return `<tr><td class="usam-pad" bgcolor="${background}" style="background-color:${background};padding:${padding};">${inner}</td></tr>`;
}

function eyebrow(text: string, color: string) {
  return `<p style="margin:0 0 14px;font-family:${TACTICAL};font-size:12px;font-weight:700;letter-spacing:0.26em;line-height:1.4;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
}

function headline(text: string, color: string, size: number) {
  return `<h2 class="usam-h2" style="margin:0;font-family:${DISPLAY};font-size:${size}px;font-weight:700;line-height:1.08;letter-spacing:-0.01em;color:${color};">${escapeHtml(text)}</h2>`;
}

function paragraph(text: string, color = BODY_TEXT) {
  return `<p style="margin:0 0 16px;font-family:${BODY};font-size:16px;line-height:1.7;color:${color};">${escapeHtml(text)}</p>`;
}

function goldRule(width = 64) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="${width}" height="3" bgcolor="${GOLD}" style="width:${width}px;height:3px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Table-based button so Outlook keeps the fill behind the label. */
function button(label: string, href: string, options: { solid: boolean }) {
  const background = options.solid ? GOLD : "transparent";
  const text = options.solid ? BLACK : GOLD;
  const border = options.solid ? GOLD : `${GOLD_DEEP}`;

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
    <tr>
      <td bgcolor="${background}" style="background-color:${background};border:1px solid ${border};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${TACTICAL};font-size:13px;font-weight:700;letter-spacing:0.2em;line-height:1;text-transform:uppercase;text-decoration:none;color:${text};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function photo(src: string, alt: string, height: number) {
  return `<img src="${escapeHtml(src)}" width="${CONTENT_WIDTH}" height="${height}" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:${CONTENT_WIDTH}px;height:auto;border:0;outline:none;text-decoration:none;" />`;
}

function caption(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td bgcolor="${BLACK}" style="background-color:${BLACK};padding:14px 28px;font-family:${TACTICAL};font-size:11px;font-weight:700;letter-spacing:0.22em;line-height:1.6;text-transform:uppercase;color:${GOLD};">${escapeHtml(text)}</td>
    </tr>
  </table>`;
}

/**
 * One numbered row of the covering / model / tool framework. The number is the
 * loudest thing in the row, the way the site sets 01 / 02 / 03.
 */
function frameworkRow(input: { body: string; number: string; role: string; title: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td class="usam-number" style="padding:0 0 6px;font-family:${DISPLAY};font-size:46px;font-weight:700;line-height:1;color:${GOLD};">${escapeHtml(input.number)}</td>
    </tr>
    <tr>
      <td class="usam-framework-title" style="padding:0 0 6px;font-family:${DISPLAY};font-size:28px;font-weight:700;line-height:1.12;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(input.title)}</td>
    </tr>
    <tr>
      <td style="padding:0 0 14px;font-family:${TACTICAL};font-size:12px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${GOLD};">${escapeHtml(input.role)}</td>
    </tr>
    <tr>
      <td style="padding:0;font-family:${BODY};font-size:15px;line-height:1.75;color:${DARK_MUTED};">${escapeHtml(input.body)}</td>
    </tr>
  </table>`;
}

/** Review-only band. Never rendered in the donor send. */
function reviewNote(title: string, lines: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td bgcolor="#FFF6DD" style="background-color:#FFF6DD;border:1px dashed ${GOLD_DEEP};padding:16px 18px;">
        <p style="margin:0 0 8px;font-family:${TACTICAL};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${GOLD_DEEP};">Founder review note: ${escapeHtml(title)}</p>
        ${lines.map((line) => `<p style="margin:0 0 4px;font-family:${BODY};font-size:13px;line-height:1.6;color:#6B5A22;">${escapeHtml(line)}</p>`).join("")}
      </td>
    </tr>
  </table>`;
}

export function renderQ3FieldUpdateEmail(input: RenderQ3FieldUpdateInput) {
  const {
    archiveUrl,
    assetBaseUrl,
    firstName,
    links,
    preferencesUrl,
    showPlaceholderNotes,
    unsubscribeUrl,
  } = input;
  const greeting = firstName.trim() || "friend";
  const asset = (name: string) => `${assetBaseUrl.replace(/\/+$/, "")}/${name}`;
  const preheader = "A new website, new tables, new men gathering, and new people joining the mission.";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" content="" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml("USA Missionaries field update")}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&amp;family=Oswald:wght@500;700&amp;family=Rajdhani:wght@600;700&amp;display=swap" rel="stylesheet" />
    <style type="text/css">
      body { margin:0 !important; padding:0 !important; width:100% !important; }
      img { -ms-interpolation-mode:bicubic; }
      a { text-decoration:none; }
      @media only screen and (max-width:620px) {
        .usam-pad { padding-left:22px !important; padding-right:22px !important; }
        .usam-h1 { font-size:38px !important; }
        .usam-h2 { font-size:28px !important; }
        .usam-number { font-size:38px !important; }
        .usam-framework-title { font-size:24px !important; }
        .usam-takeaway { font-size:20px !important; }
        .usam-takeaway-sub { font-size:11px !important; letter-spacing:0.14em !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#EDEAE4;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#EDEAE4;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="${CONTENT_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:${CONTENT_WIDTH}px;">

            ${block(BLACK, "20px 28px", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="font-family:${TACTICAL};font-size:14px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#FFFFFF;">USA Missionaries</td>
                  <td align="right" style="font-family:${TACTICAL};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${GOLD};">Q2 / Q3 2026</td>
                </tr>
              </table>
            `)}

            ${block(BLACK, "46px 28px 52px", `
              ${eyebrow("Field update. September 2026.", GOLD)}
              <h1 class="usam-h1" style="margin:0 0 22px;font-family:${DISPLAY};font-size:46px;font-weight:700;line-height:1.04;letter-spacing:-0.015em;color:#FFFFFF;">There's a Lot We've Been Wanting to Share</h1>
              ${goldRule(72)}
              <p style="margin:22px 0 0;font-family:${BODY};font-size:16px;line-height:1.7;color:${DARK_MUTED};">Two quarters in one update. New tables, new men gathering, a new website, and new people joining the mission.</p>
            `)}

            ${block(PAPER, "36px 28px 30px", `
              ${paragraph(`Hi ${greeting},`)}
              ${paragraph("It has been a little while since our last update, but that certainly does not mean things have been quiet.")}
              ${paragraph("Over the last several months, Brooke and I have watched God open doors, bring incredible people into our lives, deepen discipleship relationships, and give us a lot more clarity about what USA Missionaries is becoming.")}
              ${paragraph("Some of that happened around kitchen tables. Some of it happened through the men's groups we are walking with. Some of it happened behind a computer, building tools we believe help people make disciples on purpose. And some of it happened through new relationships that are starting to carry USA Missionaries beyond Minnesota.")}
              ${paragraph("One of the biggest things we have been working on is simply making the vision clearer.")}
            `)}

            ${bleed(PAPER, photo(asset("kitchen-table-01.jpg"), "Four friends around a kitchen table with an open Bible and a USA Missionaries binder", 360))}
            ${bleed(PAPER, caption("Real homes. Real tables. Real conversations."))}

            ${block(PAPER, "36px 28px 30px", `
              ${eyebrow("The question we get most", GOLD_DEEP)}
              ${headline("So, what exactly is USA Missionaries?", INK, 34)}
              <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
              ${paragraph("We get this question a lot, and the new website finally gives us a much better way to answer it. Three things, working together.")}
            `)}

            ${block(BLACK, "40px 28px 12px", `
              ${frameworkRow({
                body: "USA Missionaries exists to locate, train, support, and deploy disciple makers across America. It is the larger mission and covering that lets missionaries, ministries, and initiatives work together toward one goal.",
                number: "01",
                role: "The Covering",
                title: "USA Missionaries",
              })}
            `)}
            ${block(BLACK, "0 28px 12px", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td height="1" bgcolor="#2A2A2A" style="height:1px;background-color:#2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table>
              <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
              ${frameworkRow({
                body: "This is what disciple making looks like on the ground. Real people. Real homes. Real conversations. We gather around ordinary tables, open Scripture, pray together, practice obedience to Jesus, walk through real life, and help people learn to do the same with someone else. Gather. Learn. Confess. Encourage. Multiply.",
                number: "02",
                role: "The Model",
                title: "Kitchen Table Gospel",
              })}
            `)}
            ${block(BLACK, "0 28px 40px", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td height="1" bgcolor="#2A2A2A" style="height:1px;background-color:#2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table>
              <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
              ${frameworkRow({
                body: "DOS helps us actually follow through. It gives missionaries and disciple makers a simple way to remember people, pray on purpose, lead groups, create accountability, track the next steps that matter, and help discipleship multiply without people getting lost along the way.",
                number: "03",
                role: "The Tool",
                title: "Discipleship Operating System",
              })}
            `)}

            ${block(BLACK, "0 28px 44px", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="border-top:2px solid ${GOLD};border-bottom:2px solid ${GOLD};padding:26px 4px;" align="center">
                    <p class="usam-takeaway" style="margin:0 0 10px;font-family:${DISPLAY};font-size:24px;font-weight:700;line-height:1.25;text-transform:uppercase;color:#FFFFFF;">The Covering. The Model. The Tool.</p>
                    <p class="usam-takeaway-sub" style="margin:0;font-family:${TACTICAL};font-size:13px;font-weight:700;letter-spacing:0.24em;line-height:1.6;text-transform:uppercase;color:${GOLD};">Make disciples who make disciples.</p>
                  </td>
                </tr>
              </table>
            `)}

            ${bleed(BLACK, photo(asset("kitchen-table-02.jpg"), "Two couples sharing coffee around a kitchen table with a USA Missionaries binder open between them", 360))}
            ${bleed(BLACK, caption("Gather. Learn. Confess. Encourage. Multiply."))}

            ${block(PAPER, "40px 28px 26px", `
              ${eyebrow("The new site", GOLD_DEEP)}
              ${headline("Come see what we've been building.", INK, 34)}
              <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
              ${paragraph("We overhauled the USA Missionaries website to tell this story much better than we can in an email. It gives a clearer picture of the mission, why America is a mission field, what disciple making can look like, what we are building, and stories of what God is doing.")}
            `)}

            ${block(PAPER, "0 28px 0", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #C9C3B8;">
                <tr>
                  <td bgcolor="#1B1B1B" style="background-color:#1B1B1B;padding:10px 14px;font-family:${TACTICAL};font-size:11px;font-weight:600;letter-spacing:0.14em;color:#8A8A8A;">usamissionaries.org</td>
                </tr>
                <tr>
                  <td style="padding:0;font-size:0;line-height:0;">
                    <a href="${escapeHtml(links.siteUrl)}"><img src="${escapeHtml(asset("website-hero.jpg"))}" width="638" height="336" alt="The USA Missionaries homepage reading The Mission Is Active" style="display:block;width:100%;max-width:638px;height:auto;border:0;outline:none;" /></a>
                  </td>
                </tr>
              </table>
            `)}

            ${block(PAPER, "24px 28px 36px", `
              ${button("Explore USA Missionaries", links.siteUrl, { solid: true })}
              <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
              <p style="margin:0;font-family:${TACTICAL};font-size:12px;font-weight:700;letter-spacing:0.14em;line-height:2;text-transform:uppercase;color:${MUTED_TEXT};">
                <a href="${escapeHtml(links.kitchenTableUrl)}" style="color:${GOLD_DEEP};text-decoration:none;">Kitchen Table Gospel</a>
                &nbsp;&nbsp;/&nbsp;&nbsp;
                <a href="${escapeHtml(links.dosUrl)}" style="color:${GOLD_DEEP};text-decoration:none;">Discipleship Operating System</a>
                &nbsp;&nbsp;/&nbsp;&nbsp;
                <a href="${escapeHtml(links.briefingUrl)}" style="color:${GOLD_DEEP};text-decoration:none;">Field Reports</a>
              </p>
            `)}

            ${block("#F2EFE9", "38px 28px 24px", `
              ${eyebrow("On the ground", GOLD_DEEP)}
              ${headline("Real tables. Real relationships.", INK, 34)}
            `)}

            ${bleed("#F2EFE9", photo(asset("mens-group.jpg"), "Six men from a USA Missionaries men's group gathered outside a church", 360))}

            ${block("#F2EFE9", "28px 28px 38px", `
              ${paragraph("The men's groups continue to be one of the most encouraging things we are part of right now.")}
              ${paragraph("Men are gathering consistently, opening Scripture together, praying, building accountability, and walking through real life with one another.")}
              ${paragraph("We have also kept developing 2three2, centered on the words of 2 Timothy 2:22.")}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 22px;">
                <tr>
                  <td style="border-left:3px solid ${GOLD};padding:4px 0 4px 16px;font-family:${DISPLAY};font-size:22px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${INK};">Run. Pray. Pursue.</td>
                </tr>
              </table>
              ${paragraph("There is a lot more to share here, and we will be highlighting some of these stories in the months ahead.")}
              ${button("See 2three2", links.groupUrl, { solid: false })}
            `)}

            ${block(PAPER, "40px 28px 22px", `
              ${eyebrow("The team is growing", GOLD_DEEP)}
              ${headline("New missionaries are joining us.", INK, 34)}
              <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
              ${paragraph("By the time this update reaches you, we expect to be able to introduce new missionaries joining USA Missionaries. We are keeping it short here on purpose, so you can go meet them.")}
            `)}

            ${block(PAPER, "0 28px 30px", `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td bgcolor="#EDE8DF" align="center" style="background-color:#EDE8DF;border:1px dashed #B9AE95;padding:52px 24px;">
                    <p style="margin:0 0 10px;font-family:${TACTICAL};font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${GOLD_DEEP};">Reserved</p>
                    <p style="margin:0 0 8px;font-family:${DISPLAY};font-size:24px;font-weight:700;line-height:1.2;text-transform:uppercase;color:${INK};">Team announcement</p>
                    <p style="margin:0;font-family:${BODY};font-size:14px;line-height:1.7;color:${MUTED_TEXT};">Photo, names, and location go here before the final send.</p>
                  </td>
                </tr>
              </table>
              ${showPlaceholderNotes
                ? `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>${reviewNote("Team announcement", [
                  "Nothing here is invented. No names, locations, bios, quotes, or photos have been written for this section.",
                  "Supply for each couple: one photo, names, location, one or two sentences on their calling and background, and an optional short quote.",
                  "Keep it short. The point is to make people click through to Meet the Team.",
                ])}`
                : ""}
            `)}

            ${block(PAPER, "0 28px 40px", button("Meet the team", links.missionariesUrl, { solid: false }))}

            ${block("#F2EFE9", "38px 28px 34px", `
              ${headline("We believe this is only the beginning.", INK, 30)}
              <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
              ${paragraph("God continues to open doors with individuals, couples, families, churches, and leaders.")}
              ${paragraph("Many of those stories are personal, so we cannot share every detail publicly. But what we can say is that we are seeing God move, relationships deepen, and opportunities continue to grow.")}
              ${paragraph("Thank you for praying for us, encouraging us, and giving to help make this possible.")}
              ${paragraph("There is still a lot of work ahead, and we are incredibly grateful to have you in it with us.")}
              ${paragraph("More stories are coming soon.")}
              <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
              <p style="margin:0 0 4px;font-family:${DISPLAY};font-size:24px;font-weight:700;line-height:1.2;color:${INK};">Ryan &amp; Brooke</p>
              <p style="margin:0 0 26px;font-family:${TACTICAL};font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${GOLD_DEEP};">USA Missionaries</p>
              ${button("Follow the mission", links.siteUrl, { solid: true })}
            `)}

            ${block(BLACK, "30px 28px 34px", `
              <p style="margin:0 0 6px;font-family:${TACTICAL};font-size:13px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#FFFFFF;">USA Missionaries</p>
              <p style="margin:0 0 18px;font-family:${BODY};font-size:13px;line-height:1.7;color:#8F8B84;">You are receiving this because you subscribed to USA Missionaries updates.</p>
              <p style="margin:0 0 18px;font-family:${BODY};font-size:13px;line-height:2;color:#8F8B84;">
                <a href="${escapeHtml(archiveUrl)}" style="color:${GOLD};text-decoration:underline;">Read online</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${escapeHtml(preferencesUrl)}" style="color:${GOLD};text-decoration:underline;">Manage preferences</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:${GOLD};text-decoration:underline;">Unsubscribe</a>
              </p>
              <p style="margin:0;font-family:${BODY};font-size:12px;line-height:1.7;color:#6E6A64;">[POSTAL ADDRESS]</p>
              ${showPlaceholderNotes
                ? `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>${reviewNote("Postal address", [
                  "CAN-SPAM requires a valid physical mailing address in every commercial or fundraising email.",
                  "No address has been invented. Supply the USA Missionaries mailing address and it replaces the [POSTAL ADDRESS] line.",
                  "This has to be resolved before the donor send on September 15.",
                ])}`
                : ""}
            `)}

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "USA MISSIONARIES",
    "Q2 / Q3 2026 FIELD UPDATE",
    "",
    "THERE'S A LOT WE'VE BEEN WANTING TO SHARE",
    "",
    `Hi ${greeting},`,
    "",
    "It has been a little while since our last update, but that certainly does not mean things have been quiet.",
    "",
    "Over the last several months, Brooke and I have watched God open doors, bring incredible people into our lives, deepen discipleship relationships, and give us a lot more clarity about what USA Missionaries is becoming.",
    "",
    "Some of that happened around kitchen tables. Some of it happened through the men's groups we are walking with. Some of it happened behind a computer, building tools we believe help people make disciples on purpose. And some of it happened through new relationships that are starting to carry USA Missionaries beyond Minnesota.",
    "",
    "One of the biggest things we have been working on is simply making the vision clearer.",
    "",
    "SO, WHAT EXACTLY IS USA MISSIONARIES?",
    "",
    "01. USA MISSIONARIES. THE COVERING.",
    "USA Missionaries exists to locate, train, support, and deploy disciple makers across America. It is the larger mission and covering that lets missionaries, ministries, and initiatives work together toward one goal.",
    "",
    "02. KITCHEN TABLE GOSPEL. THE MODEL.",
    "This is what disciple making looks like on the ground. Real people. Real homes. Real conversations. We gather around ordinary tables, open Scripture, pray together, practice obedience to Jesus, walk through real life, and help people learn to do the same with someone else. Gather. Learn. Confess. Encourage. Multiply.",
    "",
    "03. DISCIPLESHIP OPERATING SYSTEM. THE TOOL.",
    "DOS helps us actually follow through. It gives missionaries and disciple makers a simple way to remember people, pray on purpose, lead groups, create accountability, track the next steps that matter, and help discipleship multiply without people getting lost along the way.",
    "",
    "The Covering. The Model. The Tool.",
    "Make disciples who make disciples.",
    "",
    "COME SEE WHAT WE'VE BEEN BUILDING.",
    "We overhauled the USA Missionaries website to tell this story much better than we can in an email. It gives a clearer picture of the mission, why America is a mission field, what disciple making can look like, what we are building, and stories of what God is doing.",
    "",
    `Explore USA Missionaries: ${links.siteUrl}`,
    `Kitchen Table Gospel: ${links.kitchenTableUrl}`,
    `Discipleship Operating System: ${links.dosUrl}`,
    `Field Reports: ${links.briefingUrl}`,
    "",
    "REAL TABLES. REAL RELATIONSHIPS.",
    "The men's groups continue to be one of the most encouraging things we are part of right now.",
    "Men are gathering consistently, opening Scripture together, praying, building accountability, and walking through real life with one another.",
    "We have also kept developing 2three2, centered on the words of 2 Timothy 2:22.",
    "Run. Pray. Pursue.",
    "There is a lot more to share here, and we will be highlighting some of these stories in the months ahead.",
    `See 2three2: ${links.groupUrl}`,
    "",
    "THE TEAM IS GROWING.",
    "By the time this update reaches you, we expect to be able to introduce new missionaries joining USA Missionaries. We are keeping it short here on purpose, so you can go meet them.",
    "[RESERVED: team announcement. Photo, names, and location go here before the final send.]",
    `Meet the team: ${links.missionariesUrl}`,
    "",
    "WE BELIEVE THIS IS ONLY THE BEGINNING.",
    "God continues to open doors with individuals, couples, families, churches, and leaders.",
    "Many of those stories are personal, so we cannot share every detail publicly. But what we can say is that we are seeing God move, relationships deepen, and opportunities continue to grow.",
    "Thank you for praying for us, encouraging us, and giving to help make this possible.",
    "There is still a lot of work ahead, and we are incredibly grateful to have you in it with us.",
    "More stories are coming soon.",
    "",
    "Ryan & Brooke",
    "USA Missionaries",
    `Follow the mission: ${links.siteUrl}`,
    "",
    "---",
    "You are receiving this because you subscribed to USA Missionaries updates.",
    `Read online: ${archiveUrl}`,
    `Manage preferences: ${preferencesUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
    "[POSTAL ADDRESS]",
  ].join("\n");

  return { html, preheader, text };
}
