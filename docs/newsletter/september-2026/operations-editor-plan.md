# The Operations issue: what is done, and what is left

## Where the issue lives

**Operations → Communications → Newsletters →** record
`57ef7c02-e22c-40c2-a80f-a5a85ebed3b8`, slug `q2-q3-2026-field-update`.

| Field | Value |
|---|---|
| `status` | `test_sent` |
| `planned_send_at` | 2026-09-15 13:00 UTC — **passed, deliberately not replaced** |
| `last_test_sent_at` | 2026-09-04 |
| `ready_at` / `approved_at` / `approved_by_email` / `sent_at` | all null |

## The blocker that is now resolved

The September issue used to render from `src/lib/communications/september-2026.ts`,
picked by slug in `render.ts`:

```ts
const editorialIssues = { "q2-q3-2026-field-update": septemberNewsletter };
```

While that map held the slug, the record's own `body_markdown` and `sections`
were **ignored**, and the only way to change a word of the issue was a developer
and a deploy. That is gone.

| Change | Where |
|---|---|
| `editorialIssues` is empty, and a regression check fails if any slug is added back | `src/lib/communications/render.ts` |
| An issue names its renderer via a new `template` column; `ecosystem` draws the September design | `render.ts`, migration |
| The design is a supported template reading a record, not a `proposed/` experiment | `src/lib/communications/newsletter-ecosystem.ts` |
| Sections carry type, identity, order, visibility, image with caption, CTA, and a permission-gated story | `src/lib/communications/newsletter-sections.ts`, `types.ts` |
| The issue's content is seeded onto the record, with Version A captured as revision 1 first | `supabase/migrations/20260917214500_newsletter_record_source_of_truth.sql` |
| `postal_address` exists and a missing one **blocks the send** | migration, `evaluateSendReadiness` |
| A visible story with no verified permission **blocks the send** | `evaluateSendReadiness` |
| `communication_newsletter_revisions` exists, with RLS and a rollback | migration |

Once that migration is applied, the Operations preview renders the issue **from
the record**, through the same renderer the send uses. Editing the record changes
the email. `src/lib/communications/september-2026-sections.ts` is the seed
fixture, not the ongoing source: after the migration, the record is.

Version A stays recoverable three ways: `september-2026.ts` untouched in the
repository, revision 1 in the revisions table, and the rendered snapshot in
`version-a/`.

## What is left, to remove Claude from the loop entirely

Everything below is UI on top of schema that now exists. None of it blocks the
September send; all of it is needed before the *next* newsletter can be made
without a prompt.

| | Work | Notes |
|---|---|---|
| **A** | **Edit panel** on the newsletter detail page: subject, preview text, title, postal address, planned send date. A `saveNewsletterAction` server action writing the record and one revision per save. | The single biggest gap. Roughly one action plus one form. |
| **B** | **Section cards**: heading, body, eyebrow, tagline, CTA label and URL per section, in the same form. | The renderer already draws whatever the record holds. |
| **C** | **Reorder and hide**: Move up / Move down buttons rewriting `position`, and a Hide toggle setting `hidden`. Buttons rather than drag, so it works on a phone with no client JS. | `position` and `hidden` are already read and respected, including the brand accent bars, which are derived from order. |
| **D** | **Photos**: a `newsletter-images` Storage bucket, upload from the section card, **alt text required before save**. Copy the `partners-documents` upload path. | Until then, a section's image URL and alt text are editable as text once **B** lands. |
| **E** | **Revisions panel**: list newest-first with who/when/summary; View renders that snapshot in the existing preview iframe; Restore writes it back as a *new* revision so nothing is destroyed. | Table, index, and RLS are in place. Revision 1 is Version A. |
| **F** | **Story editor**: the story section card needs permission as an explicit choice — the two publishable values, the attribution field enabled only under "with name", and required source fields (form id, submission id, who verified, when). | The normalizer already rejects anything that does not satisfy all four conditions; this is the UI that makes an editor state them. |
| **G** | **Approval invalidation**: if `updated_at > approved_at`, drop status back to `ready_for_review` and say so in the blocker list. | Otherwise an issue can be approved and then quietly changed. |
| **H** | **New Newsletter** action on the list page, seeded from a template's default sections. | Makes the second issue as easy as editing the first. |

Suggested order: **A → B → C → E → G** gets a founder editing, reordering,
reviewing history, and safely approving. **D**, **F**, and **H** follow.

## Pre-send blockers

1. **Verified postal address.** Unset. Now a hard blocker rather than a note.
2. **The testimony permission.** Unverified. See `from-the-table-source.md`.
   While it is unresolved: no test send, no audience import, no broadcast.
3. **Founder approval of the design.** PR #75 stays unmerged; this branch too.
4. **A fresh test send to Ryan**, after 1–3, because the content and the template
   both changed since the 2026-09-04 test.
5. **A send date**, set only once 1–4 are done.
