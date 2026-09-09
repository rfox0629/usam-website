# USA-246 — planned versus actual meeting time: the migration report

2026-09-08. This is the report the founder required **before** the migration is applied. It is additive, backward compatible, and reversible.

Files: `supabase/migrations/20260908180000_usa_246_planned_vs_actual_meeting_time.sql` and its `..._rollback.sql`.

## 1. Exact existing columns and their current meanings
`public.missionary_tables`:

| Column | Type | Meaning today |
| --- | --- | --- |
| `id` | uuid, PK | the meeting |
| `household_id` / `workspace_id` | uuid | owning workspace (both are populated; 0 rows have a null `workspace_id`) |
| `table_date` | date, not null | the meeting's local date. **Canonical** for ordering, the calendar and Timeline |
| `meeting_status` | text, not null | `scheduled` · `logged` · `canceled` |
| `scheduled_start_at` | timestamptz, null | **Overloaded.** While scheduled it is the planned start. After logging it is overwritten with a synthetic local-noon start |
| `scheduled_end_at` | timestamptz, null | **Overloaded.** Planned end while scheduled; after logging it is start + the actual duration, which makes it the only surviving record of actual duration |
| `timezone` | text, null | IANA zone captured when the row was written |
| `google_sync_enabled` | boolean, not null | whether an external calendar event was created |
| `field_person_ids`, `participant_names` | arrays | attendees |
| `conversation_flow_key`, `conversation_responses`, `recommended_resources`, `notes`, `source`, `created_by`, `created_at`, `updated_at` | — | unchanged by this work |

There is no `actual_*` column, no duration column, no `logged_at`, and no lifecycle identifier.

## 2. Exact proposed columns and constraints
All nullable, all additive:

| Column | Type | Meaning |
| --- | --- | --- |
| `planned_start_at` | timestamptz | the start this meeting was scheduled for |
| `planned_end_at` | timestamptz | the end it was scheduled for |
| `planned_date` | date | the local date it was scheduled for |
| `planned_duration_minutes` | integer | the planned duration, stored so it survives independently |
| `planned_timezone` | text | the IANA zone the plan was made in |
| `lifecycle_id` | uuid | stable across the scheduled → logged transition |
| `logged_at` | timestamptz | when logging completed; null means never logged |
| `log_operation_key` | text | idempotency key for the logging write |

Constraints and indexes:
- `missionary_tables_planned_range_check` — `planned_end_at > planned_start_at` whenever both are present.
- `missionary_tables_planned_duration_check` — `planned_duration_minutes > 0` when present.
- `missionary_tables_log_operation_key_unique` — unique **partial** index on `log_operation_key` where not null, so a retried Log cannot apply twice and null keys never collide.
- `missionary_tables_lifecycle_id_idx` — index for following a lifecycle.

**The existing columns keep their meaning and stay canonical.** After logging, `table_date` / `scheduled_start_at` / `scheduled_end_at` hold what actually happened, which is what the calendar, Person history, Timeline and ministry-time reporting already read.

## 3. How a scheduled meeting becomes logged without duplication
Unchanged in shape and already correct: logging **PATCHes the same row** and flips `meeting_status` from `scheduled` to `logged`. No second record is created, and the scheduled item leaves the scheduled set because both sets read the same row.

What changes is only what is written:

| Step | Before | After this migration |
| --- | --- | --- |
| Scheduling | writes `scheduled_*`, `table_date`, `timezone` | also writes the same values into `planned_*` as a snapshot |
| Logging | overwrites `scheduled_*` with a synthetic noon start plus the actual duration, destroying the plan | writes the **actual** date, start, end into the canonical columns, sets `logged_at`, and leaves `planned_*` untouched |
| Retry / double tap | writes the same values again | the client's `log_operation_key` makes the write idempotent; a second attempt with the same key is a no-op |

`lifecycle_id` is set once and never changed, so planned and actual always belong to one identifiable lifecycle.

## 4. Backfill SQL and affected-row counts
Measured on production immediately before writing this: **66 rows** — 6 `scheduled`, 59 `logged`, 1 `canceled`, no other status, none with a null workspace.

**Backfill 1 — lifecycle identifier (66 rows):**
```sql
update public.missionary_tables set lifecycle_id = id where lifecycle_id is null;
```
Deterministic; the row's own id.

**Backfill 2 — the planned snapshot (6 rows):**
```sql
update public.missionary_tables
set planned_start_at = scheduled_start_at,
    planned_end_at   = scheduled_end_at,
    planned_date     = table_date,
    planned_timezone = timezone,
    planned_duration_minutes = greatest(1, round(extract(epoch from (scheduled_end_at - scheduled_start_at)) / 60)::int)
where meeting_status = 'scheduled' and planned_start_at is null;
```
Only rows that are **still scheduled**, whose stored values *are* the plan by definition. All 6 have both timestamps, a timezone, and a valid range, so all 6 map deterministically and none is skipped or guessed.

**Deliberately not backfilled:**
- The 59 `logged` rows and the 1 `canceled` row keep `planned_* = null`. Their plan was never captured and this migration does not invent one. Their existing date, time and duration remain the canonical recorded values.
- `logged_at` is left null everywhere. When each historical meeting was logged is unknown; `updated_at` is an approximation, not the fact.
- `log_operation_key` is left null everywhere; the partial unique index ignores nulls.

No speculative correction is run, and the 12:00 stamps on historical logged rows are left exactly as they are.

## 5. Rollback SQL
The full file is `..._rollback.sql`. It drops the two indexes, the two check constraints and the eight columns. Because the change is purely additive, the reverse touches no pre-existing column, value or row:

```sql
drop index if exists public.missionary_tables_lifecycle_id_idx;
drop index if exists public.missionary_tables_log_operation_key_unique;
alter table public.missionary_tables
  drop constraint if exists missionary_tables_planned_duration_check,
  drop constraint if exists missionary_tables_planned_range_check;
alter table public.missionary_tables
  drop column if exists log_operation_key, drop column if exists logged_at,
  drop column if exists lifecycle_id, drop column if exists planned_timezone,
  drop column if exists planned_duration_minutes, drop column if exists planned_date,
  drop column if exists planned_end_at, drop column if exists planned_start_at;
```

Reverting the application code alone is also safe and needs no SQL: the new columns simply stop being written and read.

## 6. Old clients and current API compatibility
- **No existing column changes type, nullability, or meaning.** Every current read returns exactly what it returned before.
- The new columns are nullable with no defaults, so inserts that do not mention them succeed unchanged. The meetings route already builds its insert and update from an explicit candidate list and drops unknown columns on a missing-column error, so a deployment where code and schema are briefly out of step degrades to today's behaviour rather than failing.
- A client that never sends `planned_*` produces a null plan, which reads as "no plan captured" — the same state as every historical logged row.
- `log_operation_key` is optional. A client that omits it gets today's non-idempotent behaviour rather than an error.
- The migration is safe to apply **before** the code that uses it, which is the order used here.

## 7. Timezone and DST
- Every new timestamp column is `timestamptz`, so values are stored as absolute instants. No local wall-clock time and no fixed offset is ever persisted, which is what makes DST transitions safe.
- `planned_timezone` stores the IANA zone name (for example `America/Chicago`), never an offset, so a plan made before a DST change still renders at the correct local time after it.
- The backfill copies `timezone` into `planned_timezone` verbatim for the 6 scheduled rows; it does not normalise, guess, or default the zone.
- `planned_duration_minutes` is computed from the difference between two instants, so it is unaffected by any DST boundary the meeting spans.
- All rendering continues to go through `Intl.DateTimeFormat` with an explicit `timeZone`, which the Phase 1 audit found sound and this change does not alter.

## 8. What is applied, and when
The migration is applied to production once this report is on record. The application code that writes `planned_*`, `logged_at` and `log_operation_key` follows in the same PR and is reviewed before merge, so the columns sit unused and harmless in the interim.
