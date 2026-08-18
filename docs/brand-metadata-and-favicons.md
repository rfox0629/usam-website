# Brand metadata and favicons

How the browser and sharing identity works for USA Missionaries, the Discipleship
Operating System (DOS), and Kitchen Table Gospel, and what to change when a brand
detail changes.

## Source of truth

| Concern | Owner |
| --- | --- |
| Titles, descriptions, canonical origins, icon paths, manifest paths, theme colors, social images | `src/lib/domain-sites.ts` |
| Turning that config into Next `Metadata` / `Viewport` | `src/lib/domain-metadata.ts` |
| DOS identity for DOS surfaces hosted under `usamissionaries.org` | `src/lib/dos/brand-metadata.ts` |
| Icon and manifest artwork | `scripts/brand/brand-icons.mjs` |

Change a brand's colors, mark, name, or share image in those four places only. No
page should hard-code a favicon path, a manifest path, or a brand suffix.

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

Individual pages should normally override only title, description, canonical URL,
and social image.

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
Open Graph block, so such pages must restate the brand image via
`buildDomainSiteSocialImage`.

## Icons

`node scripts/brand/build-favicons.mjs` generates everything under
`public/favicons/<brand>/` from the mark definitions in `brand-icons.mjs`. Never
hand-edit the output.

Per brand: `favicon.svg`, `favicon.ico` (16/32/48), `favicon-16x16.png`,
`favicon-32x32.png`, `favicon-48x48.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`, and the PWA manifest(s).

* Tab and PWA `any` icons are **circular emblems on transparency**.
* `apple-touch-icon.png` and `icon-maskable-512.png` are **full-bleed brand
  fields** — iOS applies its own squircle, and Android crops maskable icons to a
  circle, so the mark is inset well within the safe area.
* `any` and `maskable` are separate files. They used to be one file declared as
  `"any maskable"`, which meant Android's circular crop clipped the mark.

Marks come from approved brand art, not new logos:

| Brand | Mark | Field |
| --- | --- | --- |
| USAM | the USAM wordmark from `public/brand/logo/usam-website-logo.png`, extracted by `scripts/brand/extract-usam-mark.py` | black disc, USAM gold edge |
| DOS | the concentric-circles mark, reversed to white | DOS blue gradient disc (`#2563EB` → `#1D4ED8`) |
| Kitchen Table | the table mark | cream disc (`#F3E4CC`) with warm brown mark, the Kitchen Table palette rather than USAM gold |

`python3 scripts/brand/build-brand-preview.py` regenerates the review sheets in
`public/favicons/review/` so they always show what is actually shipping.

## Social previews

`node scripts/brand/build-share-images.mjs` writes an exact 1200x630 asset per
brand to `public/images/share/`, so unfurls frame identically everywhere instead
of each platform cropping differently. USAM and Kitchen Table crop approved
photos; DOS, which has no approved landscape photo, uses its emblem on its own
field.

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
  black square, and the Kitchen Table mark on a gold box.
* Replaced the DOS social preview, which was a 750x1450 portrait screenshot served
  as `summary_large_image`.
* Retired the old black DOS chrome colors (`#070D14`, `#080A0D`) in favour of DOS
  blue with a white splash.
* Removed hard-coded brand suffixes from page titles across the app; the layout
  template supplies them now.

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
  unfurls per URL, typically for days. Because the share images are new paths
  (`/images/share/*`), a *new* link unfurls correctly immediately; previously
  shared links keep the old card until the platform re-scrapes. Use each
  platform's debugger (for example Facebook's Sharing Debugger or LinkedIn's Post
  Inspector) to force a re-scrape of important URLs after deploy.
