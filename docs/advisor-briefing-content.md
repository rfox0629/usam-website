# The password-gated briefing page (`/advisor`)

`/advisor` is a password-gated briefing page. Its content is committed to this
repository at `src/content/advisor-briefing.json`, intentionally and at the
owner's direction. This repository is public, so the content is public too.
What the page protects is not the repository; it is the rendered page, which
stays behind the gate, uncached, and out of search.

The security contract, in full:

- The access code is secret and lives only in `ADVISOR_ACCESS_KEY`, server-side.
  It is never in source, logs, browser JavaScript, documentation, or content.
- `/advisor` and `/advisor/examples/<slug>` stay behind the gate.
- The server validates the access cookie before it reads or renders any content.
- The content is never bundled into client-side JavaScript. Its only importer is
  the server-only module `src/lib/advisor-content.ts`, and every component that
  renders it is a server component.
- The committed content must validate against the schema and contain no em dash.

`npm run test:advisor-privacy` enforces each of those.

## How access works

1. `/advisor` renders only a generic access gate. The cookie is checked
   server-side in `app/advisor/page.tsx` before anything else happens. The
   example routes do the same in `app/advisor/examples/[slug]/page.tsx`, so an
   unauthenticated visitor cannot even learn whether a slug exists.
2. The gate posts to `/api/advisor-access`, which compares the submitted code
   against `ADVISOR_ACCESS_KEY`. The comparison is **case-sensitive** and
   timing-safe; only surrounding whitespace is trimmed.
3. On success the route sets `usam_advisor_access`: `httpOnly`, `sameSite=lax`,
   `secure` in production, scoped to `path=/advisor`, expiring after three
   days. The cookie holds a hash derived from the key, never the code itself,
   so rotating `ADVISOR_ACCESS_KEY` immediately invalidates every issued
   session, whatever its remaining lifetime.
4. Only after that cookie validates does the page call
   `getAdvisorBriefingContent()` or `getAdvisorExample()`.

The route is in the `robots.ts` disallow list, absent from the sitemap, and the
pages are `noindex, nofollow, nocache` and `force-dynamic`.

### Rotate the key when the briefing is over

Rotation is the revocation mechanism. Changing `ADVISOR_ACCESS_KEY` ends every
session at once, including any cookie that was forwarded or left on a shared
machine. There is no per-person revocation: every reader who enters the code
receives the same derived token.

### Failed-attempt throttling

`/api/advisor-access` allows 5 failed attempts per client in a 15-minute
window, then answers `429` with a `Retry-After` header until the window
expires. A successful authentication clears that client's counter. Clients are
identified by a truncated hash of their address; no raw address, submitted
code, or cookie is stored or logged.

**This is defence in depth, not the primary control.** The limiter lives in the
memory of a single serverless instance: counters are not shared between
concurrent instances and do not survive a cold start, so a determined attacker
spread across instances gets more than five attempts in total. It ends the
cheap attack, a fast loop against one warm instance, and nothing more.

**A long, unguessable `ADVISOR_ACCESS_KEY` is the real protection against brute
force.** Choose accordingly. A durable limiter would require shared state
(Redis, Postgres, Edge Config); that is a deliberate non-goal here.

## Editing the content

Edit `src/content/advisor-briefing.json` directly. It must match
`AdvisorBriefingContent` in `src/lib/advisor-content.ts`. Validate before you
commit:

```sh
node scripts/validate-advisor-content.mjs src/content/advisor-briefing.json
```

The validator fails on structural problems, on any em dash, and on an
`exampleCards` slug with no matching example. CI runs the same check, so an
invalid commit fails the build rather than shipping a page that shows "not
available" behind the gate.

`docs/examples/advisor-briefing-content.example.json` is a structural template
with placeholder values, kept so the shape of every block is visible in one
place.

Sections render in order and populate the sticky section rail from `navLabel`.
Each section holds `blocks`:

| Block | Renders as |
| --- | --- |
| `paragraph` | Body copy |
| `bullets` | Ruled list |
| `steps` | Numbered horizontal sequence |
| `quote` | Pull quote, optional `attribution` |
| `figures` | Metric grid, each with an optional clarifying `note` |
| `table` | Table above `sm`; labelled stacked cards below it, so nothing clips on a phone |
| `callout` | Bordered panel, `tone` of `neutral` / `gold` / `warning` |
| `questions` | Numbered discussion questions |
| `tabs` | Tabbed panels (nested blocks). All panels expand when printed |
| `links` | Collapsible link appendix. All groups expand when printed |
| `dashboard` | Inline illustrative still of DOS for one organisation |
| `exampleCards` | Cards linking to full-page dashboard concepts (see below) |

Two authoring rules the layout cannot enforce:

- **Give every figure a `note`.** Distinct measures must stay distinct; a grid
  of bare numbers invites a reader to treat one as another.
- **Label anything built from sample data.** Put it in the tab's `caption` or
  the block's `note`, not only in the surrounding prose.

## Dashboard concepts

`content.examples` holds full-page, illustrative views of what DOS could look
like for one organisation. Each becomes a gated page at
`/advisor/examples/<slug>`, reachable from an `exampleCards` block.

```json
{
  "slug": "short-url-safe-id",
  "name": "Organisation name",
  "theme": "contemporary",
  "kicker": "Short line above the title",
  "intro": "A sentence or two of framing.",
  "disclaimer": "Required. Say that this is an illustrative concept, not a live account, not an existing partnership, and holds no private participant data.",
  "segmentLabel": "Campus",
  "illustrativeLabel": "Illustrative figures",
  "stats": [{ "label": "Measure", "value": "00", "note": "Optional" }],
  "segments": [
    { "name": "Location", "stats": [{ "label": "Measure", "value": "00" }], "attention": "Optional note" }
  ],
  "progress": [{ "label": "Journey", "value": 18, "max": 24, "note": "Optional" }],
  "lists": [{ "title": "Resources", "items": [{ "label": "Item", "value": "0", "meta": "Optional" }] }],
  "activity": [{ "when": "This week", "what": "What happened" }],
  "verified": {
    "title": "Real activity",
    "note": "Say why these figures are real rather than illustrative.",
    "stats": [{ "label": "Meetings", "value": "15" }]
  }
}
```

`theme` is `contemporary` (open, warm, rounded) or `tactical` (dense, high
contrast, squared). The themes are visual treatments only; the organisation's
name, figures, and wording all come from the content.

`disclaimer` is required by the schema, renders above the first figure and
again at the foot, and survives printing. Every organisation-wide figure sits
under a visible illustrative marker. `verified` is the one exception: it is
framed as "Not illustrative" and separated from the rest, for real numbers.

Link to them from the briefing:

```json
{ "type": "exampleCards", "slugs": ["slug-one", "slug-two"], "note": "Optional line under the cards" }
```

## No em dashes

The validator fails on any em dash in the content and lists the JSON path of
each one. Rewrite those sentences with periods, commas, colons or parentheses.
Swapping the character for a hyphen is not enough. A matching regression check
fails the build if one appears anywhere in the advisor code, docs, or content.

## Retiring a briefing

The content is a committed file, so retiring it is a normal change:

1. Replace or remove `src/content/advisor-briefing.json` and open a pull
   request. Because this repository is public, the previous content remains in
   git history; treat anything ever committed here as published.
2. **Rotate or delete `ADVISOR_ACCESS_KEY`.** Rotation revokes every issued
   session at once; deletion closes the gate entirely.

To retire only the dashboard concepts and keep the briefing, remove the
`examples` array and any `exampleCards` blocks from the content.

## Placeholders

A briefing authored in a hurry may carry lines that still need a real value.
The convention is a string beginning `TO CONFIRM:`. Search the content for it
before the briefing is shared; the validator does not treat it as an error,
because a draft with visible placeholders is better than a draft that hides
them.

## Guardrails

```sh
npm run test:advisor-privacy    # the access contract above, plus content validity
npm run test:advisor-throttle   # the failed-attempt limiter
```

Both run in CI on every pull request and on `main`.
