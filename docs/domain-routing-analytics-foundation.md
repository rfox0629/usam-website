# Domain Routing and Analytics Foundation

Last audited: 2026-07-17

## Scope

This repository remains the preferred single Next.js/Vercel codebase for the public brand roots unless a later security or operational review finds a hard reason to split projects.

No production deploy, DNS write, nameserver transfer, or domain move was performed in this pass.

## Current Vercel State

- Linked project: `usam-website`
- Project id: `prj_gB0MBTEfFRmDb5FnZGg7YpYD7ng4`
- Scope/team: `ryan-foxs-projects-9a51a4d5`
- Framework: Next.js
- Root directory: `.`
- Node: `24.x`

Attached/observed domains:

| Domain | Vercel status |
| --- | --- |
| `usamissionaries.org` | Owned by the Vercel team and attached to `usam-website` with `www.usamissionaries.org` and `new.usamissionaries.org`. |
| `app.usamissionaries.org` | Attached to separate `usam-dashboard` project. Preserve. |
| `usamissionaries.com` | Owned by the Vercel team and aliased to `usam-website`. Preserve unless a separate redirect plan is approved. |
| `kitchentablegospel.org` | Not found in the Vercel team. |
| `discipleshipoperatingsystem.com` | Not found in the Vercel team. |
| `thelords.army` | Owned by the Vercel team, attached to separate `army-website` project, and intentionally not handled by this release. |

Vercel Web Analytics dashboard status was not changed. The dashboard must still be checked/enabled manually after code deployment.

## Current DNS State

Registrars and DNS authority:

| Domain | Registrar | Authoritative DNS |
| --- | --- | --- |
| `usamissionaries.org` | Squarespace Domains LLC | Google/Squarespace nameservers: `ns-cloud-e1` through `ns-cloud-e4.googledomains.com` |
| `kitchentablegospel.org` | Squarespace Domains LLC | Google/Squarespace nameservers: `ns-cloud-e1` through `ns-cloud-e4.googledomains.com` |
| `discipleshipoperatingsystem.com` | Squarespace Domains LLC | Google/Squarespace nameservers: `ns-cloud-e1` through `ns-cloud-e4.googledomains.com` |
| `thelords.army` | Squarespace Domains II LLC | Google/Squarespace nameservers: `ns-cloud-c1` through `ns-cloud-c4.googledomains.com` |

Observed records:

| Host | Current web records | Current mail/TXT notes |
| --- | --- | --- |
| `usamissionaries.org` | Apex `A 216.198.79.1`; `www` and `new` CNAME to a Vercel target. | Google Workspace MX records present; Google site verification TXT present. Preserve. |
| `kitchentablegospel.org` | Apex Squarespace A records: `198.49.23.144`, `198.49.23.145`, `198.185.159.144`, `198.185.159.145`; `www` CNAME `ext-sq.squarespace.com`. | TXT `v=spf1 -all`. Preserve unless email requirements change. |
| `discipleshipoperatingsystem.com` | Apex Squarespace A records: `198.49.23.144`, `198.49.23.145`, `198.185.159.144`, `198.185.159.145`; `www` CNAME `ext-sq.squarespace.com`. | TXT `v=spf1 -all`. Preserve unless email requirements change. |
| `thelords.army` | Apex `A 216.198.79.1`; no `www` record observed. | TXT `v=spf1 -all`. Preserve unless email requirements change. |

Do not remove or overwrite MX, SPF, DKIM, DMARC, Google verification, or unrelated TXT records during cutover.

## Implemented Architecture

- `www` canonical redirects are configured in `next.config.js` for all requested domains.
- Apex domains are canonical.
- `new.usamissionaries.org` remains behind the existing `ENABLE_NEW_DOMAIN_REDIRECT` flag.
- Middleware rewrites only `/` for active non-USAM brand hostnames:
  - `kitchentablegospel.org/` -> guarded internal Kitchen Table Gospel placeholder
  - `discipleshipoperatingsystem.com/` -> guarded internal DOS placeholder
- The browser URL remains the requested root hostname.
- Direct browser requests to `/domain-sites/...` return 404 unless middleware injected the internal route header.
- The existing USAM homepage remains the default for `usamissionaries.org/` and unknown hosts.

Temporary brand placeholders are intentionally `noindex` and robots-disallowed until approved final pages replace them.

## Required Manual Vercel/DNS Steps

Do these only after explicit approval:

1. In Vercel, add `kitchentablegospel.org` and `www.kitchentablegospel.org` to `usam-website`.
2. In Vercel, add `discipleshipoperatingsystem.com` and `www.discipleshipoperatingsystem.com` to `usam-website`.
3. Decide what to do with `thelords.army`, because it is currently attached to `army-website`:
   - keep it on `army-website`, or
   - move/reattach it to `usam-website`, then add hostname routing and `www.thelords.army` in a separate approved change.
4. Use the Vercel dashboard as the source of truth for exact DNS targets.
5. For each domain using external DNS, Vercel generally expects an apex `A` record and a `www` `CNAME`; copy the precise values from the dashboard.
6. For KTG and DOS, replace only the Squarespace web records when ready:
   - Apex: replace the four Squarespace A records with Vercel's provided apex A record.
   - `www`: replace `ext-sq.squarespace.com` with Vercel's provided CNAME.
7. For `thelords.army`, resolve the Vercel project conflict first. If moved to this project, implement its hostname route in code, add/verify `www.thelords.army`, redeploy, and apply its required DNS record.
8. Wait for DNS propagation, then verify with:
   - `vercel domains inspect <domain>`
   - `vercel domains verify <domain>`
   - `dig A <domain>`
   - `dig CNAME www.<domain>`

Do not transfer nameservers unless separately approved.

## Vercel Web Analytics

Implemented:

- Installed `@vercel/analytics`.
- Added a single `VercelWebAnalytics` wrapper in the root layout.
- Added `beforeSend` filtering to drop private route events.
- Redacts token/contact-style query params from Vercel event URLs.
- Does not render on private route prefixes.

Manual dashboard step still required:

1. Open Vercel project `usam-website`.
2. Go to Analytics.
3. Enable Web Analytics.
4. Deploy after enabling so Vercel provisions its analytics routes.
5. Verify a public page sends a Vercel analytics request in the browser Network tab.

## GA4

Current implementation:

- Uses `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- Loads `gtag.js` only in production and only on allowed public routes.
- Sends `page_location`, `page_path`, `page_title`, `site_brand`, and `site_hostname`.
- Configures the Google linker domain list in code for active domains:
  - `usamissionaries.org`
  - `kitchentablegospel.org`
  - `discipleshipoperatingsystem.com`
  - active `www` variants

Audit finding:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists in Vercel env for Preview and Production, but resolves as an empty string via `vercel env run`.
- No GA4 measurement ID was present in `.env.local`, `.vercel/.env.production.local`, or `.env.example`.

Manual GA4 admin steps:

1. Do not create a new GA4 property or web stream without approval.
2. Set the existing stream's measurement ID in Vercel Production and Preview as `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
3. In GA4 Admin, open the existing property and web data stream.
4. Go to tag settings / configure domains.
5. Add:
   - `usamissionaries.org`
   - `kitchentablegospel.org`
   - `discipleshipoperatingsystem.com`
   - `thelords.army`
6. Register custom dimensions for event/page parameters:
   - `site_brand`
   - `site_hostname`
7. Use built-in GA dimensions for:
   - Hostname
   - Page path
   - Page title

Do not send names, emails, phone numbers, prayer content, notes, or form message text as analytics parameters.

## Event Taxonomy

Proposed event names to implement only when the corresponding approved pages and forms exist:

USAM:

- `join_mission_click`
- `become_missionary_click`
- `donate_click`
- `prayer_request_click`
- `partner_site_click`

Kitchen Table Gospel:

- `start_table_click`
- `explore_method_click`
- `resource_interest_click`
- `interest_form_submit`

DOS:

- `request_access_click`
- `schedule_walkthrough_click`
- `product_preview_click`
- `request_access_submit`

TheLords.Army:

- `movement_interest_click`
- `interest_form_submit`

Future Mission of Reconciliation:

- `request_prayer_ministry_click`
- `request_appointment_submit`
- `give_click`
- `contact_click`

Submission events must only fire after a successful form save. The currently wired submit event is `interest_form_submit` after `submitPublicForm` succeeds.

## Microsoft Clarity

Current implementation:

- Uses `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
- Loads only in production.
- Now uses stricter route eligibility than GA4/Vercel pageview analytics.

Audit finding:

- `NEXT_PUBLIC_CLARITY_PROJECT_ID` exists in Vercel env for Preview and Production, but resolves as an empty string via `vercel env run`.

Clarity is excluded from:

- `/dos`
- `/admin`
- `/api`
- `/auth`
- `/application`
- `/applications`
- `/board-briefing`
- `/financialfreedom`
- `/join`
- `/login`
- `/missionary-intake`
- `/missionaries/`
- `/ncc`
- `/partners`
- `/prayer/apply`
- `/review`
- `/support`
- `/testimony`
- `/update-password`
- `/system/preview`

Keep future confidential Mission of Reconciliation prayer ministry routes on this exclusion list.

## Metadata, Robots, and Sitemap

Implemented:

- Brand metadata config is centralized in `src/lib/domain-sites.ts`.
- Metadata builder is centralized in `src/lib/domain-metadata.ts`.
- USAM root metadata still canonicalizes to `https://usamissionaries.org`.
- Placeholder brand pages canonicalize to their own apex origins and are `noindex`.
- `robots.txt` is hostname-aware:
  - USAM keeps the existing public allowlist with private-route disallows.
  - Pending brand domains return `Disallow: /`.
- `sitemap.xml` is hostname-aware:
  - USAM returns the current static and missionary profile sitemap.
  - Pending brand domains return an empty sitemap until approved public pages exist.

Final brand launches should replace the placeholder pages and add domain-specific sitemap entries.

## References

- Vercel Web Analytics quickstart: https://vercel.com/docs/analytics/quickstart
- Vercel Web Analytics redaction: https://vercel.com/docs/analytics/redacting-sensitive-data
- Vercel domain troubleshooting: https://vercel.com/docs/domains/troubleshooting
- Google tag cross-domain measurement: https://developers.google.com/tag-platform/devguides/cross-domain
- GA4 cross-domain measurement: https://support.google.com/analytics/answer/10071811
