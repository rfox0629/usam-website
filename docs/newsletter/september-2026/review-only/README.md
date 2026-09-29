# Review-only material

Nothing in this directory is approved copy, and nothing in it is wired to the
application.

`story-mockup.json` is Ryan's own de-identified draft of the "From the Table"
story. It exists so the private review render has something in the story slot to
lay out and measure. It is:

- **not** in `src/`, so no route, renderer, or server action can import it;
- **not** in the newsletter record, so it cannot reach the Operations preview, a
  test send, or a broadcast;
- **not** in `v3/v4-email.html`, the sendable render.

It appears in exactly one artifact: `../v4/v4-review-*.png` and
`v4-review.html`, generated locally by `scripts/september-newsletter-preview.mjs`
and marked "Permission pending — private review only" on the page itself.

The underlying reflection names a real person and discloses a real struggle.
Neither her name nor that disclosure is in this mockup, and neither may be added
without the verified permission covering them. See `../from-the-table-source.md`.
