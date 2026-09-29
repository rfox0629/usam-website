# USA-275 — Multiplication: connected People, profiles, upstream activity, Reports

Status: merged as `782036d` (#146). Migration **applied to production 2026-09-14** as version `20260914183331` (see `migration-history-audit.md` §5). Supabase *Deploy to production* remains off pending the broader migration-history reconciliation.

Principle: *simple at the surface, powerful underneath.* One discipleship graph powers the People Multiplication section, the Multiplying indicator, the Reports Multiplication column and drill-down, and connected (upstream) activity.

## 1. Audit of what existed (main `704aae3`)

| Area | Finding |
| --- | --- |
| Multiplying indicator | No manual flag. `personIsMultiplying()` (USA-168) derived it from **accountability commitments with a people target and at least one confirmed subject**. `person-fruit-summary.ts` computed a second, unused `multiplicationStatus` from `discipleship_stage = disciple_maker` + Fruit text. `circle-scoring.ts` computes a machine `multiplication_score` (not read by People). |
| People Multiplication section | Did not exist. The mock-up's “Aaron Johnson” is illustrative; no such record exists in code or fixtures. |
| Discipling selections | `missionary_field_people.role_in_my_life = 'discipling_them'` — the Person's structured role, which Reports already treats as the canonical direction. |
| Reports Multiplication | A column with honest states whose downstream reader was never built; production could only ever show “Not connected” / “Not resolved yet”. |
| Identity | `dos_identity_links` rows become `verified` **automatically** (created-by / unique email / unique phone match, or a newly inserted viewer Person) — including when a signed-in user merely opens another workspace's URL. There is no consent, no UI, no revoke. **A verified identity link is therefore not acceptance, and USA-275 never treats it as such.** |
| Authorization | Every DOS route uses the service-role client and authorizes in TypeScript (`requireDosWorkspaceRouteAccess`). RLS on field people, meetings and Fruit is admin-only and does not protect members. No DOS caches or exports exist. |
| Person merge | `merge_person_records` repoints ~35 tables and archives the source; no UI calls it. USA-275 does not merge records. |
| Kitchen table label | See §6. |

Production (read-only, 2026-09-13): 1 verified identity link (`founder_approved_usa_170_acceptance`) and 43 `ambiguous` rows for a single user in a single workspace. None of the USA-275 tables exist. People, users and workspace membership could not be inspected from the implementation session, so no production person, account or acceptance was assumed.

## 2. Model

**Edges** (`src/lib/dos/discipleship-graph.ts`, a leaf module used by client, loader, routes and tests):

- **Own records** — a workspace's Person with `role_in_my_life = discipling_them`. Existing Discipling selections populate Multiplication with no re-entry and no backfill.
- **Recorded here** — `dos_discipleship_connections`: “Tanner disciples Aaron”, entered on Tanner's profile with an existing Person or a name. No cadence, start date, narrative or visible creator; provenance (`created_by_user_id`) is stored. It never makes Aaron someone the workspace owner disciples and never unlocks anyone's account.

**Accounts** — `dos_discipleship_account_connections`: the mentor invites the disciple's sign-in email on the disciple's Person record; the disciple, signed in with that authenticated email, is shown who will be able to view (the inviting workspace and every indirect upstream viewer) and accepts. Acceptance writes a verified identity link (`verification_method = discipleship_account_acceptance`, `verified_by_user_id` = the disciple). Access requires *all* of: accepted, verified link for that user/workspace/Person, and the Person currently discipled.

**Identity** — `dos_discipleship_identity_matches`: the disciple's explicit, reversible decision about an entry their mentor recorded — same as an existing Person (same-name People are offered first, never chosen), add to my People, or not someone I disciple. Undo restores two separate records. Records are linked, never destructively merged; each keeps its owner, notes and history.

**Counting** — a person key is the connected account, else the matched/own Person, else the recorded row. Direct counts are direct disciples only (“Tanner Kent · 3”); the unique total across generations is labelled separately. Shared paths, multiple mentors and matched records count once. Traversal is bounded (depth 8, 400 nodes) and cycle-safe; self-links, duplicates and cycles are rejected on write.

**Multiplying** = at least one counted, active outgoing connection. Historical indicators (`disciple_maker`, “Started Discipling Others” Fruit, accountability subjects) are untouched; when a profile has them but no connection, MULTIPLICATION shows “Earlier records mention discipling others.” with one-tap “Add <name>” for each named subject. Adding a connection creates no Fruit (an existing Fruit event of the mentor's may be linked as evidence). Nothing reads or writes circles.

## 3. Upstream visibility

Dirk → Ryan → Tanner → Aaron: a viewer reads workspace D when a path of accepted, verified, currently-discipled connections leads from the viewer's workspace to D. It is read-only, recomputed per request, and ends the moment any link on the only path ends.

- **Server:** `GET /api/dos/app/discipleship?workspaceId&connectedWorkspaceId` → workspace access → TypeScript traversal (`loadDosDiscipleshipReach`, loading only proven-readable workspaces) **and** the database function `dos_discipleship_readable_workspaces` must both find the path, else 404. The workspace is loaded with `loadDosAppData(…, { connectedRead })`, which performs no write (no household sync, viewer Person, identity link, group seed or circle recalculation), and projected by `dosConnectedWorkspaceViewFromAppData`.
- **Categories:** People and notes, meetings (with what happened and prayer), prayer requests, accountability (commitments, schedules, check-ins), Journeys, groups and attendance, Fruit, feedback, and the connected account's own discipleship meetings.
- **Never included:** contact details, review-link tokens, feedback submitters' email and names, leader reflections' private notes, calendars and events, scheduling links and bookings, prayer partners, organization/application records, feature flags, circle placements. No admin, credential or unrelated-workspace access.
- **Top meeting cards** still show the viewer's own meetings with the person; downstream activity is attributed to its owner.
- **End discipleship connection** (Person → Details): the relationship becomes Walking With and the account connection is revoked, so every access through that path ends and reconnecting needs a new acceptance. Stage, Fruit, circles and history are unchanged. A plain Edit Person role change also stops access (derived per request). **End** on a recorded row keeps it as history; **Remove, added by mistake** is the correction path and excludes it from history. The disciple can **Disconnect** from their side at any time.
- **Consequence to note:** an accepted connection's verified identity link also satisfies the existing guided-resource-progress rule, so the disciple can record their own Journey progress on assignments in the mentor's workspace (the same rule already allows a same-email Person). It grants nothing else.
- **Household workspaces:** access is to the workspace, so every member of a household workspace that disciples the Person can view.

## 4. Surfaces

- **People profile overview:** meeting cards, then three always-visible groups — MULTIPLICATION; ACTIVITY (Journey, Accountability, Groups, Prayer); FRUIT & FEEDBACK (Fruit, Feedback). Group headings are DOS blue, uppercase, 14px bold (eyebrows 11.5px, name 25px). Only multiplication descendants expand. Existing forms, actions and detail views are reused. Follow-ups sit under the meeting cards on mobile and in the desktop aside.
- **Details tab:** DOS account (Connect account / invitation waiting / Connected · View activity · Disconnect), End discipleship connection, Undo link.
- **People screen:** a “Discipleship connections” row appears under the actions only when there are requests, entries to confirm, or connections. Manage circles is unchanged; no circle editing was added anywhere.
- **Reports:** the Multiplication column counts current direct disciples (“1 person” / “3 people”), a **Multiplying** filter keeps multiplying people discoverable with no meeting in the period, and person detail lists names with expand, the generations total, “Current connections, not limited to this period.”, and the connected account's own in-period meetings, duration, gatherings and Fruit — “Attributed to Tanner. Not included in your totals.”
- **Empty states:** “No discipleship connections added”, “No activity recorded”.

## 5. Migration and rollback

`supabase/migrations/20260914183331_usa_275_discipleship_connections.sql`. This file was first committed as `20260913180000_…`. It was **applied to production on 2026-09-14** as version `20260914183331` through `apply_migration`; see `migration-history-audit.md` §5. Its rollback lives in `supabase/rollbacks/`. The migration is additive only: three tables, a scope-guard trigger, `public.dos_discipleship_readable_workspaces(uuid[], integer)` (security invoker, service-role execute only). RLS enabled, all privileges revoked from `anon` and `authenticated` (new public tables inherit an anon grant — USA-247). No existing table is altered, backfilled or rewritten.

**Deploy order:** migration first, code second is not required — the loader probes the tables and, when absent, shows own records only and hides every add/connect action (“not available in this environment yet”). Applying requires founder authorization.

**Rollback:** `supabase/rollbacks/20260914183331_usa_275_discipleship_connections_rollback.sql` drops the function, trigger and three tables (snapshot statements included in its header). Access ends immediately; People, Discipling selections, Fruit, circles, journeys, notes, accountability and attendance are unaffected. Verified identity links written on acceptance stay and grant nothing without an accepted connection. The code can stay deployed after rollback.

## 6. In person → “Kitchen table” in Reports

**Cause:** display only. Log Meeting stores “In person” as the legacy `missionary_tables.table_type = 'kitchen_table'` (the column's original value; relabelled in USA-168). Meeting detail maps it through the form's options (“In person”); the report had its own `meetingTypeLabel` still returning “Kitchen table”, used by the expanded contributing records, the person detail sheet's records, the metric meeting list and Fruit's related label.

**Fix:** one shared mapping, `dosMeetingContextLabels` / `dosMeetingContextLabel` in `ministry-report.ts`, used by Reports and by the client's `meetingTypeLabel`; the regression asserts every Log Meeting option agrees with it. A genuine Kitchen Table Gospel record is identified by `conversation_flow_key = 'kitchen_table_gospel'` (now carried into the report) and reads “In person · Kitchen Table Gospel”. **No data migration:** storage is correct; `kitchen_table` is referenced by check constraints, booking RPCs and existing rows and must not be renamed.

## 7. Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run test:dos` (now ending `discipleship-graph → multiplication → my-record-unsaved-work`) | see PR |
| `npm run build` | pass |
| `scripts/dos-discipleship-graph-regression.mjs` | Tanner → Aaron once; Multiplying derived; Tanner joins later and confirms; existing Aaron matched and counted once; same-name separate; undo; decline; Dirk → Ryan → Tanner → Aaron readable; upstream and siblings unreadable; pending / declined / revoked / unverified / name-only unlock nothing; ending revokes including ancestors; second path retains; multi-mentor dedupe; cycles rejected and terminate; depth bound |
| `scripts/dos-multiplication-regression.mjs` | projection strips third-party and secret fields; route authorizes before data; double path check; no cache; acceptance rules; loader no-write mode; migration grants; collective scrub; overview hierarchy; compact copy |
| `scripts/dos-ministry-report-regression.mjs` §19–§20 | In person in both report views; genuine KTG preserved; options agree; multiplication current, discoverable, filterable, never in totals |
| `scripts/dos-multiplication-browser-check.mjs` (Playwright, production build) | 12 checks incl. keyboard expand/collapse, Dirk's navigation, desktop hierarchy, Reports detail |

Updated existing assertions (intent unchanged): `dos-my-record-regression` and `dos-ministry-event-visibility-regression` now pin the connected-read variants of the loader calls; `dos-ministry-report-regression` §9 uses the new empty-state label.

## 8. Real steps still required (not simulated)

1. Founder authorization to apply the migration to production.
2. Confirm Dirk Bond has his own DOS account and workspace containing a Person for Ryan marked Discipling (a `dirk-bond` workspace slug alias exists in code; its data was not inspected).
3. Dirk: Ryan's Person → Details → Connect account → Ryan's DOS sign-in email. Ryan: People → Discipleship connections → review viewers → Accept.
4. Tanner Kent had no DOS user, identity link or workspace (2026-09-10). He needs an account and workspace; Ryan then invites Tanner's sign-in email from Tanner's canonical Person record (`de72ef8c…`; two archived duplicates exist) and Tanner accepts, then confirms any entries Ryan recorded under him.
5. Signed-in checks of saves, invitations, acceptance and revocation cannot run on the DB-free preview (read-only by design).
