/* Rollback for 20260625175625_dos_ministry_event_model.sql (USA-278).
 *
 * Written when the migration was applied to production on 2026-09-20, three
 * months after it landed in the repo: production had never received it, so
 * Ministry Team and Supporting Attendee selections were silently discarded on
 * save and read back as an empty array. See USA-278 for the drift audit.
 *
 * Every object below is created by that migration and by nothing else, so
 * dropping them restores the exact prior schema rather than approximating it.
 * The app degrades gracefully without them -- `isMissingMinistryEventModel` in
 * `src/lib/dos/missionary-app.ts` and `app/api/dos/app/meetings/route.ts`
 * catches the missing relation and returns empty -- which is precisely how
 * production behaved before the apply. A rollback is therefore a return to a
 * known-working state, not an outage.
 *
 * What a rollback DOES lose: ministry-team, supporting-attendee and recorder
 * relationships captured after the apply. Those live only in these tables. The
 * canonical meetings themselves are in `missionary_tables` and are untouched;
 * re-applying the migration rebuilds every participant row from
 * `field_person_ids`.
 *
 * Order matters: drop the children before `ministry_events`, and drop the
 * `missionary_tables` FK before the table it points at.
 */
drop table if exists public.ministry_event_person_responses cascade;
drop table if exists public.ministry_event_people cascade;

alter table public.missionary_tables
  drop constraint if exists missionary_tables_ministry_event_id_fkey;

drop index if exists public.missionary_tables_ministry_event_id_unique_idx;
drop index if exists public.missionary_tables_recorded_by_user_idx;

alter table public.missionary_tables
  drop column if exists ministry_event_id,
  drop column if exists recorded_by_user_id,
  drop column if exists recorded_by_display_name;

drop table if exists public.ministry_events cascade;

/* Safe to drop unconditionally: this migration is its only creator and its
   only three triggers went with the tables above. */
drop function if exists public.set_ministry_event_updated_at();

notify pgrst, 'reload schema';
