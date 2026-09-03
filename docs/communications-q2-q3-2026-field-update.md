# Q2/Q3 2026 field update

The September donor update, built inside the existing Communications system
rather than beside it.

## Where it lives

The Communications and newsletter platform (USA-46 and USA-47) had never been
merged to `main`. It existed only on two rescue branches, while its database
tables were already live in production. This branch brings that code onto the
line of development and adds one issue to it.

| Piece | File |
| --- | --- |
| Issue template | `src/lib/communications/newsletter-q3-2026-template.ts` |
| Slug, links, asset base | `src/lib/communications/config.ts` |
| Renderer registry | `src/lib/communications/newsletter-template.ts` |
| Send path | `src/lib/communications/resend.ts`, `app/admin/communications/actions.ts` |
| Review send from a terminal | `scripts/newsletter-send-preview.mjs` |
| Rendered preview | `docs/previews/newsletter/q3-2026-field-update.html` and `.txt` |
| Guard | `scripts/newsletter-q3-2026-regression.mjs` (`npm run test:newsletter-q3-2026`) |

A newsletter row routes to a designed template by slug. Everything else is
shared with the generic renderer: one subscriber table, one manage-token shape,
one Resend sender, one `communication_sends` log, one webhook for delivery
events. There is no second newsletter system.

Newsletter row: `57ef7c02-e22c-40c2-a80f-a5a85ebed3b8`, slug
`q2-q3-2026-field-update`, status `draft`.

## Subject lines

Sent for review: **There's a Lot We've Been Wanting to Share**

Alternatives, in the order they read best:

1. The Mission Is Becoming Clearer
2. What God Is Building Through USA Missionaries
3. A New Chapter for USA Missionaries
4. Two Quarters, One Update

Preview text: *A new website, new tables, new men gathering, and new people
joining the mission.*

## Destinations

Every URL was checked live before it went into `q3FieldUpdateLinks`.

| Purpose | URL | Live check |
| --- | --- | --- |
| Explore / Follow the mission | `https://usamissionaries.org` | 200 |
| Kitchen Table Gospel | `https://kitchentablegospel.org` | 200 |
| Discipleship Operating System | `https://discipleshipoperatingsystem.com` | 200 |
| Field reports | `https://usamissionaries.org/briefing` | 200 |
| Meet the team | `https://usamissionaries.org/missionaries` | 200 |
| 2three2 | `https://usamissionaries.org/groups/2three2` | 200 |

Rejected because they do not resolve the way the draft assumed: `/mission` is a
308 to `/briefing`, `/missionary-team` is a 308 to `/missionaries`, and there is
no `/stories` or `/testimony` route. `/vision` is behind an access gate, so it
is not linked.

## Images

Three photographs and one screenshot, all real, none stock. Cropped to 16:9 and
re-encoded for email; sources stay untouched in `public/images/vision`.

| File | Source | Size |
| --- | --- | --- |
| `public/images/email/q3-2026/kitchen-table-01.jpg` | `public/images/vision/kitchen-table-01.jpg` | 193 KB |
| `public/images/email/q3-2026/kitchen-table-02.jpg` | `public/images/vision/kitchen-table-02.jpg` | 161 KB |
| `public/images/email/q3-2026/mens-group.jpg` | `public/images/vision/group-prayer-01.jpg` | 215 KB |
| `public/images/email/q3-2026/website-hero.jpg` | Playwright capture of `https://usamissionaries.org` at 1440x760 | 65 KB |

`mens-group.jpg` is a stand-in. The men's-group photograph described as attached
to the request never arrived, so the closest real ministry photograph in the
repo is used instead. Replace it before the donor send if a different photo is
intended.

Images resolve from `q3FieldUpdateAssetBaseUrl()`, which defaults to
`https://usamissionaries.org/images/email/q3-2026` and therefore only works once
this branch is deployed. `NEWSLETTER_ASSET_BASE_URL` overrides it for review
sends made before that deploy.

## Sending

Only preview sends exist. `app/admin/communications/actions.ts` and
`scripts/newsletter-send-preview.mjs` both refuse any address outside
`phase1NewsletterRecipients`, and both send to exactly one recipient per call.
Nothing in this repository iterates the subscriber table to send.

```bash
RESEND_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/newsletter-send-preview.mjs --to ryan@usamissionaries.org --dry-run
```

Drop `--dry-run` to send. Every send writes a `communication_sends` row with the
Resend message id, and Resend delivery webhooks land in
`communication_delivery_events` through `app/api/resend/webhook/route.ts`.

## Before the September 15 donor send

1. **Deploy this branch.** Until it is live, four image URLs and the read-online,
   preferences, and unsubscribe routes all 404 in production.
2. **Supply a postal address.** `[POSTAL ADDRESS]` is still a placeholder in the
   footer. CAN-SPAM requires a real physical mailing address; none has been
   invented here.
3. **Fill the team block.** Photo, names, location, one or two sentences each.
   Nothing in that section is written yet, by design.
4. **Load the donor audience.** `communication_subscribers` holds two rows, both
   seeded. There is no donor list in the system.
5. **Build the donor send path.** Only preview sends exist. A reviewed,
   rate-limited bulk send against subscribed recipients still has to be written,
   and it must render with `showPlaceholderNotes: false`.
6. **Point `RESEND_WEBHOOK_SECRET` at the deployed webhook** so opens, clicks,
   bounces, and complaints are recorded for this send.
7. **Confirm the men's-group photograph** is the one Ryan intends.
