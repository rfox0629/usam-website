# Where the September issue lives, and what an Operations editor needs

## 1. Where it lives today

The issue is a real record. It is at
**Operations → Communications → Newsletters →
"There's a Lot We've Been Wanting to Share"**.

`communication_newsletters`, as of this writing:

| Field | Value |
|---|---|
| `id` | `57ef7c02-e22c-40c2-a80f-a5a85ebed3b8` |
| `slug` | `q2-q3-2026-field-update` |
| `status` | `test_sent` |
| `planned_send_at` | 2026-09-15 13:00 UTC (**passed**) |
| `last_test_sent_at` | 2026-09-04 |
| `ready_at` / `approved_at` / `approved_by_email` / `sent_at` | all null |
| `body_markdown` | 742 characters |
| `sections` | 7 entries |

Route: `/operations/communications/newsletters/57ef7c02-e22c-40c2-a80f-a5a85ebed3b8`.

That page already does a fair amount well, and none of it needs replacing:

- Desktop / mobile / plain-text preview, rendered by **the same renderer the
  send uses**, so what is reviewed is what is delivered.
- Send Test (to the fixed test recipient only, never the audience).
- Mark Ready For Review, Approve For Send (disabled until a test has been sent).
- Production Send behind a typed `SEND` confirmation and a blocker list from
  `evaluateSendReadiness`.
- Test-send log and post-send delivery metrics.

## 2. Why the founder cannot change a word of it there

**The September issue's copy is not in the database.** `src/lib/communications/render.ts`
keeps a slug-to-function map:

```ts
const editorialIssues = {
  "q2-q3-2026-field-update": septemberNewsletter,
};
```

When a slug is in that map the renderer builds the email from
`src/lib/communications/september-2026.ts` — a TypeScript module — and **ignores
the record's `body_markdown` and `sections` entirely**. The 742 characters and 7
sections in the row are dead weight; editing them would change nothing.

So the September issue is, in practice, editable only by someone who can change
TypeScript and ship a deploy. That is the thing to fix, and it is a bigger
problem than the missing form:

| Gap | Detail |
|---|---|
| **G1. Copy lives in code** | September renders from `september-2026.ts`, not the record. |
| **G2. No editing UI at all** | `newsletters/page.tsx` is a read-only list with no "New" action. `newsletters/[id]/page.tsx` has no form. `actions.ts` exposes ready / test / approve / send and nothing that writes content. |
| **G3. The `sections` shape is too thin** | `normalizeNewsletterSections` accepts `{ heading, body, image? }` and silently drops anything without both a heading and a body. There is no ordering key, no hidden flag, no section type, and no brand ground — so KTG and DOS branded sections, CTA buttons, pull quotes, and the statement block cannot be expressed as data at all. |
| **G4. No photo management** | Images are URL strings. Photographs are committed to `public/images/email/...` by hand. There is no upload, no library, no alt-text enforcement at the point of choosing a picture. |
| **G5. No revisions** | The table has `updated_at` and nothing else. There is no history, no diff, no restore, and no record of who changed what. |
| **G6. The postal address is unreachable** | `postalAddress` has no source: no env var, no column, no caller passing anything but `null`. Both renderers correctly render nothing rather than invent an address — but `evaluateSendReadiness` does not list it as a blocker, so nothing in the app would stop a CAN-SPAM-incomplete send. |

## 3. Making *this* revision editable there

The design in `src/lib/communications/proposed/` is not the finished issue; it is
a preview. Turning it into the actual September issue is four steps, in order.

**Step 1 — approve the visual result.** PR #75 stays unmerged until then. This
branch carries V3 and is likewise unmerged.

**Step 2 — promote the renderer.** Move `proposed/september-ecosystem.ts` to
`src/lib/communications/newsletter-ecosystem.ts` as a real, supported template
alongside the editorial one. Delete `app/dev/newsletter-design-review` and the
`proposed/` directory. The reserved-slot marker does not come with it — it is a
review device.

**Step 3 — put the content in the record.** Write the V3 content into the
September row as structured `sections` (see the schema below), and remove
`q2-q3-2026-field-update` from the `editorialIssues` map so the renderer reads
the record. This is the step that ends "editable only by a developer", and it
must be a migration with a rollback, not a hand-run `UPDATE`.

**Step 4 — re-test and re-date.** The content and the template both changed, so
`last_test_sent_at` from 2026-09-04 is stale. Send a fresh test, set a new
`planned_send_at`, then approve.

Version A stays recoverable throughout: `docs/newsletter/september-2026/version-a/`
holds its exact rendered HTML and text, and `september-2026.ts` is untouched in
git history regardless.

## 4. The editor

Goal, in the founder's words: change copy and photos, reorder or hide sections,
preview, review revisions, send a test, approve, and send — without writing a
Claude prompt. Preview, test, approve, and send already exist. The rest is new.

### Schema

One migration, additive:

```sql
-- Ordering, visibility, and typed sections, so the renderer can be driven by data.
alter table public.communication_newsletters
  add column if not exists postal_address text;

create table if not exists public.communication_newsletter_revisions (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.communication_newsletters (id) on delete cascade,
  revision integer not null,
  snapshot jsonb not null,          -- the whole record as it was, after the edit
  summary text,                     -- "Rewrote the opening", auto-derived if blank
  created_at timestamptz not null default now(),
  created_by_email text not null,
  unique (newsletter_id, revision)
);
```

Sections become typed and ordered, inside the existing `sections` column so
nothing else has to move:

```jsonc
{
  "type": "story" | "framework" | "statement" | "feature" | "invitation",
  "brand": "usam" | "ktg" | "dos",   // picks the ground, accent, and CTA colour
  "position": 3,                      // integer; the editor renumbers on drag
  "hidden": false,                    // hidden sections render nowhere, and are kept
  "heading": "It happens at a table.",
  "body": "…",
  "image": { "url": "…", "alt": "…", "caption": "Kitchen Table Gospel // Minnesota" },
  "cta": { "label": "Explore Kitchen Table Gospel", "url": "https://kitchentablegospel.org" }
}
```

`normalizeNewsletterSections` gains these fields, keeps dropping an image that
has no alt text, and keeps defaulting `position` to array order and `hidden` to
false, so the seven sections already in the record stay valid.

### UI

`app/operations/communications/newsletters/[id]/page.tsx` gets an **Edit** panel
above the existing Preview panel, and the list page gets a **New Newsletter**
action.

1. **Fields** — subject, preview text, title, and planned send date, as a server
   form saving through a new `saveNewsletterAction`.
2. **Sections** — one card per section: heading, body, brand selector, image
   picker, CTA label and URL. Each card has Move up / Move down (buttons, not
   drag — they work on a phone and need no client JS beyond a form post) and a
   Hide toggle. Hidden cards stay in the list, greyed, and render nowhere.
3. **Photos** — a Supabase Storage bucket `newsletter-images`, upload from the
   section card, **alt text required before the image can be saved**. The
   existing `partners-documents` upload path is the pattern to copy.
4. **Revisions** — a panel listing revisions newest first: who, when, summary.
   Each row offers View (renders that snapshot in the existing preview iframe)
   and Restore (writes the snapshot back as a *new* revision, so nothing is
   destroyed). Every save through `saveNewsletterAction` writes one revision.
5. **Preview** — unchanged. It already re-renders from the record on every load,
   so it starts reflecting edits the moment step 3 above lands.
6. **Test / Approve / Send** — unchanged, with two additions:
   - Approval is invalidated by a later edit: if `updated_at > approved_at`, the
     status drops back to `ready_for_review` and the blocker list says so.
     Otherwise the founder can approve a draft and then quietly change it.
   - **The postal address becomes a hard blocker.** `evaluateSendReadiness`
     gains `if (!newsletter.postalAddress) blockers.push("No verified postal address.")`,
     and the renderers take it from the record. This is the pre-send blocker the
     founder has been tracking by hand; the application should hold it instead.

### Permissions

All of it sits behind the existing `canManageOperationsModule(authorization,
"communications")`. Viewers keep read and preview; only managers edit, approve,
and send. No new role.

### Order of work

| | Ships | Unblocks |
|---|---|---|
| A | Migration: `postal_address`, revisions table, typed sections in `normalizeNewsletterSections` | Everything below |
| B | `saveNewsletterAction` + the Edit panel (fields and section text) + revision write | Copy is editable without a deploy |
| C | Step 3 above: September's content into the record, slug out of `editorialIssues` | **This issue becomes editable** |
| D | Reorder, hide, image upload with required alt text | Full section control |
| E | Revisions panel with View and Restore | History |
| F | Postal-address blocker, approval invalidation | Safe send |

C is the one that matters most and is the smallest. A and B are prerequisites;
D, E, and F can follow the September send.
