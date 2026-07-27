# Newsletter Presentation Layer — Design Spec (USA-46)

Status: design/presentation layer only. No Resend, API route, or database
code is included. Everything here runs against local fixture data in
`src/data/newsletter-fixtures.ts` so it can be reviewed in a browser today.

## Dependency note

This issue is scoped to start after USA-45 (architecture and data model
audit) delivers its findings. At the time this work was done, USA-45 was
still in progress with no documents, attachments, or accessible findings —
so the routes, field names, and token scheme below are this design's best
guess, not a confirmed contract. Before USA-47 (Resend/subscriber platform
implementation) starts:

- Reconcile `NewsletterIssue`, `NewsletterPreferenceTopic`, and
  `NewsletterFrequencyOption` in `src/data/newsletter-fixtures.ts` against
  USA-45's actual table/column design. Field names will likely need to
  change; the shapes are meant to be a reasonable starting point, not final.
- Confirm the token scheme for `/newsletter/preferences/[token]` and
  `/newsletter/unsubscribe/[token]` (signed JWT vs. opaque DB token,
  expiry window) — the pages currently treat any non-`invalid`/`expired`
  token as valid, purely for demoing the UI states.
- Confirm the organization's registered physical mailing address for the
  email footer (`DEFAULT_ADDRESS_PLACEHOLDER` in
  `src/lib/email/templates/newsletter-issue.ts`) — CAN-SPAM requires a real
  postal address in every commercial email and a placeholder must not ship.

## Page / email architecture

| Route | Purpose | Status |
|---|---|---|
| `/newsletter` | Public archive index — hero, subscribe form, issue cards | Built (fixture data) |
| `/newsletter/[slug]` | Public issue detail — full web rendering of one issue | Built (fixture data) |
| `/newsletter/preferences/[token]` | Token-gated topic/frequency management | Built (stubbed save) |
| `/newsletter/preferences` | Landing shown when no token present | Built |
| `/newsletter/unsubscribe/[token]` | Token-gated one-click-style unsubscribe with confirm step | Built (stubbed) |
| `/newsletter/unsubscribe` | Landing shown when no token present | Built |
| `/newsletter/preview/email` | Internal, noindex — desktop/mobile, light/dark email preview | Built |
| `/newsletter/preview/admin` | Internal, noindex — clickable admin-list UX mockup, fake data | Built |
| Email template | `src/lib/email/templates/newsletter-issue.ts` — `renderNewsletterIssueEmail(issue, options)` returns a full HTML string | Built |

Nothing here touches `app/layout.tsx`, `PrimaryNav`, `SiteFooter`,
`app/sitemap.ts`, or `app/robots.ts`. Two follow-ups for whoever owns those
files, deliberately left undone by this issue's restrictions:

- Add `/newsletter` to `PrimaryNav`'s `navItems` (or leave it as a
  footer-only/direct-link entry point — product call).
  Both `NewsletterSubscribeForm` and the newsletter pages are the visible
  destination.
- Consider a small subscribe form inside `SiteFooter` once USA-47 wires a
  real endpoint — `NewsletterSubscribeForm`'s `onSubscribe` prop is
  designed to be swapped in without touching its markup.
- Add `/newsletter` and published issue slugs to `app/sitemap.ts` once
  content is real (fixture slugs shouldn't be indexed).

## Component specs

- **`src/lib/email/templates/newsletter-issue.ts`** — `renderNewsletterIssueEmail(issue: NewsletterIssue, options: NewsletterEmailOptions): string`. Table-based, inline-CSS, single-column (600px) email. Takes `links.preferencesUrl`, `links.unsubscribeUrl`, `links.viewInBrowserUrl`, optional `subscriberFirstName`, optional `physicalAddress` override. `previewColorScheme` is preview-tool-only (see below) — never set it for a real send.
- **`components/newsletter/NewsletterSubscribeForm.tsx`** — states: `idle → submitting → success | duplicate | error`. Takes `onSubscribe(email)` (defaults to a stub that resolves `success` after ~700ms) so USA-47 can inject the real call without touching markup. Used on the archive index and issue-detail pages.
- **`components/newsletter/NewsletterPreferencesForm.tsx`** — checkbox list of topics (from `newsletterPreferenceTopics`) + radio list of frequency (from `newsletterFrequencyOptions`), `idle → saving → saved | error`. Save is disabled if zero topics are selected (nudges toward the unsubscribe flow instead of an empty-but-technically-subscribed state).
- **`components/newsletter/NewsletterUnsubscribeCard.tsx`** — explicit confirm step (`confirming → processing → done | error`) rather than firing on page load, so the link is safe against email-client link-scanners/bots that pre-fetch URLs. Offers "Adjust Preferences Instead" as an escape hatch to reduce total unsubscribes.
- **`app/newsletter/NewsletterArchiveCard.tsx`** — issue card: issue number + date eyebrow, title, 3-line clamped excerpt, topic pills, "Read Issue" affordance.

All new UI follows the existing dark/gold USAM public-site system (see
`app/partners/page.tsx`, `components/forms/PublicForm.tsx`,
`app/prayer/PrayerTeamApplicationModal.tsx`) — `bg-usam-black` page
background, Oswald for the one `<h1>`/major headings, Rajdhani for
eyebrows/labels/buttons, `usam-gold` accents, stone-400 body copy. This is
deliberately different from the lighter blue DOS-app visual system used by
`app/guide/[slug]/page.tsx`, since the newsletter is a USAM-wide
communications feature, not a DOS-app feature.

## Copy specs

- **Subject line convention:** `{Issue title} — USA Missionaries` (kept short; avoid spam-trigger words like "free," excessive punctuation, ALL CAPS).
- **Preheader:** the issue's `excerpt` field, ~90–130 characters, shown as hidden preview text in the email (already wired via the `display:none` block at the top of the template).
- **Footer compliance copy (email):** "USA Missionaries is a registered 501(c)(3) nonprofit organization." + physical address — mirrors the tone of the existing `SiteFooter` copyright line without duplicating it verbatim.
- **Unsubscribe confirmation copy:** deliberately offers a downgrade path ("adjust preferences instead of unsubscribing") before the destructive action, and confirms the action was scoped to one address ("`{email}` will no longer receive...") so a shared-inbox unsubscribe doesn't feel ambiguous.
- **Preferences empty-state:** if a subscriber unchecks every topic, the Save button disables and copy points to the unsubscribe flow — there's no supported "subscribed to nothing" state.

## Desktop / mobile previews

Run `npm run dev` and visit:

- `/newsletter/preview/email` — email template at 640px (desktop) and 375px (mobile) width, light and dark forced side by side (real sends adapt automatically via `prefers-color-scheme`; the preview tool forces both so reviewers don't have to toggle OS settings).
- `/newsletter` and `/newsletter/[slug]` (e.g. `/newsletter/2026-07-three-new-tables`) — resize the browser or use device toolbar for mobile.
- `/newsletter/preferences/demo-token` and `/newsletter/preferences/invalid` — valid vs. expired-token states.
- `/newsletter/unsubscribe/demo-token` and `/newsletter/unsubscribe/invalid` — same pattern.
- `/newsletter/preview/admin` — clickable admin-list mockup (search + status filter work; row actions are visual only).

All `/newsletter/preview/*` routes are `noindex` and unlinked from any
public page — they're internal review tools only.

## Dark mode behavior

Email: `prefers-color-scheme` media query + `color-scheme`/
`supported-color-schemes` meta tags. Every text/background pairing sets
both values explicitly on the same element (no relying on transparency or
client auto-invert), which avoids the classic "white text on white
auto-inverted background" bug in Outlook/Gmail dark mode. Verified via the
forced-scheme preview tool above; real dark-mode QA in Apple Mail / Gmail
app / Outlook is still recommended before the first real send.

Web pages: the whole site is dark-first (`bg-usam-black`) already, so no
additional dark-mode work was needed there.

## Admin UX recommendation (subscriber interface)

Scope note: this issue asked for *recommendations*, not a built admin
surface — the real admin page belongs to USA-47, inside `/admin` and
`AdminShell` (see `app/admin/missionary-profiles` for the closest existing
pattern of a filterable admin list + detail actions). A clickable, fake-data
mockup lives at `/newsletter/preview/admin` to make this concrete; below is
the fuller spec.

**List view** — columns: subscriber (name + email), status
(subscribed/unsubscribed/bounced), topics (pills), frequency, joined date,
last-open/click if USA-47's Resend integration exposes engagement data.
Filters: status, topic, frequency, search by name/email. Bulk actions:
export CSV, bulk-resend confirmation (for pending/unconfirmed), bulk topic
reassignment.

**Row actions:** view detail (send history + preference history for that
subscriber), resend confirmation email, manually unsubscribe (with a
required reason note for audit trail — admins removing someone should leave
a trace), restore/resubscribe.

**Required states to design for:** empty list (no subscribers yet), zero
search results, bounced-email banner/badge (surface deliverability
problems instead of silently keeping dead addresses), unconfirmed
double-opt-in state if USA-45 recommends double opt-in.

**Data sensitivity:** subscriber emails are PII — the admin list must stay
behind existing admin auth (`AdminShell`), must never be server-rendered
into a public route, and CSV export should be logged the way other
sensitive exports in this codebase are (check `app/admin/finance/actions.ts`
for the existing export-logging pattern before building).

## Required vs. optional polish

**Required before USA-47 implementation:**
- Confirm real data shapes against USA-45 findings and update
  `newsletter-fixtures.ts` types accordingly.
- Replace `DEFAULT_ADDRESS_PLACEHOLDER` with the confirmed physical
  mailing address.
- Confirm token scheme (expiry, signing) for preference/unsubscribe links.
- Decide whether `/newsletter` gets a `PrimaryNav` entry or stays a
  footer/direct-link destination (needs sign-off from whoever owns
  `PrimaryNav`/`SiteFooter`).
- Real dark-mode QA pass in at least Apple Mail, Gmail (web + app), and
  Outlook, since email dark-mode support is notoriously inconsistent
  outside of the CSS spec.

**Optional / nice-to-have polish (can ship without):**
- Reading-time estimate and/or table of contents on longer issues.
- Social share buttons on the issue-detail page (pattern already exists —
  see `app/guide/[slug]/ShareGuideButton.tsx`).
- Per-topic RSS/archive filtering on `/newsletter`.
- Engagement-based re-permission flow (e.g., "we noticed you haven't
  opened in 6 months — still want these?") once open/click data exists.
- Animated/illustrated hero image per issue (kept plain-text-first here
  deliberately — image-heavy emails have worse deliverability and dark-mode
  behavior, and no real photography pipeline exists yet for issue heroes).

## Files changed

```
docs/newsletter-presentation-layer.md                       (this file)
src/data/newsletter-fixtures.ts                              new
src/lib/email/templates/newsletter-issue.ts                  new
components/newsletter/NewsletterSubscribeForm.tsx             new
components/newsletter/NewsletterPreferencesForm.tsx            new
components/newsletter/NewsletterUnsubscribeCard.tsx            new
app/newsletter/page.tsx                                       new
app/newsletter/NewsletterArchiveCard.tsx                       new
app/newsletter/[slug]/page.tsx                                 new
app/newsletter/preferences/page.tsx                            new
app/newsletter/preferences/[token]/page.tsx                    new
app/newsletter/unsubscribe/page.tsx                            new
app/newsletter/unsubscribe/[token]/page.tsx                    new
app/newsletter/preview/email/page.tsx                          new
app/newsletter/preview/admin/page.tsx                          new
app/newsletter/preview/admin/AdminSubscriberListMockup.tsx     new
```

No existing files were modified.
