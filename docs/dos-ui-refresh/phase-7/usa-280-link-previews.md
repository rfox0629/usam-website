# USA-280: what a sent DOS link unfurls as

## The change

A Marriage Assessment link used to unfurl as the generic DOS card: the title
"Discipleship Operating System" and the site's default description. It now
unfurls with the assessment's own title, a one-line description of what the
link asks of the recipient, and a plain landscape image naming the assessment.

The card is served from `/share/assessment/<resource-slug>`, prerendered at
build time, one PNG per shareable assessment
(`app/share/assessment/[slug]/route.tsx`). The page metadata that points at it
lives in `generateMetadata()` in `app/dos/resource/[token]/page.tsx`.

## Why the image is addressed by resource, not by link

The share token is the whole of the access to a couple's answers. An unfurler
fetches the image URL itself and hands it to third-party caches, previews and
logs, so a token in an image path would leak into places nobody in DOS
controls. The card is therefore addressed by the **resource slug**. Every link
to the same assessment unfurls the same image.

The card names the assessment and nothing else:

- no participant name
- no score, percentage or answer
- no workspace, sender or recipient
- no token, and no shortened or derived form of one

The same holds for the text metadata. `og:title` is the resource title,
`og:description` is fixed copy about the assessment, and neither is built from
the link. Existing links and their tokens are untouched by this work.

## What the messaging app controls, and what we do not

How large a link preview appears, and whether it appears at all, is decided by
the app the link is opened in, not by us. We supply one 1200x630 image plus
`og:` and `twitter:` tags. From there:

- **iMessage** decides on its own whether to render a large image card, a small
  thumbnail row, or a bare link. Its cache is not ours to clear, and a link
  someone already sent may keep its old preview.
- **WhatsApp, Signal, Telegram** each apply their own size ceilings and their
  own rules about when an image is large enough to warrant a big card.
- **Slack, Discord, Facebook, LinkedIn** unfurl server side and cache the
  result per URL, sometimes for days.
- **SMS without a preview service** shows the URL as text, with no card at all.

So this work makes the same card available everywhere. It cannot promise an
identical compact card in every app, and nothing here shortens or reshapes a
token to influence how a link looks.

## Routes that still use the generic DOS preview

These DOS routes have a page title but no share card of their own, so a link to
them unfurls with the site default from `app/layout.tsx` and
`app/opengraph-image.tsx`:

| Route | Page title | Notes |
| --- | --- | --- |
| `/dos` | `Portal \| DOS` | the portal landing page |
| `/dos/app` | `Home` | `robots: noindex, nofollow`; not meant to be shared |
| `/dos/app/preview` | inherits | internal preview |
| `/dos/book/[token]` | `Book a Table` | tokenised invitation |
| `/dos/testimony/[token]` | `Testimony Review` | tokenised invitation |
| `/dos/review-options/[token]` | `Review Options` | tokenised invitation |
| `/dos/library/marriage-assessment` | `Marriage Assessment` | the in-app Library page, reached signed in |
| `/dos/library/remnant` | `Remnant` | as above |
| `/dos/onboarding`, `/dos/setup`, `/dos/admin` | various | signed-in only |
| `/dos/workspaces/[slug]`, `/dos/[collectiveSlug]/**` | various | signed-in only |

Two DOS routes already have their own card and are unchanged here:
`/dos/review/[token]` (`app/dos/review/opengraph-image.tsx`) and, as of this
change, `/dos/resource/[token]`.

The tokenised invitation routes above are the ones a leader actually sends. If
they should get their own cards, the pattern is the one used here: a card
addressed by what the link is *for*, never by the token that opens it.
