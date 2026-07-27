# Communications B — Newsletter UX, Template, Archive, and Preferences

Design spec for [USA-46](https://linear.app/usa-missionaries/issue/USA-46). This is the presentation-layer design for [USA-44](https://linear.app/usa-missionaries/issue/USA-44) (Communications Phase 1: Resend, subscribers, newsletter, archive). It is a **design deliverable, not an implementation** — no Resend, API route, Supabase table, or global layout file is touched by this ticket. Everything here is copy, component specs, and static previews for engineering to build once [USA-45](https://linear.app/usa-missionaries/issue/USA-45) (architecture and data model audit) lands.

Static, click-through previews for every screen described below live in `docs/previews/newsletter/`. See [Previews](#previews) for how to open them.

## Dependency on USA-45

USA-45 is still in progress at the time of this writeup and owns the authoritative answers for: exact table names, Resend event/webhook model, tokenized link format (signing, expiry, rotation), and seed strategy for the two Phase 1 subscribers (Ryan Fox, Brooke Fox). This document proposes route names and a token pattern that follow the repo's existing conventions (see `app/testimony/[token]`, `app/review/[token]`) so engineering has a concrete target, but **treat every route, table, and token name below as a proposal to reconcile against USA-45's findings, not a locked contract.**

## Brand constraints this design follows

Pulled from `AGENTS.md` and the existing site (`app/globals.css`, `app/layout.tsx`, `components/SiteFooter.tsx`):

- Fonts: Inter (body/UI), Oswald (major headlines only), Rajdhani (uppercase labels, buttons, small tracking-heavy text). No new fonts.
- Palette: `--usam-black #0D0D0D`, `--usam-white #FFFFFF`, `--usam-gold #C2A14E`, `--usam-success #0F9D76`.
- Buttons: solid gold primary (dark text, uppercase, wide tracking), bordered white/transparent secondary, subtle tertiary — one primary CTA per screen.
- Public pages stay simple and invitational, never dashboard-style. Admin stays inside the existing `AdminShell` pattern.
- Site is a dark-themed brand. Email is its own medium — see [Email is not a reskin of the dark site](#email-is-not-a-reskin-of-the-dark-site) for why the email template is light-first.

---

## 1. Page & Email Architecture

### Public routes (new)

| Route | Purpose | Auth |
| --- | --- | --- |
| `/newsletter` | Archive index — reverse-chronological list of published issues | Public |
| `/newsletter/[slug]` | Single issue detail (the web version of a sent email) | Public |
| `/newsletter/preferences/[token]` | Preference management (topics/frequency, resubscribe) | Signed token, no login |
| `/newsletter/unsubscribe/[token]` | One-click unsubscribe confirmation | Signed token, no login |

These follow the existing tokenized-public-link convention already used by `/review/[token]` and `/testimony/[token]`: `robots: { index: false, follow: false }`, `dynamic = "force-dynamic"`, no global nav, a minimal self-contained page shell (not the marketing chrome used on `/`, `/missionaries`, etc.).

### Subscribe surface (not a new route)

The subscribe form is a **component**, not a page: `NewsletterSubscribeForm`. It's embeddable in:
- The `/newsletter` archive index (top of page).
- `SiteFooter` / `RouteAwareSiteFooter` — **recommended for a later ticket**, not this one. USA-46 explicitly excludes shared-layout edits, so this design only specifies the component; wiring it into the shared footer is a follow-up PR against USA-44/USA-45's routes, done outside this ticket.
- Any missionary or campaign page that wants an inline subscribe block, via the same component.

### Admin (recommendation only, per scope)

`/admin/subscribers` — see [§6 Subscriber Admin UX Recommendations](#6-subscriber-admin-ux-recommendations). No admin code is added by this ticket.

### Email architecture

One responsive HTML email template (`docs/previews/newsletter/email-template.html`) with these regions, top to bottom:

1. Preheader (hidden, sets inbox preview text)
2. Wordmark header (logo + "USA Missionaries" lockup, links to `usamissionaries.org`)
3. Issue eyebrow ("Newsletter — Issue N · Month Year")
4. Headline + optional hero image
5. Lead paragraph
6. 1–3 content blocks (image + heading + body + optional text link), separated by hairline rule
7. Primary CTA button (single, gold)
8. Sign-off
9. Footer: secondary links, physical mailing address, preference-center + unsubscribe links, copyright

Each published issue has exactly one canonical piece of content that renders as both the email (via Resend) and the archive detail page (`/newsletter/[slug]`) — same copy, two renderers. This is a modeling note for USA-45, not something this ticket builds.

---

## 2. Newsletter Email Template

Preview: `docs/previews/newsletter/email-template.html` (open directly in a browser; resize the window to see the mobile breakpoint, or use the print/device toolbar).

### Email is not a reskin of the dark site

The public site is intentionally dark (`#0D0D0D` background). Email is not: dark-background HTML email has weak, inconsistent support (Gmail, Outlook desktop, and many Android clients will not honor a dark `<body>` background, and forced dark-mode re-inversion in Gmail/Outlook mobile can wreck a dark design that wasn't built for it). The template is **light-first** — white/near-white surface, `#0D0D0D` body text, `#C2A14E` gold accents and CTA — matching the brand palette without fighting email dark-mode engines. Section [Dark mode behavior](#dark-mode-behavior) below covers how it still respects a reader's dark-mode preference gracefully.

### Structure (email-safe HTML)

- Outer table, `role="presentation"`, `width="100%"`, background `#F4F1EA` (warm off-white, not stark white).
- Inner content table, fixed `width="600"` with a fluid `max-width: 100%"` wrapper div for mobile, background `#FFFFFF`.
- All layout via nested `<table>`/`<tr>`/`<td>`, no CSS grid/flexbox (Outlook desktop uses Word's rendering engine and ignores both).
- All styling inline (`style="..."`) plus a `<style>` block for `@media` rules only, since inline styles can't express breakpoints or `prefers-color-scheme`.
- Images: real `width`/`height` attributes set, `max-width: 100%; height: auto;` in inline style, `alt` text on every image, safe to strip (layout doesn't collapse if images are blocked — this is the default state in most inboxes).

### Typography (email-safe fallback stack)

Web fonts are unreliable in email (Outlook and Gmail apps largely ignore `@font-face`/Google Fonts links). Use system fallbacks that approximate the brand pairing instead of trying to load Oswald/Rajdhani/Inter:

- Headline: `Georgia, 'Times New Roman', serif` — deliberately **not** used; see note below.
- Actually: this brand's headline font (Oswald) is a bold sans, not a serif. To stay faithful without web-font risk, both headline and body use a **system sans stack**: `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. Headline weight 700, body weight 400. This keeps the brand's "bold sans headline over lighter sans body" hierarchy even where Oswald itself won't render.
- Do not attempt to load Oswald/Rajdhani via `<link>` or `@import` in the email — most clients strip it and the fallback stack above already carries the hierarchy.
- Sizes: preheader 1px (hidden), eyebrow 12px uppercase letter-spacing 0.08em, headline 26px/32px line-height, body 16px/24px, footer 12px/18px. Nothing under 12px (accessibility floor for email body copy).
- Minimum tap target for the CTA button: 44px height.

### Color & hierarchy

- Body text `#1A1A1A` on `#FFFFFF` (not pure black-on-white; softer, matches brand's near-black).
- Eyebrow / metadata: `#8A7B4E` (a muted gold, readable at small size — full-saturation `#C2A14E` fails contrast at 12px on white).
- CTA button: solid `#C2A14E` background, `#0D0D0D` text, 700 weight, uppercase, letter-spacing, generous padding (16px/32px), rounded 4px. Bulletproof button pattern (table cell with `bgcolor`, not just CSS background) so it renders in Outlook.
- Hairline rule between content blocks: `#E5E0D3`.
- Exactly one primary CTA button per email. Additional links (e.g. "Read more") render as plain gold-underlined text links, not buttons — this mirrors the site's "one primary CTA" button-hierarchy rule.

### Footer / compliance block (required, every send)

- Organization legal name + physical mailing address (CAN-SPAM requirement for any commercial/bulk email — applies here since this is a recurring broadcast newsletter). Placeholder until USA-45 confirms the address of record:
  `USA Missionaries · [street address], [city, state ZIP]`
- "Manage preferences" and "Unsubscribe" links, both pointing at the tokenized routes above. Unsubscribe must be a single visible link (not buried in fine print) and must not require login.
- One line restating why they're receiving this: "You're receiving this because you subscribed to updates from USA Missionaries."
- Copyright line, same phrasing as `SiteFooter.tsx`'s existing copyright line, adapted: `© 2026 USA Missionaries. All rights reserved. USA Missionaries is a registered 501(c)(3) nonprofit organization.`

### Dark mode behavior

Email dark-mode support is inconsistent and client-controlled — the template can request specific behavior but Outlook.com, some Android clients, and iOS Mail all handle it differently. The graceful approach:

1. Meta tags declare support: `<meta name="color-scheme" content="light dark">` and `<meta name="supported-color-schemes" content="light dark">`.
2. A `@media (prefers-color-scheme: dark)` block **only softens** the palette — it does not attempt a full dark redesign. Background steps down from `#F4F1EA`/`#FFFFFF` to `#1A1A1A`/`#0D0D0D` (this now legitimately reuses the site's `--usam-black`), body text lightens to `#EDEAE2`, gold CTA stays `#C2A14E` (already high-contrast against dark), hairline rule lightens to `#33302A`.
3. Logo: ship a single logo asset with adequate padding/mat so it reads on both a light and a dark cell background (a logo built for light-only can disappear if a client forces dark inversion). If the current PNG (`public/brand/logo/usam-website-logo.png`) is dark-text-on-transparent, engineering will need a light/knockout variant for the email — flagged as a required asset, not something this ticket produces.
4. No dark-mode-only content changes, no `!important`-only fixes that fight Gmail's auto-dark image/color re-writing — targeting `prefers-color-scheme` directly is the more reliable path and is what the preview file implements.

### Responsive behavior

- `@media (max-width: 600px)`: content table becomes fluid `width: 100% !important`, side padding drops from 40px to 20px, headline drops from 26px to 22px, CTA button becomes full-width, multi-column blocks (if any) stack to single column.
- No horizontal scrolling at any width — matches the site-wide mobile rule in `AGENTS.md`.

---

## 3. Public Newsletter Archive

Previews: `docs/previews/newsletter/archive-index.html`, `docs/previews/newsletter/archive-detail.html`.

### Archive index (`/newsletter`)

- Page header: eyebrow "Newsletter", headline "Updates from the field", one-line subhead. No hero image required.
- `NewsletterSubscribeForm` (compact variant) directly under the header — this is the highest-intent placement for a new visitor.
- Reverse-chronological list of published issues as compact cards: issue eyebrow ("Issue 4 · July 2026"), headline, one-line excerpt, "Read" link. No thumbnails required for v1 (optional polish, see §7).
- Empty state (pre-launch, zero published issues): one sentence + the subscribe form, no placeholder cards. ("New issues are on the way. Subscribe to get the first one.")
- Pagination or "Load more" once issue count passes ~12 — not needed for Phase 1's expected volume, listed as optional polish.

### Issue detail (`/newsletter/[slug]`)

- Same content model as the email (see §1), rendered as a normal web page: eyebrow, headline, hero image (optional), body blocks, single CTA.
- Back link to `/newsletter` at the top.
- Footer of the page includes the same compact subscribe form for readers who arrived from a shared link and aren't yet subscribed — do not show it if the visitor already has a valid preferences-token cookie/session (avoid asking existing subscribers to resubscribe). If USA-45 doesn't have a lightweight way to detect an existing subscriber on a public page, default to always showing the form — a subscribed visitor sees no harm in a form they can ignore.
- No comments, no social share bar in v1 (optional polish, see §7).
- `noindex` is **not** set here — unlike the tokenized routes, the archive is meant to be publicly discoverable and linkable.

---

## 4. Subscribe Form (`NewsletterSubscribeForm`)

Preview: `docs/previews/newsletter/subscribe-states.html` (all states rendered together for review).

One component, two size variants (`default` full-width block, `compact` inline for footer/sidebar placement), following the existing `PublicForm`/form-component conventions in `components/forms/`.

### Fields

- Email (required, the only required field for Phase 1 — matches USA-44's minimal two-seeded-subscriber scope; do not add name/topics fields yet, that's preference-center territory post-subscribe).
- Implicit consent line under the field (not a separate checkbox — reduces friction; matches `AGENTS.md`'s "forms must feel safe and voluntary, do not require more than necessary"): "By subscribing, you agree to receive occasional updates from USA Missionaries. Unsubscribe anytime."

### States

| State | Copy | Visual |
| --- | --- | --- |
| Idle | Placeholder "you@example.com", button "Subscribe" | Standard input + gold primary button |
| Loading | Button becomes "Subscribing…", disabled | Spinner in button, input disabled |
| Success | "You're subscribed. Check your inbox for a confirmation." | Field replaced by a compact success message (green `--usam-success` accent), no leftover empty input |
| Already subscribed | "You're already on the list." | Same success layout, neutral (not an error) tone — being already subscribed is not a failure state |
| Error (invalid email) | Inline "Enter a valid email address." | Red-bordered input, message below field, form stays editable |
| Error (server/network) | "Something went wrong. Try again in a moment." | Same treatment as invalid email, generic copy since we don't want to leak backend detail |

Do not render a raw server error string to the visitor under any circumstance.

---

## 5. Preference Management & Unsubscribe

Preview: `docs/previews/newsletter/preferences-unsubscribe.html`.

### `/newsletter/preferences/[token]`

- Minimal page shell, no global nav/footer (matches `/review/[token]`, `/testimony/[token]`).
- Shows the subscribed email address (masked is unnecessary — it's the subscriber's own token-authenticated view of their own record, not a public page) and current status pill ("Subscribed").
- Single control for Phase 1: "Unsubscribe from all newsletters" button (secondary/outlined, not styled as a destructive-red button — this is a normal, safe action, not an error state). Topic/frequency granularity is explicitly **out of scope for Phase 1** per USA-44 — the page is intentionally a single-purpose confirmation screen, not a settings dashboard. Flag the multi-topic preference center as a Phase 2 idea, not something to stub out now.
- No login required, no password, no account creation — token in the URL is the entire auth model, consistent with the rest of the tokenized-link pattern in this repo.
- Invalid/expired token state: calm explanation + a fresh `NewsletterSubscribeForm` ("This link has expired. Enter your email to manage your subscription.") rather than a bare 404.

### `/newsletter/unsubscribe/[token]`

- One-click: token in the URL is sufficient to unsubscribe on page load (no second confirm click) — this is what CAN-SPAM and mailbox providers expect from a one-click List-Unsubscribe flow, and it's the safer default against accidental multi-click complaints.
- Confirmation state: "You've been unsubscribed. You won't receive future newsletters." with a single "Resubscribe" secondary action for accidental clicks.
- Same invalid/expired token handling as preferences.
- Both pages log the action for the subscriber-events model USA-45 defines — this ticket doesn't implement that, just assumes it exists as the write target.

---

## 6. Subscriber Admin UX Recommendations

This section is **recommendations only** — no admin UI is built by this ticket, per scope ("Subscriber admin interface UX recommendations," not implementation).

- New module `/admin/subscribers`, added to the existing admin sidebar (same shell as `/admin/partners`, `/admin/support`, etc. — reuse `AdminShell`, don't build a new admin chrome).
- List view: compact rows (email, status pill: Subscribed / Unsubscribed / Bounced, subscribed-since date, last-open date if USA-45's event model tracks opens). No horizontal scroll — same table-responsiveness rules as the rest of Command Center per `AGENTS.md`.
- Row action: "View" opens a detail drawer (not a separate page) with delivery history for that subscriber — reuse the "operational row with detail modal" pattern already established in the admin UI rules.
- Given Phase 1 seeds exactly two subscribers (Ryan Fox, Brooke Fox), the list view should handle an empty/near-empty state gracefully and not assume any minimum row count or paginate prematurely.
- Compose/send flow (creating and sending an issue) is out of scope for this ticket's recommendations — that's a USA-45/USA-44 implementation question (which admin screen authors an issue, whether it reuses `/admin/pages` patterns, etc.) and should be scoped once the data model is final.
- Do not expose subscriber emails or delivery data on any public page or in any public preview — the static previews in this ticket use placeholder data only (`reader@example.com`, fictitious names), never a real address.

---

## 7. Required vs. Optional Polish List

### Required for Phase 1 launch

- Email template: light-first responsive layout, dark-mode media query, bulletproof CTA button, physical address + unsubscribe/preferences links in every send.
- Archive index with subscribe form and empty state.
- Archive issue detail page with back link and subscribe form.
- Subscribe form: idle, loading, success, already-subscribed, invalid-email, and server-error states.
- Preference page: status view + single unsubscribe action + expired-token fallback.
- Unsubscribe page: one-click unsubscribe + resubscribe affordance + expired-token fallback.
- CAN-SPAM-relevant footer content on every email (address, unsubscribe, sender identification).

### Optional polish (defer without blocking launch)

- Archive issue thumbnails/hero images in the index list view.
- Pagination/"Load more" on the archive index (only matters once issue count is large).
- Social share buttons on issue detail pages.
- Multi-topic/frequency preference granularity (Phase 2 — Phase 1 is subscribe/unsubscribe only).
- Read-time estimate or view-count metadata on issues.
- Admin subscriber detail drawer's delivery-history visualization (a simple list is sufficient for launch; charts are polish).
- Animated/transition states on the subscribe form (a plain state swap is sufficient; motion is polish, not requirement).

---

## Previews

All preview files are static, standalone HTML with inline/embedded CSS — no build step, no app wiring, no real data. Open any of them directly in a browser (double-click, or `open docs/previews/newsletter/<file>.html`) and resize the window to check the mobile breakpoint; each file also includes a labeled side-by-side desktop/mobile frame so both sizes are visible without resizing.

- `email-template-source.html` — the actual production-candidate email markup (table-based, inline styles, real `@media` rules for both the 600px→fluid responsive breakpoint and `prefers-color-scheme: dark`). This is the file to hand to engineering/Resend as the starting template.
- `email-template.html` — a preview harness that loads `email-template-source.html` into a 600px-wide iframe and a 375px-wide iframe side by side, so the responsive breakpoint is visible without resizing the browser window (each iframe has its own viewport, so the email's own `@media (max-width: 600px)` rule fires correctly in the narrow frame).
- `archive-index.html` — archive list with populated and empty states (source: `archive-index-source.html`).
- `archive-detail.html` — single issue page (source: `archive-detail-source.html`).
- `subscribe-states.html` — all six form states plus the compact variant (source: `subscribe-states-source.html`).
- `preferences-unsubscribe.html` — preference page, unsubscribe page, and the shared expired-token fallback (source: `preferences-unsubscribe-source.html`).

Every non-email preview follows the same two-file split: a `*-source.html` that's the actual page mockup (open it directly for a normal single-viewport view), and a `*.html` harness that loads the source into fixed-width desktop/mobile iframes for side-by-side review. All copy in the previews matches the copy specified in this document; if they ever drift, this document is the source of truth.
