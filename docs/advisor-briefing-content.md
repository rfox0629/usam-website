# The protected briefing page (`/advisor`)

`/advisor` is a generic, password-gated briefing page. This repository is
**public**, so the page is built in two halves:

| Half | Where it lives | Contains |
| --- | --- | --- |
| Layout + access control | This repository | Generic, reusable components. |
| The briefing itself | `ADVISOR_BRIEFING_CONTENT` in the hosting environment | All of the content. |

Nothing in the second column is ever committed. This repository describes only
the mechanism; it says nothing about any particular briefing.

## How access works

1. `/advisor` renders only a generic access gate. The cookie is checked
   server-side in `app/advisor/page.tsx` before anything else happens.
2. The gate posts to `/api/advisor-access`, which compares the submitted code
   against `ADVISOR_ACCESS_KEY`. The comparison is **case-sensitive** and
   timing-safe; only surrounding whitespace is trimmed.
3. On success the route sets `usam_advisor_access`: `httpOnly`, `sameSite=lax`,
   `secure` in production, scoped to `path=/advisor`, expiring after three
   days. The cookie holds a hash derived from the key, never the code itself —
   so rotating `ADVISOR_ACCESS_KEY` immediately invalidates every issued
   session, whatever its remaining lifetime.
4. Only after that cookie validates does the page call
   `getAdvisorBriefingContent()`.

The route is in the `robots.ts` disallow list and the page is `noindex,
nofollow, nocache`.

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
code, cookie, or payload is stored or logged.

**This is defence in depth, not the primary control.** The limiter lives in the
memory of a single serverless instance: counters are not shared between
concurrent instances and do not survive a cold start, so a determined attacker
spread across instances gets more than five attempts in total. It ends the
cheap attack — a fast loop against one warm instance — and nothing more.

**A long, unguessable `ADVISOR_ACCESS_KEY` is the real protection against brute
force.** Choose accordingly. A durable limiter would require shared state
(Redis, Postgres, Edge Config); that is a deliberate non-goal here.

## Authoring the content

The payload is JSON matching `AdvisorBriefingContent` in
`src/lib/advisor-content.ts`. `docs/examples/advisor-briefing-content.example.json`
is a structural template with placeholder values — copy it **outside this
repository**, fill it in, and keep it there.

Sections render in order and populate the sticky section rail from `navLabel`.
Each section holds `blocks`:

| Block | Renders as |
| --- | --- |
| `paragraph` | Body copy |
| `bullets` | Ruled list |
| `steps` | Numbered horizontal sequence |
| `quote` | Pull quote, optional `attribution` |
| `figures` | Metric grid, each with an optional clarifying `note` |
| `table` | Bordered table, horizontally scrollable on narrow screens |
| `callout` | Bordered panel, `tone` of `neutral` / `gold` / `warning` |
| `questions` | Numbered discussion questions |
| `tabs` | Tabbed panels (nested blocks). All panels expand when printed |
| `links` | Collapsible link appendix. All groups expand when printed |

Two authoring rules worth stating, since the layout cannot enforce either:

- **Give every figure a `note`.** Distinct measures must stay distinct; a grid
  of bare numbers invites a reader to treat one as another.
- **Label anything built from sample data.** Put it in the tab's `caption` or
  the block's `note`, not only in the surrounding prose.

## Encoding and configuring

```sh
# From wherever the private JSON lives — never from inside this repository.
base64 -w0 /path/to/content.json
```

Paste the result into `ADVISOR_BRIEFING_CONTENT`, and set `ADVISOR_ACCESS_KEY`
alongside it, for every environment that should serve the page. Redeploy so the
new environment revision is picked up.

Base64 is transport encoding, not encryption. The privacy comes from the
variable being server-side and encrypted at rest in the hosting environment.
**Never** name it `NEXT_PUBLIC_*` — that would inline the payload into the
client bundle.

Validate before pasting:

```sh
node scripts/validate-advisor-content.mjs /path/to/content.json
```

The validator reports structural problems without printing the file's contents.

If the payload is missing or fails validation, `/advisor` shows a generic
"not available right now" message behind the gate. It never surfaces a parse
error or a partial payload.

## Guardrails

```sh
npm run test:advisor-privacy    # the privacy contract above
npm run test:advisor-throttle   # the failed-attempt limiter
```

Both run in CI on every pull request and on `main`.
