# USA-246 — Public booking write path: audit, schema, transaction, and test plan

Branch `ryan/usa-246-booking-write-path` (from `main` 052bb6f). Founder decisions of 2026-09-08 apply: client-supplied idempotency key with a unique constraint; every future confirmed booking on the three live links creates exactly one scheduled DOS meeting with the complete planned snapshot; the four historical bookings stay unchanged and unlinked; DOS duplicate detection resolves the Person, auto-linking only on one unambiguous exact email or phone match, otherwise flag for review, and create only when nothing credible matches; a single-host link's host owns the meeting, a team link uses the host assigned to the slot with a documented fallback; Google sync follows the assigned host's existing connection and exposes no private calendar details.

## 1. Audit of what exists (read-only, production project `dbupuphezeqkiolprrlg`)

**Booking transaction today** (`src/lib/dos/table-invitation-data.ts`, `createPublicTableInvitationBooking`): four separate writes with no transaction and no idempotency — (1) find-or-insert a Person by `ilike` email, (2) insert a scheduled `missionary_tables` row when `calendarRules.createDosMeeting`, (3) call Google sync, (4) insert the booking. A failure between steps leaves orphans (a Person and a meeting with no booking); a double submit or a retry after a slow response creates two of everything. The slot is validated only before these writes, so two concurrent requests for the same slot both pass. `bookingRules.maxPerDay` / `maxPerWeek` are shown in the link editor but enforced nowhere. Meeting notes today contain the guest's prayer request and phone number, and the Google event description is built from those notes.

**Corrected finding about the four historical bookings.** All four have `table_id = null` and I previously reported that no booking had ever reached the calendar. Two of them have `calendar_event_synced = true`, which the code only sets after a meeting insert succeeded, and no `missionary_tables` row from 2026-07-08 matches their times. The meetings were created and later deleted (the FK is `on delete set null`). The historical rows are the founder's own July 8 test bookings; they stay as they are.

**Host model.** `dos_table_invitations.host_mode` is `single` | `household` with `host_member_ids uuid[]` (ids of `missionary_team_members`). All three live links are `single` with an empty host list. `missionary_tables` has `created_by uuid` (null on all 66 rows) and no `recorded_by_*` columns in production (the app's select falls back when they are missing). Workspace members: seven, of which only the owner (Ryan) has a linked DOS user id.

**Duplicate detection.** Two implementations exist: `app/api/dos/app/people/import/route.ts` (`duplicateKeys`: normalized phone, email, name) and `src/lib/dos/identity.ts` (`candidateMatches`: exact email / phone as strong matches, exact name as a weak fallback, ambiguous results recorded rather than guessed). Neither is importable by a leaf module; the booking rule is now a dependency-free module, `src/lib/dos/booking-person-match.ts`, with the same keys and the identity module's strong-then-weak semantics. Production has real ambiguity to handle: 2 duplicate emails and 3 duplicate phones among 73 people, and phone formats vary (`(999) 999-9999`, `999-999-9999`, nine and ten bare digits).

**Calendar sync.** `connected_calendars` rows are per workspace **and carry `user_id`**; the active connection in the founder's workspace belongs to the owner's user id, which equals the owner member's `dos_user_id`. `syncGoogleCalendarEvent` currently picks the latest active connection for the workspace regardless of user. Failures are recorded on `calendar_event_links` (`sync_status = failed`, `last_error`) and the app already shows that status on the meeting. Nothing retries a failed sync automatically.

**Failure and retry behavior today.** The client disables the button while a request is in flight and shows the server error; there is no request key, so a retry after a timeout is a second booking. The API returns 400 for an unavailable slot and 500 with the raw error message for anything else.

**Transactional facility.** Nothing in `src/lib` or `app/api` uses `supabase.rpc`; the project has two Postgres functions already (`preview_person_merge`, `merge_person_records`) that set the precedent for multi-table work done inside one function.

## 2. Schema change (exact SQL in `supabase/migrations/20260909090000_usa_246_booking_write_path.sql`)

All additive; every new column is nullable with **no default**, so the four historical rows are byte-for-byte unchanged and read `null` in the new columns.

`dos_table_invitation_bookings` gains: `operation_key text` (8–128 chars), `host_member_id uuid → missionary_team_members on delete set null`, `host_user_id uuid`, `person_match_status text` in (`linked`, `created`, `review`, `resolved`), `person_match_candidates jsonb`, `person_match_resolved_at`, `person_match_resolved_by`, `calendar_sync_error text`.

Constraints and indexes:
- **Idempotency:** `unique (invitation_id, operation_key) where operation_key is not null`.
- **Backstop:** `unique (workspace_id, host_member_id, start_at) where status = 'booked' and host_member_id is not null` — the exact-same-instant duplicate can never exist even if the function were bypassed.
- Support indexes on `(workspace_id, person_match_status) where person_match_status = 'review'` and on `table_id`.

Two functions, both `security invoker`, `set search_path = ''`, called by the service-role client:
- `dos_create_table_booking(jsonb) → jsonb`
- `dos_resolve_table_booking_person(jsonb) → jsonb`

No change to `missionary_tables`; the host is recorded in its existing `created_by`. `btree_gist` is not required.

**Rollback** (`..._rollback.sql`): drops both functions, the four indexes, the two check constraints, and the eight columns, in that order. It keeps every booking row; new bookings lose their key, host and match metadata but remain valid bookings with a linked meeting. Verified locally: apply → rollback → re-apply leaves the row count unchanged and re-applies cleanly.

## 3. Transaction boundary

One call to `dos_create_table_booking` is one Postgres transaction. Inside it, in order:

1. Input validation (missing key, empty name, malformed email, end ≤ start → `invalid_input`, before any lock or write).
2. `pg_advisory_xact_lock(hashtext('dos_table_booking:' || workspace_id))` — all bookings for a workspace are applied one at a time; the lock is released at commit or rollback.
3. Idempotency lookup by `(invitation_id, operation_key)` → returns `already_booked` with the existing ids and writes nothing.
4. Link re-check under the lock (`for share`): must belong to the workspace, be `active`, and be `public_enabled` → else `invitation_unavailable`.
5. Slot re-check under the lock: any live booking for this host (or any booking without a host) overlapping the buffered window, and, when the link blocks DOS meetings, any scheduled meeting in the workspace overlapping the buffered window → `slot_unavailable`.
6. Per-link `maxPerDay` / `maxPerWeek`, counted on the link's local calendar day and ISO week → `limit_reached`.
7. Person insert (only when the caller found no credible match), then meeting insert with `meeting_status = scheduled`, canonical `scheduled_*`, the full planned snapshot (`planned_start_at`, `planned_end_at`, `planned_date` in the link's timezone, `planned_duration_minutes`, `planned_timezone`), `lifecycle_id = id`, `created_by = host user`, `field_person_ids = [person]` or `{}` when flagged.
8. Booking insert with the key, host, match outcome and candidates.

Any `raise` anywhere rolls back everything from step 7 on; nothing partial can be committed. The JS layer does its reads (link, busy intervals, members, people) **before** the call and its Google sync **after** the commit.

## 4. Partially failed bookings

By construction there are only two states: nothing written, or booking + meeting (+ Person) all written. The one post-commit step, Google sync, cannot undo the booking. A sync failure sets `calendar_event_synced = false`, stores the reason in `calendar_sync_error`, records `failed` on `calendar_event_links` (what the app already surfaces on the meeting), and the booking is reported to the guest as confirmed. A retry with the same operation key returns the existing booking and attempts the sync again if it is still unsynced (the event-link upsert is idempotent).

Person resolution never leaves a half state: an ambiguous or possible match books the meeting with no Person attached (`field_person_ids = {}`), keeps the guest's name / email / phone / notes on the booking, stores the candidates, and marks `person_match_status = review`. Resolving (`dos_resolve_table_booking_person`, one transaction) links a chosen candidate or creates a Person from the preserved details, then attaches that Person to the meeting if it still has none.

## 4a. Phone numbers and prayer requests

They are accepted by the public form, stored on `dos_table_invitation_bookings` (`requester_phone`, `prayer_request`) and shown only inside DOS. The new path never copies either into `missionary_tables.notes` (the meeting's notes contain only the guest's "Notes" field) or into the Google Calendar event (title = link title + guest name; description = a fixed sentence). This is asserted by the SQL suite (check 13), by the regression script, and was confirmed on the production rows created during the preview run. The legacy path still embeds both in meeting notes; it is retired when the flag is switched on.

## 5. Rules as implemented

- **Idempotency key:** the booking form generates one `crypto.randomUUID()` per form mount and sends it on every submit and retry; the server rejects a missing key. Same link + same key ⇒ same booking.
- **Host** (founder correction 2026-09-09; `src/lib/dos/booking-host.ts` + `20260909120000_usa_246_booking_host_availability.sql`). The JS layer produces only an **ordered candidate list**: the link's configured hosts in the order they are listed on the link (children and non-active members skipped); if none, the **workspace owner**; if no owner either, nobody. The **transaction** then assigns the first candidate who is free for the buffered window — free meaning no live booking already assigned to that host and no scheduled meeting they own (`created_by`) — under the per-workspace lock. A busy host is never assigned. If candidates exist and all are busy, or there is no candidate, the slot is refused (`host_unavailable`, shown as "That time is no longer available") and nothing is written. The owner fallback is checked the same way. Because the choice happens under the lock, two concurrent requests can never be given the same host for overlapping times. The host is stored on the booking and as the meeting's `created_by`. For the three live links today the candidate list is the workspace owner.
- **Person** (`src/lib/dos/booking-person-match.ts`): normalized email (lower-case) or phone (digits, leading US `1` dropped, ≥ 7 digits) matching exactly one person → `linked`; more than one → `review (ambiguous)`; none, but an exact normalized name → `review (possible)`; otherwise `created`.
- **Google sync:** only when the link's `createGoogleCalendarEvent` is on **and** the assigned host has an active `connected_calendars` row with `user_id = host.dos_user_id`. The event carries the link title and the guest's name only ("Kitchen Table with Naomi Lee"); no phone, notes or prayer request go to Google, and the meeting's notes no longer embed the prayer request or phone either (they stay on the booking).
- **Gating:** `bookingWritePathV2Enabled()` is true when `DOS_BOOKING_WRITE_PATH_V2=true`, false when it is `false`, and otherwise true only outside Vercel production (`VERCEL_ENV !== "production"`). Production keeps today's path until the founder enables it; previews run the new path.

## 6. Verification

**SQL, on a local PostgreSQL 17 with the production table shapes** (`scratch/pg/tests.sh`, 45 checks, fresh database each run, both migrations applied): happy path with every planned field asserted; same-key retry returns the same ids and adds no rows; **20 concurrent sessions on one slot with different keys → 1 booked, 19 `slot_unavailable`, 1 row**; 20 concurrent sessions with one key → 1 row, 19 `already_booked`; paused link, `public_enabled = false`, and a foreign workspace all rejected; 30-minute buffer boundary (19:45 rejected, 20:00 accepted after an 18:00–19:30 booking); a scheduled DOS meeting blocks only when the link blocks DOS meetings; stale availability rejected; daily and weekly limits; **constraint failure after the Person and meeting inserts rolls all three back**; DST (Nov 1 fall-back and Mar 8 spring-forward evenings land on the right local date with 90 minutes; 11:30 pm CDT lands on the local date, not the UTC date); ambiguous match books with no Person and both candidates preserved; resolve by link and by create; foreign-workspace resolve refused; backstop index; historical row unchanged throughout; rollback of both migrations and re-apply.
  **Host availability (founder correction):** first configured host busy with their own meeting → the next configured host is assigned and owns the meeting; **all configured hosts busy → refused with no booking, meeting or Person written**; both free → the first listed host; listing order (not sort order) decides; **12 concurrent requests for overlapping slots with one candidate host → exactly one gets the host**; **12 concurrent requests with two candidate hosts → two bookings, two distinct hosts, never the same host twice**; no configured hosts + owner free → owner hosts; no configured hosts + owner busy (a live booking, or their own scheduled meeting even when the link does not block DOS meetings) → refused; no candidate at all → refused.
  **Privacy:** the meeting created for a booking carries neither the guest's phone nor the prayer request in its notes; both are stored on the booking row only.

**Unit (Node, `scripts/dos-booking-write-path-regression.mjs`, in `test:dos`):** person resolution (email, phone with formatting variance, ambiguous phone, email-vs-phone conflict, name-only possible match, create) and host candidates (owner-only list for the live links, configured order preserved, children and archived members excluded, an ineligible-only configuration falling back to the owner, no owner → no candidate); structural guards that the write path sends the candidate list and that availability is decided inside the transaction.

**End to end, on the hosted preview (PR #126, new path on) against the live "Kitchen Table" link, which has Google sync off** (`scratch/usa246b/preview-e2e*.mjs`, all passing):
- The public page loads and offers the same slots the server payload contains (14 across two Thursdays).
- Form submit confirms; a **double tap on the deployed form sends exactly one request** (after the in-flight ref guard; the first build sent two requests with the same key and the server still created one booking).
- **10 concurrent requests for one slot against the production database: 1 booked, 9 refused (409), one row created.** The winner's meeting carries the full planned snapshot, `lifecycle_id = id`, `created_by` = the owner's user id (host rule: no configured host → workspace owner), and the created Person linked.
- **Same-key retry** returns `alreadyBooked: true` with the same booking and meeting ids after the slot is taken.
- A fresh key for the taken slot → 409; the slot 15 minutes after a live 90-minute booking → 409 (buffer); unknown token → 404; missing operation key → 400 with nothing written.
- **Person matching in production:** a second form booking with the same phone as an earlier test guest was `linked` (one exact phone match, no duplicate Person); a booking named "Brooke Fox" with a new email was booked and **flagged for review with both existing "Brooke Fox" people as candidates, no Person created, meeting created with no people attached**.
- Historical bookings: the four July rows still have `operation_key`, `host_member_id`, `person_match_status` null and their July/August `updated_at`.

**Re-run after the host correction (preview with the corrected function, production database):** 10 concurrent requests for one slot → 1 booked, 9 refused; the winner's host is the workspace owner (the only candidate for a link with no configured hosts) and its meeting's `created_by` is the owner's user; same-key retry → same ids; taken slot → 409; unknown token → 404; missing key → 400; a double tap sends one request; no two live bookings share a host for overlapping times (query over all live bookings: 0). The form booking that carried a phone number stored it on the booking only; its meeting notes are null.

**Test data left on production (all in the founder's workspace, all clearly labelled):** seven test bookings and their meetings are `canceled` (they do not block availability or appear in Needs Logging); five test Persons ("Preview Test … (delete me)") are archived. **One live booking was kept on purpose** so the review flow can be exercised in the preview: guest "Brooke Fox" (`preview.review.…@example.com`), Thu Oct 1 6:00 PM CT, `person_match_status = review` — it appears under Links → Needs review and as a scheduled meeting on Oct 1. Cancel or resolve it after review; say the word and I will remove all test rows.

**Enabling in production:** set `DOS_BOOKING_WRITE_PATH_V2=true` in the Vercel Production environment and redeploy (or remove the gate in code after approval). Until then production keeps the legacy path; the migration is already applied and inert.

## 7. Screenshots

`screenshots/booking/`: Links → Needs review with the two candidate actions and Add as a new person (390 and 1440); the meeting detail's "Booked through … by …" line; the public confirmation page from the preview run.

## 8. Bounded cleanup of the identified test records (to run only after the review flow is approved)

Scope is exactly the rows this work created, identified by the synthetic `@example.com` addresses that begin with `preview.` and the `(delete me)` names, all created after 2026-09-08. The four historical July bookings are excluded by construction (they predate the cutoff and carry a real address).

```sql
-- 1. Preview: what will be removed (expect: 8 bookings incl. the kept review example, 8 meetings, 5 people).
select 'bookings', count(*) from dos_table_invitation_bookings where created_at > '2026-09-08' and (requester_email like 'preview.%@example.com' or requester_name like 'Preview Test%')
union all select 'meetings', count(*) from missionary_tables where id in (select table_id from dos_table_invitation_bookings where created_at > '2026-09-08' and (requester_email like 'preview.%@example.com' or requester_name like 'Preview Test%'))
union all select 'people', count(*) from missionary_field_people where email like 'preview.%@example.com' and created_at > '2026-09-08';

-- 2. Remove, in one transaction, in dependency order (bookings reference meetings and people).
begin;
delete from dos_table_invitation_bookings where created_at > '2026-09-08' and (requester_email like 'preview.%@example.com' or requester_name like 'Preview Test%');
delete from missionary_tables where meeting_status = 'canceled' and source = 'field' and created_at > '2026-09-08' and participant_names[1] like 'Preview Test%';
delete from missionary_tables where id = '<meeting id of the kept Brooke Fox review example, f7f676f0-d673-4a68-b325-ce27a7938f28>';
delete from missionary_field_people where email like 'preview.%@example.com' and created_at > '2026-09-08';
commit;

-- 3. Confirm the historical bookings are exactly as before (expect 4).
select count(*) from dos_table_invitation_bookings where created_at < '2026-09-01' and operation_key is null and host_member_id is null and person_match_status is null;
```

The kept review example (booking `58a12df2-d14e-43c7-8815-00a274332585`, guest "Brooke Fox", meeting `f7f676f0-…`) is included in step 2 on purpose; if it has been resolved to a Person by then, that link is removed with the booking and the Person it was resolved to is not touched.
