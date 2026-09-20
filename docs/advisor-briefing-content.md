# The private advisor briefing (`/advisor`)

`/advisor` is a password-gated briefing page. This repository is **public**, so
the page is built in two halves:

| Half | Where it lives | Contains |
| --- | --- | --- |
| Layout + access control | This repository | Generic, reusable components. No names, no figures. |
| The briefing itself | `ADVISOR_BRIEFING_CONTENT` in Vercel | Names, financial figures, ministry detail, links, questions. |

Nothing in the second column is ever committed.

## How access works

1. `/advisor` renders only a generic access gate. The cookie is checked
   server-side in `app/advisor/page.tsx` before anything else happens.
2. The gate posts to `/api/advisor-access`, which compares the submitted code
   against `ADVISOR_ACCESS_KEY`. The comparison is **case-sensitive** and
   timing-safe; only surrounding whitespace is trimmed.
3. On success the route sets `usam_advisor_access`: `httpOnly`, `sameSite=lax`,
   `secure` in production, scoped to `path=/advisor`, expiring after one day.
   The cookie holds a hash derived from the key, never the code itself — so
   rotating `ADVISOR_ACCESS_KEY` immediately invalidates every issued session.
4. Only after that cookie validates does the page call
   `getAdvisorBriefingContent()`.

The route is in the `robots.ts` disallow list and the page is `noindex,
nofollow, nocache`.

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
| `bullets` | Gold-ruled list |
| `steps` | Numbered horizontal sequence |
| `quote` | Gold-ruled pull quote, optional `attribution` |
| `figures` | Metric grid. Use `note` on each figure to keep distinct measures distinct |
| `table` | Bordered table, horizontally scrollable on mobile |
| `callout` | Bordered panel, `tone` of `neutral` / `gold` / `warning` |
| `questions` | Numbered discussion questions |
| `tabs` | Tabbed panels (nested blocks). All panels expand when printed |
| `links` | Collapsible link appendix. All groups expand when printed |

### Financial figures

Distinct measures must stay distinct. Cumulative giving is **not** cash on
hand, and neither is monthly support. Give each figure a `note` saying what it
answers, and never let one stand in for another.

### Illustrative mockups

Any screenshot, table, or example built from sample rather than live data must
say so — put it in the tab's `caption` or the block's `note`, not only in the
surrounding prose.

## Encoding and configuring

```sh
# From wherever the private JSON lives — never from inside this repository.
base64 -w0 /path/to/advisor-private-content.json
```

Paste the result into `ADVISOR_BRIEFING_CONTENT` in the Vercel project
(Preview + Production), and set `ADVISOR_ACCESS_KEY` alongside it. Redeploy so
the new environment revision is picked up.

Base64 is transport encoding, not encryption. The privacy comes from the
variable being server-side and encrypted at rest in Vercel. **Never** name it
`NEXT_PUBLIC_*` — that would inline the payload into the client bundle.

Validate before pasting:

```sh
node scripts/validate-advisor-content.mjs /path/to/advisor-private-content.json
```

If the payload is missing or fails validation, `/advisor` shows a generic
"not available right now" message behind the gate. It never surfaces a parse
error or a partial payload.
