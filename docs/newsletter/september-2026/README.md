# September 2026 newsletter — review artifacts

Generated, not hand-written:

```bash
node --no-warnings --import ./scripts/ts-loader.mjs scripts/september-newsletter-preview.mjs
```

It renders through the real renderers with no server, no database, and no
Resend, and fails if a photograph does not load or if the unapproved story
mockup reaches the sendable render.

## `version-a/` — the recoverable snapshot

The September issue as it rendered before it moved onto its record. Version A is
also recoverable from `src/lib/communications/september-2026.ts`, which is
untouched, and from revision 1 in `communication_newsletter_revisions`.

## `v4/` — the proposed issue

| File | What it is | Story |
|---|---|---|
| `v4-email.html` / `.txt` / `-desktop.png` / `-mobile.png` | What a subscriber would receive | **Absent** |
| `v4-review.html` / `.txt` / `-desktop.png` / `-mobile.png` | Private founder review | Mockup, behind a "permission pending" marker |

`/dev/newsletter-design-review` renders the **sendable** version only. That route
is publicly reachable on a deploy, so the story is not on it.

## `review-only/`

The unapproved story mockup, quarantined. See that directory's README.

## Reading order

1. `v4-revision-notes.md` — the three-section structure, what was removed, and
   measured length.
2. `from-the-table-source.md` — the testimony's source and exactly what needs
   confirming. **Read before drafting the story.**
3. `operations-editor-plan.md` — where the issue lives, what is now editable
   there, and the UI work left.

## Regenerating the seed migration

The issue's structured content has one source,
`src/lib/communications/september-2026-sections.ts`. Do not hand-edit the SQL:

```bash
node --no-warnings --import ./scripts/ts-loader.mjs scripts/september-newsletter-emit-migration.mjs
```

After the migration is applied the **record** is the source of truth, and copy
changes belong in Operations rather than in the fixture.
