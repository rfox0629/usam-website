# Brand metadata and favicons

How the browser and sharing identity works for USA Missionaries, the Discipleship
Operating System (DOS), Kitchen Table Gospel, and Mission of Reconciliation, and
what to change when a brand detail changes.

## Source of truth

| Concern | Owner |
| --- | --- |
| Titles, descriptions, canonical origins, icon paths, manifest paths, theme colors, share-card copy | `src/lib/domain-sites.ts` |
| Turning that config into Next `Metadata` / `Viewport` | `src/lib/domain-metadata.ts` |
| DOS identity for DOS surfaces hosted under `usamissionaries.org` | `src/lib/dos/brand-metadata.ts` |
| Icon and manifest artwork | `scripts/brand/brand-icons.mjs` |
| The share card every link preview uses | `src/lib/share/share-card.tsx` |

Change a brand's colors, mark, name, or share copy in those places only. No page
should hard-code a favicon path, a manifest path, a brand suffix, or a share image.

## Which surface owns which brand

* `app/layout.tsx` — USA Missionaries, the default for every route.
* `app/dos/layout.tsx` — DOS, for everything under `/dos`.
* `app/domain-sites/*/page.tsx` — the DOS and Kitchen Table domain roots.
* `app/join`, `app/review/[token]`, `app/testimony/[token]` — DOS surfaces that
  live outside `/dos` and therefore restate DOS identity.
* `app/admin/layout.tsx` — Command Center. Internal tooling, `noindex`, named for
  the tool rather than the public brand.
* `app/groups/[slug]/*` — tenant group sites. These name their own site, so their
  titles are absolute.

Individual pages should normally override only title, description, and canonical
URL. The share card comes from `opengraph-image.tsx`, not from page metadata.

### Two Next.js title traps

Both cost real debugging time, so they are worth stating plainly:

1. A layout's title template does **not** apply to the page in its own segment.
   `app/dos/page.tsx` sits in the same segment as `app/dos/layout.tsx`, so it has
   to write `title: { absolute: "Portal | DOS" }` itself.
2. A `title.default` is resolved against the *parent* template. A DOS layout
   declaring `default: "DOS | Discipleship Operating System"` produced
   `DOS | Discipleship Operating System | USA Missionaries` on every DOS route
   that set no title of its own.

`buildDomainSiteMetadata` handles both by always pinning `title.absolute`, and
adding `template` on top for layouts so children still get the brand suffix.

A third trap: declaring `openGraph` on a page **replaces** the parent's entire
Open Graph block. That is fine for the image — the `opengraph-image.tsx` file
convention still applies, as long as the page leaves the `images` key out — but
every other field a page cares about (`siteName`, `type`, `url`) has to be
restated.

## Icons

`node scripts/brand/build-favicons.mjs` generates everything under
`public/favicons/<brand>/` from the mark definitions in `brand-icons.mjs`. Never
hand-edit the output.

Per brand: `favicon.svg`, `favicon.ico` (16/32/48), `favicon-16x16.png`,
`favicon-32x32.png`, `favicon-48x48.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`, and the PWA manifest(s).

* Tab and PWA `any` icons sit on **transparency**: USAM and DOS as circular
  emblems, Kitchen Table as a standalone mark with no field behind it.
* `apple-touch-icon.png` and `icon-maskable-512.png` are **full-bleed opaque
  fields** — iOS applies its own squircle, and Android crops maskable icons to a
  circle, so the mark is inset well within the safe area.
* `any` and `maskable` are separate files. They used to be one file declared as
  `"any maskable"`, which meant Android's circular crop clipped the mark.

Marks come from approved brand art, not new logos:

| Brand | Mark | Field |
| --- | --- | --- |
| USAM | the USAM wordmark from `public/brand/logo/usam-website-logo.png`, extracted by `scripts/brand/extract-usam-mark.py` | black disc, USAM gold edge |
| DOS | the concentric-circles mark, reversed to white | DOS blue gradient disc (`#2563EB` → `#1D4ED8`) |
| Kitchen Table | the table mark, standing alone with no disc | transparent; the mark itself is Kitchen Table accent blue (`#378ADD`) |

### Why the Kitchen Table mark is blue

A standalone mark on transparency has to survive both light and dark browser
chrome, and that rules out most of the palette: cream and white vanish on light
chrome, and the warm near-black vanishes on dark chrome. The site's accent blue
(`#378ADD`) is the only Kitchen Table color that holds on both. It is not the DOS
blue — DOS is `#2563EB` on a filled disc, and the two read as different marks
because the shapes differ, which is the same reasoning the Kitchen Table site
itself uses for sharing an accent with DOS.

Apple touch and maskable icons cannot be transparent — iOS composites them onto
black and Android needs a full-bleed field to crop — so those two use a white
field, which keeps them reading as the same background-free mark.

`python3 scripts/brand/build-brand-preview.py` regenerates the review sheets in
`public/favicons/review/` so they always show what is actually shipping.

## Social previews

Every link preview on every surface is the same card, drawn by one renderer:

* `src/lib/share/share-card.tsx` — the card. Warm off-white field, the page name
  set large in Oswald, one restrained gold rule, the brand emblem small in the
  corner, and a lot of empty space. **No photography, ever.** The card this
  replaced was a cropped mountain landscape reused on every page; it said nothing
  about the page it represented and read as stock art in every unfurl.
* `src/lib/share/share-image.ts` — what an `opengraph-image.tsx` route needs, so
  a page's card is six lines rather than a new design.
* `public/fonts/share/oswald-*.ttf` — Oswald, vendored (OFL, license alongside)
  because Satori cannot fetch a webfont at render time. Not a new font: it is the
  display face the site already uses.

### Adding a card to a new page

Nothing, usually. Next applies a segment's `opengraph-image` to that segment and
every segment below it, so `app/opengraph-image.tsx` is the site-wide default and
a new page is already on-brand. Add a file only when the page's own name belongs
on the card:

```tsx
// app/example/opengraph-image.tsx
import { createShareImage, shareImageAlt, shareImageContentType, shareImageSize }
  from "@/src/lib/share/share-image";

const card = { eyebrow: "Section Label", subtitle: "One sentence.", title: "Example" };

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
```

Import the copy from wherever the page already gets it (`remnantCollection`,
`assignmentArticle`) so the card cannot drift from the page. For a card that
depends on the route, write the default export by hand and call `renderShareCard`
— `app/missionaries/[slug]` and `app/guide/[slug]` do this with the person's or
guide's own name.

**The one trap, and it has bitten this repo twice: a page that declares
`openGraph.images` — including setting it to `undefined` — suppresses the file
convention and unfurls with no picture at all.** Leave the key out entirely.
`app/guide/[slug]` and `app/missionaries/[slug]` spread a conditional object for
exactly this reason.

### Brand cards

`/share/<brand>` renders each brand's own card — its name, its tagline, its
`socialImage.eyebrow` — from `domainSites`, prerendered at build. `domainSites`
points every brand's `socialImage.path` there and `buildDomainSiteSocialImage`
makes it absolute.

These are a route rather than `opengraph-image.tsx` files because the brands are
served from their own domains. A file-convention card would be addressed under
`/domain-sites/...` or `/mission-of-reconciliation/...`, and `middleware.ts`
either 404s those paths or bounces them off the host. `/share/<brand>` is plain,
always resolves on the USA Missionaries origin, and every brand host forwards it
there. Unfurlers do not care which host an image comes from.

Reach for `buildDomainSiteSocialImage` only on a surface that cannot use the file
convention — a brand on another domain, or a route served on two hosts
(`/restoration`). Everything on usamissionaries.org should use the file.

The retired photo cards at `/images/share/*` and `/images/usam/groups-share.png`
are gone, and `next.config.js` rewrites those paths to the current card so a link
shared before this change upgrades itself on re-scrape instead of 404ing.

### Groups share cards

Groups are the one place a card is composed per request rather than from a fixed
definition, because each group needs its own name on it:

* `app/groups/share-card.tsx` — resolves the tenant site and hands the group's
  name, rhythm, and tagline to `renderShareCard`. A tenant that sets
  `brand.primaryColor` gets it as the accent; the field stays cream so group
  links and page links unfurl as one family.
* `app/groups/opengraph-image.tsx` — the directory card.
* `app/groups/[slug]/opengraph-image.tsx` — per group: name, tagline, rhythm.

A group that publishes its own artwork (`image_url`) still wins. Both routes fall
back to `APPROVED_PUBLIC_GROUPS`, the same canonical list the group page uses, so
a card cannot disagree with the page when the database is unreachable.

## Route inventory

Which public route gets which card, as of this change. "Default" means the route
declares no image and inherits `app/opengraph-image.tsx`.

| Route | Title / description | Share card |
| --- | --- | --- |
| `/` | root layout (USAM) | default |
| `/support` | page | own card |
| `/system`, `/system/v1`, `/system/v2` | page | own card (`/system`, inherited) |
| `/missionaries` | page | own card |
| `/missionaries/[slug]` | per missionary | hero photo, else their name |
| `/missionaries/[slug]/flyer` | per missionary | hero photo, else inherited |
| `/prayer`, `/prayer/join` | page | own card (`/prayer`, inherited) |
| `/briefing` | page | own card |
| `/briefing/assignments/…` | article | own card |
| `/financialfreedom` | page | own card |
| `/join` | page | own card |
| `/remnant` | page | own card |
| `/guide/[slug]` | per guide | cover art, else the guide title |
| `/groups` | resolved tenant site | generated directory card |
| `/groups/[slug]` | per group | group artwork, else generated |
| `/mission-of-reconciliation` (+ `/stories`, `/stories/[slug]`) | page | MOR brand card |
| `/restoration` | page | MOR brand card |
| `/domain-sites/kitchen-table-gospel` | brand | KTG brand card |
| `/domain-sites/discipleship-operating-system` | brand | DOS brand card |
| `/dos/**` | DOS brand metadata | DOS brand card |

Everything else — `/admin`, `/operations`, `/vision`, `/partners`, `/login`,
`/missionary-intake`, `/system/preview`, `/prayer/apply`, `/auth/*`,
`/update-password`, and every token route — is `noindex` and deliberately has no
card of its own. They inherit the generic USA Missionaries default, which names
nothing about the page. Do not give an internal route a card carrying its own
name: the image route is public even when the page behind it is not.


## Per-host serving

`middleware.ts` rewrites the well-known root asset paths (`/favicon.ico`,
`/site.webmanifest`, `/apple-touch-icon.png`, and friends) to the brand directory
matching the request hostname. That is why no brand needs a copy of its icons at
the public root, and why browsers that blindly request `/favicon.ico` still get
the right brand.

## What was replaced or removed

* Deleted the duplicated USAM icon set from the public root: `favicon.ico`,
  `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`,
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`.
  These were byte-identical copies of `public/favicons/usam/*`.
* Deleted `public/dos.webmanifest`, replaced by
  `public/favicons/dos/app.webmanifest` so both DOS manifests live beside the DOS
  icons.
* Replaced the old icon artwork: USAM's smooshed square badge, the DOS mark on a
  black square, and the Kitchen Table mark on a gold box. The Kitchen Table mark
  now stands alone with no field at all.
* Replaced the DOS social preview, which was a 750x1450 portrait screenshot served
  as `summary_large_image`.
* Replaced the Groups share card. Every group used to unfurl with one generic
  black/gold "Discipleship Groups" image; each now gets a card with its own name,
  and `app/groups/[slug]/opengraph-image.tsx` — which already existed but was
  shadowed by the static image — finally does its job.
* Retired the old black DOS chrome colors (`#070D14`, `#080A0D`) in favour of DOS
  blue with a white splash.
* Removed hard-coded brand suffixes from page titles across the app; the layout
  template supplies them now.

* Replaced every social preview with the generated card: the USAM mountain photo
  (`/images/share/usam.jpg`, a crop of the site's hero background), the Kitchen
  Table photo, the DOS emblem plate, and the Mission of Reconciliation plate.
  `scripts/brand/build-share-images.mjs` generated those four files and is gone
  with them; there is nothing left to prebuild.
* Deleted `public/images/usam/groups-share.png`, the last of the old black-and-gold
  campaign artwork. Both retired paths are rewritten to the current card.
* Fixed coverless guides and photoless missionary profiles, which declared
  `images: undefined` and so unfurled with no picture at all.
* Added the `noindex` that `robots.txt` already implied on `/dos/**`,
  `/system/preview`, and `/prayer/apply`.

`dos.html` at the repo root is an unserved prototype still carrying the old
"Disciple Operating System" naming and black/amber treatment. It is outside the
served metadata surface and was left in place, but it is a candidate for deletion.

## Cache considerations

Favicon and social-preview changes are slow to appear because they are cached
outside our control:

* **Favicons.** Browsers cache them aggressively, often ignoring normal
  revalidation, and the file paths here are stable. Expect a hard reload, a new
  profile, or several days before tabs update. `favicon.ico` is the stickiest;
  Safari also caches apple-touch-icons per bookmark. Existing iOS home-screen
  icons keep the old artwork until the shortcut is removed and re-added. If a
  future change has to bust that cache, give the files new names in
  `scripts/brand/build-favicons.mjs` and `src/lib/domain-sites.ts`. A `?v=` query
  string is not an option for the root paths, because `middleware.ts` rewrites
  those by pathname.
* **Manifests and PWA icons.** An installed PWA keeps its existing icon and name
  until the manifest is re-fetched; reinstalling is the reliable fix.
* **Social previews.** Facebook, LinkedIn, X, iMessage, and Slack each cache
  unfurls per URL, typically for days. A *new* link unfurls with the current card
  immediately; a previously shared link keeps the old one until the platform
  re-scrapes. The old image paths are rewritten to the current card, so even a
  stale unfurl comes back on-brand rather than broken. Use each
  platform's debugger (for example Facebook's Sharing Debugger or LinkedIn's Post
  Inspector) to force a re-scrape of important URLs after deploy.
