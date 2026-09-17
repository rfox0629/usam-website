# September 2026 newsletter — review artifacts

Generated, not hand-written. Regenerate everything here with:

```bash
node --no-warnings --import ./scripts/ts-loader.mjs scripts/september-newsletter-preview.mjs
```

The script renders through the real renderers, with no server, no database, and
no Resend, and fails if any photograph does not load.

## `version-a/` — the recoverable snapshot

The live September issue exactly as Operations renders it today, captured before
any V3 work: `version-a.html`, `version-a.txt`, and full-page screenshots at
desktop and mobile.

Version A itself is untouched. `src/lib/communications/september-2026.ts`,
`newsletter-editorial.ts`, `render.ts`, and `newsletter-template.ts` are
byte-identical to `main` on this branch, and the record in
`communication_newsletters` has not been written to. This directory is a
convenience, not the only copy — Version A is also recoverable from git history
alone.

## `v3/` — the proposed revision

| File | What it is |
|---|---|
| `v3-email.html` / `.txt` | What an email client would receive. |
| `v3-email-desktop.png` / `-mobile.png` | Screenshots of that. |
| `v3-review.html` | The founder-review render: identical, plus a marker on the reserved "From the Table" story slot. |
| `v3-review-desktop.png` / `-mobile.png` | Screenshots of that. |

The reserved-slot marker is drawn only when `showReservedSlots: true` is passed,
which happens on `/dev/newsletter-design-review` and nowhere else. It cannot
reach an inbox.

## Reading order

1. `v3-revision-notes.md` — what changed from V2, measured, and the stale-date
   proposal.
2. `from-the-table-source.md` — why the lead story is empty. **Read before
   drafting it.**
3. `operations-editor-plan.md` — where the issue lives, why it is not editable
   there, and what to build.

## Comparing against V2

The script also measures PR #75's V2 when a copy is present, which is how the
before/after table in the revision notes was produced:

```bash
mkdir -p .v2-ref
git show origin/ryan/newsletter-design-proposal:src/lib/communications/proposed/september-ecosystem.ts > .v2-ref/september-ecosystem.ts
git show origin/ryan/newsletter-design-proposal:src/lib/communications/proposed/september-content.ts   > .v2-ref/september-content.ts
```

`.v2-ref/` is scratch and is not committed; the script runs fine without it.
